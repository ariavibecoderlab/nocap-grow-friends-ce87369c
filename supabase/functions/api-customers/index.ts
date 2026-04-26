// GET /api-customers?phone=+60...&limit=&page=
// GET /api-customers/{id}
// GET /api-customers/{id}/orders
// Server-to-server auth: X-Api-Key + X-Api-Secret. Merchant-scoped (own orders only).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

type SupabaseClientAny = ReturnType<typeof createClient<any, 'public', any>>;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key, x-api-secret',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
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
  branch_id: string | null;
  is_active: boolean;
  api_secret_hash: string;
}

async function authenticate(req: Request, supabase: SupabaseClientAny): Promise<
  { ok: true; app: AppRow } | { ok: false; status: number; error: string }
> {
  const apiKey = req.headers.get('x-api-key');
  const apiSecret = req.headers.get('x-api-secret');
  if (!apiKey || !apiSecret) return { ok: false, status: 401, error: 'Missing X-Api-Key or X-Api-Secret' };

  const { data: app } = await supabase
    .from('api_applications')
    .select('id, merchant_user_id, branch_id, is_active, api_secret_hash')
    .eq('api_key', apiKey)
    .maybeSingle();

  if (!app || !app.is_active) return { ok: false, status: 401, error: 'Invalid API credentials' };
  const provided = await sha256Hex(apiSecret);
  if (provided !== app.api_secret_hash) return { ok: false, status: 401, error: 'Invalid API credentials' };
  return { ok: true, app: app as AppRow };
}

// Stores owned by this merchant (so we can scope buyer history to merchant's own orders).
async function getMerchantStoreIds(
  supabase: SupabaseClientAny,
  merchantUserId: string,
): Promise<string[]> {
  const { data } = await supabase
    .from('marketplace_stores')
    .select('id')
    .eq('merchant_user_id', merchantUserId);
  return ((data ?? []) as Array<{ id: string }>).map((r) => r.id);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'GET') return json(405, { error: 'Method not allowed' });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );

  const auth = await authenticate(req, supabase);
  if (!auth.ok) return json(auth.status, { error: auth.error });
  const { app } = auth;

  const url = new URL(req.url);
  // Path looks like /api-customers, /api-customers/{id}, /api-customers/{id}/orders
  const parts = url.pathname.replace(/^\/+|\/+$/g, '').split('/');
  // parts[0] === 'api-customers'
  const customerId = parts[1] || null;
  const subPath = parts[2] || null;

  const storeIds = await getMerchantStoreIds(supabase, app.merchant_user_id);
  if (storeIds.length === 0) {
    // No stores yet — return empty results consistently.
    if (!customerId) return json(200, { data: [], page: 1, limit: 20, total: 0 });
    if (subPath === 'orders') return json(200, { data: [], page: 1, limit: 20, total: 0 });
    return json(404, { error: 'Customer not found' });
  }

  try {
    // ---- LIST: GET /api-customers ----
    if (!customerId) {
      const phone = url.searchParams.get('phone')?.trim() || null;
      const search = url.searchParams.get('q')?.trim() || null;
      const page = Math.max(parseInt(url.searchParams.get('page') || '1', 10), 1);
      const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '20', 10), 1), 100);
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      let q = supabase
        .from('marketplace_store_customers')
        .select(
          'id, store_id, buyer_user_id, buyer_name, buyer_email, buyer_phone, total_orders, total_spent, last_order_at, tags, created_at',
          { count: 'exact' },
        )
        .in('store_id', storeIds)
        .order('last_order_at', { ascending: false, nullsFirst: false });

      if (phone) q = q.eq('buyer_phone', phone);
      if (search) q = q.or(`buyer_name.ilike.%${search}%,buyer_email.ilike.%${search}%,buyer_phone.ilike.%${search}%`);

      const { data, count, error } = await q.range(from, to);
      if (error) return json(500, { error: error.message });

      return json(200, { data: data ?? [], page, limit, total: count ?? 0 });
    }

    // Validate id is uuid-ish before hitting DB
    if (!/^[0-9a-f-]{36}$/i.test(customerId)) return json(400, { error: 'Invalid customer id' });

    // ---- ORDERS: GET /api-customers/{id}/orders ----
    if (subPath === 'orders') {
      // Resolve customer row first to confirm it belongs to this merchant
      const { data: customer } = await supabase
        .from('marketplace_store_customers')
        .select('id, store_id, buyer_user_id, buyer_email, buyer_phone')
        .eq('id', customerId)
        .in('store_id', storeIds)
        .maybeSingle();

      if (!customer) return json(404, { error: 'Customer not found' });

      const page = Math.max(parseInt(url.searchParams.get('page') || '1', 10), 1);
      const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '20', 10), 1), 100);
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      // Match by buyer_user_id when known, else fall back to email — always within this merchant's stores.
      let q = supabase
        .from('marketplace_orders')
        .select(
          'id, order_number, status, payment_status, payment_method, subtotal, shipping_fee, total_amount, tracking_number, created_at, updated_at, store_id',
          { count: 'exact' },
        )
        .in('store_id', storeIds)
        .order('created_at', { ascending: false });

      if (customer.buyer_user_id) {
        q = q.eq('buyer_user_id', customer.buyer_user_id);
      } else if (customer.buyer_email) {
        q = q.eq('buyer_email', customer.buyer_email);
      } else {
        return json(200, { data: [], page, limit, total: 0 });
      }

      const { data, count, error } = await q.range(from, to);
      if (error) return json(500, { error: error.message });

      return json(200, { data: data ?? [], page, limit, total: count ?? 0 });
    }

    // ---- DETAIL: GET /api-customers/{id} ----
    const { data: customer, error: cErr } = await supabase
      .from('marketplace_store_customers')
      .select(
        'id, store_id, buyer_user_id, buyer_name, buyer_email, buyer_phone, total_orders, total_spent, last_order_at, tags, notes, created_at, updated_at',
      )
      .eq('id', customerId)
      .in('store_id', storeIds)
      .maybeSingle();

    if (cErr) return json(500, { error: cErr.message });
    if (!customer) return json(404, { error: 'Customer not found' });

    return json(200, { data: customer });
  } catch (e) {
    console.error('api-customers error:', e);
    return json(500, { error: e instanceof Error ? e.message : 'Internal error' });
  }
});
