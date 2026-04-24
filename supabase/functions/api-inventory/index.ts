// POST /api-inventory/reserve   { product_id, variant_id?, quantity, ttl_seconds?, reference? }
// POST /api-inventory/release   { reservation_id }  OR  { reference }
// Server-to-server auth: X-Api-Key + X-Api-Secret. Soft holds — does NOT decrement stock.
// Effective available = stock_quantity - SUM(active reservations whose expires_at > now()).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key, x-api-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

interface AppRow {
  id: string;
  merchant_user_id: string;
  is_active: boolean;
  api_secret_hash: string;
}

async function authenticate(req: Request, supabase: ReturnType<typeof createClient>): Promise<
  { ok: true; app: AppRow } | { ok: false; status: number; error: string }
> {
  const apiKey = req.headers.get('x-api-key');
  const apiSecret = req.headers.get('x-api-secret');
  if (!apiKey || !apiSecret) return { ok: false, status: 401, error: 'Missing X-Api-Key or X-Api-Secret' };

  const { data: app } = await supabase
    .from('api_applications')
    .select('id, merchant_user_id, is_active, api_secret_hash')
    .eq('api_key', apiKey)
    .maybeSingle();

  if (!app || !app.is_active) return { ok: false, status: 401, error: 'Invalid API credentials' };
  if ((await sha256Hex(apiSecret)) !== app.api_secret_hash) {
    return { ok: false, status: 401, error: 'Invalid API credentials' };
  }
  return { ok: true, app: app as AppRow };
}

// Best-effort cleanup of expired holds before computing availability.
async function expireOldHolds(supabase: ReturnType<typeof createClient>, productId: string) {
  await supabase
    .from('inventory_reservations')
    .update({ status: 'expired', released_at: new Date().toISOString() })
    .eq('product_id', productId)
    .eq('status', 'active')
    .lt('expires_at', new Date().toISOString());
}

async function computeAvailable(
  supabase: ReturnType<typeof createClient>,
  productId: string,
  variantId: string | null,
): Promise<{ available: number; baseStock: number } | { error: string }> {
  if (variantId) {
    const { data: v } = await supabase
      .from('marketplace_product_variants')
      .select('id, product_id, stock_quantity')
      .eq('id', variantId)
      .eq('product_id', productId)
      .maybeSingle();
    if (!v) return { error: 'Variant not found' };

    const { data: holds } = await supabase
      .from('inventory_reservations')
      .select('quantity')
      .eq('variant_id', variantId)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString());
    const held = (holds ?? []).reduce((s, r: { quantity: number }) => s + r.quantity, 0);
    return { available: Math.max(0, v.stock_quantity - held), baseStock: v.stock_quantity };
  }

  const { data: p } = await supabase
    .from('marketplace_products')
    .select('id, stock_quantity')
    .eq('id', productId)
    .maybeSingle();
  if (!p) return { error: 'Product not found' };

  const { data: holds } = await supabase
    .from('inventory_reservations')
    .select('quantity')
    .eq('product_id', productId)
    .is('variant_id', null)
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString());
  const held = (holds ?? []).reduce((s, r: { quantity: number }) => s + r.quantity, 0);
  return { available: Math.max(0, p.stock_quantity - held), baseStock: p.stock_quantity };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );

  const auth = await authenticate(req, supabase);
  if (!auth.ok) return json(auth.status, { error: auth.error });
  const { app } = auth;

  const url = new URL(req.url);
  const parts = url.pathname.replace(/^\/+|\/+$/g, '').split('/');
  // parts[0] === 'api-inventory'
  const action = parts[1] || null;
  if (action !== 'reserve' && action !== 'release') {
    return json(404, { error: 'Unknown action. Use /reserve or /release' });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'Invalid JSON body' });
  }

  try {
    if (action === 'reserve') {
      const productId = typeof body.product_id === 'string' ? body.product_id : null;
      const variantId = typeof body.variant_id === 'string' && body.variant_id ? body.variant_id : null;
      const quantity = Number(body.quantity);
      const ttlSeconds = Math.min(Math.max(Number(body.ttl_seconds ?? 900), 30), 3600);
      const reference = typeof body.reference === 'string' ? body.reference.slice(0, 200) : null;

      if (!productId || !/^[0-9a-f-]{36}$/i.test(productId)) return json(400, { error: 'Invalid product_id' });
      if (!Number.isFinite(quantity) || quantity < 1 || !Number.isInteger(quantity)) {
        return json(400, { error: 'quantity must be a positive integer' });
      }

      // Verify product belongs to a store this merchant owns.
      const { data: product } = await supabase
        .from('marketplace_products')
        .select('id, store_id, marketplace_stores!inner(merchant_user_id)')
        .eq('id', productId)
        .maybeSingle();
      // deno-lint-ignore no-explicit-any
      const ownerId = (product as any)?.marketplace_stores?.merchant_user_id;
      if (!product || ownerId !== app.merchant_user_id) {
        return json(404, { error: 'Product not found' });
      }

      // Idempotency by (app_id, reference) — return existing active hold instead of creating a duplicate.
      if (reference) {
        const { data: existing } = await supabase
          .from('inventory_reservations')
          .select('*')
          .eq('app_id', app.id)
          .eq('reference', reference)
          .eq('status', 'active')
          .gt('expires_at', new Date().toISOString())
          .maybeSingle();
        if (existing) return json(200, { data: existing, idempotent: true });
      }

      await expireOldHolds(supabase, productId);

      const avail = await computeAvailable(supabase, productId, variantId);
      if ('error' in avail) return json(404, { error: avail.error });
      if (avail.available < quantity) {
        return json(409, {
          error: 'Insufficient stock',
          available: avail.available,
          requested: quantity,
        });
      }

      const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
      const { data: created, error: insertErr } = await supabase
        .from('inventory_reservations')
        .insert({
          app_id: app.id,
          product_id: productId,
          variant_id: variantId,
          quantity,
          reference,
          expires_at: expiresAt,
          status: 'active',
        })
        .select('*')
        .single();
      if (insertErr) return json(500, { error: insertErr.message });

      return json(201, {
        data: created,
        available_after: avail.available - quantity,
      });
    }

    // ---- release ----
    const reservationId = typeof body.reservation_id === 'string' ? body.reservation_id : null;
    const reference = typeof body.reference === 'string' ? body.reference : null;
    if (!reservationId && !reference) {
      return json(400, { error: 'Provide reservation_id or reference' });
    }

    let q = supabase
      .from('inventory_reservations')
      .select('id, app_id, status, expires_at, product_id, variant_id, quantity')
      .eq('app_id', app.id);
    q = reservationId ? q.eq('id', reservationId) : q.eq('reference', reference!).eq('status', 'active');

    const { data: rows } = await q.limit(1);
    const hold = rows?.[0];
    if (!hold) return json(404, { error: 'Reservation not found' });

    if (hold.status !== 'active') {
      // Idempotent — already released/consumed/expired.
      return json(200, { data: hold, released: false, reason: `already ${hold.status}` });
    }

    const { data: released, error: updErr } = await supabase
      .from('inventory_reservations')
      .update({ status: 'released', released_at: new Date().toISOString() })
      .eq('id', hold.id)
      .eq('status', 'active')
      .select('*')
      .single();
    if (updErr) return json(500, { error: updErr.message });

    return json(200, { data: released, released: true });
  } catch (e) {
    console.error('api-inventory error:', e);
    return json(500, { error: e instanceof Error ? e.message : 'Internal error' });
  }
});
