// v1.4 — Orders API (additive, non-breaking)
// GET    /api-orders                     → list orders
// GET    /api-orders?id=<uuid>           → order detail
// POST   /api-orders                     → create draft order (optional create_payment_link)
// PATCH  /api-orders?id=<uuid>           → update status / tracking_number
//
// Auth: server-to-server merchant via X-Api-Key + X-Api-Secret headers.
// v1.3 endpoints are NOT touched.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { dispatchWebhook } from "../_shared/webhook.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-api-key, x-api-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const ALLOWED_STATUS = new Set(['draft', 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'refunded']);

async function hashSecret(secret: string): Promise<string> {
  const data = new TextEncoder().encode(secret);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// deno-lint-ignore no-explicit-any
async function validateApiApp(supabase: any, apiKey: string, apiSecret: string) {
  const { data: app } = await supabase
    .from('api_applications')
    .select('id, merchant_user_id, branch_id, is_active, scopes, api_secret_hash, webhook_url, webhook_subscriptions')
    .eq('api_key', apiKey)
    .single();
  if (!app || !app.is_active) return null;
  if ((await hashSecret(apiSecret)) !== app.api_secret_hash) return null;
  return app;
}

// deno-lint-ignore no-explicit-any
function appHasScope(app: any, required: string): boolean {
  const scopes = Array.isArray(app?.scopes) ? app.scopes : [];
  return scopes.includes(required) || scopes.includes('orders') || scopes.includes('read') || scopes.includes('*');
}

// deno-lint-ignore no-explicit-any
async function logRequest(supabase: any, appId: string, endpoint: string, method: string, status: number, reqBody: unknown, resBody: unknown, durationMs: number) {
  try {
    await supabase.from('api_request_logs').insert({
      app_id: appId, endpoint, method, status_code: status,
      request_body: reqBody ?? {}, response_body: resBody ?? {}, duration_ms: durationMs,
    });
  } catch (_) { /* best-effort */ }
}

function generateOrderNumber(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rnd = Math.floor(Math.random() * 0xffff).toString(16).toUpperCase().padStart(4, '0');
  return `ORD-${ts}-${rnd}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const startTime = Date.now();
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const apiKey = req.headers.get('x-api-key');
    const apiSecret = req.headers.get('x-api-secret');
    if (!apiKey || !apiSecret) {
      return new Response(JSON.stringify({ error: 'Missing API credentials. Provide x-api-key and x-api-secret headers.' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: allowed } = await supabase.rpc('check_rate_limit', {
      p_identifier: apiKey, p_endpoint: 'api-orders', p_max_requests: 120, p_window_seconds: 60,
    });
    if (allowed === false) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Max 120 requests per minute.' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' },
      });
    }

    const app = await validateApiApp(supabase, apiKey, apiSecret);
    if (!app) {
      return new Response(JSON.stringify({ error: 'Invalid API credentials' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!appHasScope(app, 'orders')) {
      return new Response(JSON.stringify({ error: 'Insufficient scope. Required: orders or read.' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Resolve merchant store(s)
    const { data: stores } = await supabase
      .from('marketplace_stores')
      .select('id, branch_id, store_name')
      .eq('merchant_user_id', app.merchant_user_id);
    const storeIds = (stores ?? []).map((s: { id: string }) => s.id);
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    // ---------------- POST: create draft order ----------------
    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      const {
        store_id, items, buyer_name, buyer_phone, buyer_email,
        shipping_address, shipping_fee, notes, create_payment_link,
      } = body ?? {};

      if (!store_id || !storeIds.includes(store_id)) {
        return new Response(JSON.stringify({ error: 'store_id is required and must belong to this merchant' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (!Array.isArray(items) || items.length === 0) {
        return new Response(JSON.stringify({ error: 'items[] is required (each: { product_id, quantity })' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (!buyer_name || !buyer_phone || !buyer_email || !shipping_address) {
        return new Response(JSON.stringify({ error: 'buyer_name, buyer_phone, buyer_email and shipping_address are required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Resolve products + price
      const productIds = items.map((i: { product_id: string }) => i.product_id);
      const { data: products, error: prodErr } = await supabase
        .from('marketplace_products')
        .select('id, name, price, images, store_id')
        .in('id', productIds)
        .eq('store_id', store_id);
      if (prodErr) throw prodErr;
      if (!products || products.length !== productIds.length) {
        return new Response(JSON.stringify({ error: 'One or more product_id values are invalid for this store' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const productMap = new Map(products.map((p: { id: string }) => [p.id, p]));
      let subtotal = 0;
      const orderItems = items.map((i: { product_id: string; quantity: number }) => {
        // deno-lint-ignore no-explicit-any
        const p: any = productMap.get(i.product_id);
        const qty = Math.max(1, Math.floor(Number(i.quantity) || 1));
        const lineSubtotal = Number(p.price) * qty;
        subtotal += lineSubtotal;
        const firstImg = Array.isArray(p.images) && p.images.length > 0 ? String(p.images[0]) : '';
        return {
          product_id: p.id, product_name: p.name, product_image: firstImg,
          unit_price: Number(p.price), quantity: qty, subtotal: lineSubtotal,
        };
      });

      const shippingFeeNum = Number(shipping_fee ?? 0) || 0;
      const total = subtotal + shippingFeeNum;
      const orderNumber = generateOrderNumber();

      const { data: order, error: orderErr } = await supabase
        .from('marketplace_orders')
        .insert({
          store_id, order_number: orderNumber,
          buyer_name, buyer_phone, buyer_email,
          shipping_address, shipping_fee: shippingFeeNum,
          subtotal, total_amount: total,
          status: 'draft', payment_status: 'pending', payment_method: 'api',
          notes: notes ?? null,
        })
        .select('*')
        .single();
      if (orderErr) throw orderErr;

      const itemsToInsert = orderItems.map((it) => ({ ...it, order_id: order.id }));
      const { error: itemsErr } = await supabase.from('marketplace_order_items').insert(itemsToInsert);
      if (itemsErr) throw itemsErr;

      // Optional payment link
      let paymentLink: { id: string; url: string; expires_at: string } | null = null;
      if (create_payment_link) {
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        const { data: link, error: linkErr } = await supabase
          .from('payment_links')
          .insert({
            app_id: app.id, merchant_user_id: app.merchant_user_id,
            branch_id: app.branch_id ?? null, order_id: order.id,
            amount: total, currency: 'MYR', status: 'active',
            expires_at: expiresAt, description: `Order ${orderNumber}`,
            metadata: { source: 'api-orders.create' },
          })
          .select('id, expires_at')
          .single();
        if (!linkErr && link) {
          const origin = req.headers.get('origin') ?? 'https://nocap.life';
          paymentLink = { id: link.id, url: `${origin}/pay/${link.id}`, expires_at: link.expires_at };
        }
      }

      // Webhook: order.created
      // deno-lint-ignore no-explicit-any
      dispatchWebhook(app.webhook_url, app.api_secret_hash, (app as any).webhook_subscriptions, {
        event: 'order.created',
        merchant_id: app.merchant_user_id,
        branch_id: app.branch_id ?? null,
        data: { order_id: order.id, order_number: orderNumber, status: order.status, total_amount: total, payment_link: paymentLink },
      }, supabase, app.id);

      const resBody = { ...order, items: itemsToInsert, payment_link: paymentLink };
      await logRequest(supabase, app.id, '/api-orders', 'POST', 201, { store_id, item_count: items.length }, { order_id: order.id }, Date.now() - startTime);
      return new Response(JSON.stringify(resBody), {
        status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ---------------- PATCH: status/tracking update ----------------
    if (req.method === 'PATCH') {
      if (!id) {
        return new Response(JSON.stringify({ error: 'Order id query param required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const body = await req.json().catch(() => ({}));
      const { status: newStatus, tracking_number, note } = body ?? {};

      if (!newStatus && !tracking_number) {
        return new Response(JSON.stringify({ error: 'Provide status and/or tracking_number' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (newStatus && !ALLOWED_STATUS.has(newStatus)) {
        return new Response(JSON.stringify({ error: `Invalid status. Allowed: ${[...ALLOWED_STATUS].join(', ')}` }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: existing } = await supabase
        .from('marketplace_orders')
        .select('id, status, store_id, order_number, total_amount')
        .eq('id', id)
        .in('store_id', storeIds)
        .maybeSingle();
      if (!existing) {
        return new Response(JSON.stringify({ error: 'Order not found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const update: Record<string, unknown> = {};
      if (newStatus) update.status = newStatus;
      if (tracking_number) update.tracking_number = tracking_number;
      if (note) update.notes = note;

      const { data: updated, error: updErr } = await supabase
        .from('marketplace_orders')
        .update(update)
        .eq('id', id)
        .select('*')
        .single();
      if (updErr) throw updErr;

      // Fire webhook for status transition
      if (newStatus && newStatus !== existing.status) {
        const event = `order.${newStatus}`;
        // deno-lint-ignore no-explicit-any
        dispatchWebhook(app.webhook_url, app.api_secret_hash, (app as any).webhook_subscriptions, {
          event,
          merchant_id: app.merchant_user_id,
          branch_id: app.branch_id ?? null,
          data: {
            order_id: updated.id, order_number: updated.order_number,
            previous_status: existing.status, status: newStatus,
            tracking_number: updated.tracking_number, total_amount: updated.total_amount,
          },
        }, supabase, app.id);
      }

      await logRequest(supabase, app.id, '/api-orders', 'PATCH', 200, { id, ...update }, { id }, Date.now() - startTime);
      return new Response(JSON.stringify(updated), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ---------------- GET: list / detail ----------------
    if (req.method !== 'GET') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (storeIds.length === 0) {
      const body = { data: [], page: 1, limit: 0, total: 0 };
      await logRequest(supabase, app.id, '/api-orders', 'GET', 200, null, body, Date.now() - startTime);
      return new Response(JSON.stringify(body), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (id) {
      const { data: order, error } = await supabase
        .from('marketplace_orders').select('*').eq('id', id).in('store_id', storeIds).maybeSingle();
      if (error) throw error;
      if (!order) {
        await logRequest(supabase, app.id, '/api-orders', 'GET', 404, { id }, { error: 'not found' }, Date.now() - startTime);
        return new Response(JSON.stringify({ error: 'Order not found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const [{ data: items }, { data: history }] = await Promise.all([
        supabase.from('marketplace_order_items').select('*').eq('order_id', id),
        supabase.from('marketplace_order_status_history').select('*').eq('order_id', id).order('created_at', { ascending: true }),
      ]);
      const body = { ...order, items: items ?? [], status_history: history ?? [] };
      await logRequest(supabase, app.id, '/api-orders', 'GET', 200, { id }, { id }, Date.now() - startTime);
      return new Response(JSON.stringify(body), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const status = url.searchParams.get('status');
    const customerPhone = url.searchParams.get('customer_phone');
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') ?? '20', 10) || 20));
    const offset = (page - 1) * limit;

    let query = supabase
      .from('marketplace_orders')
      .select('id, order_number, store_id, buyer_name, buyer_email, buyer_phone, status, payment_status, subtotal, shipping_fee, total_amount, tracking_number, created_at, updated_at', { count: 'exact' })
      .in('store_id', storeIds)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (status) query = query.eq('status', status);
    if (customerPhone) query = query.eq('buyer_phone', customerPhone);
    if (from) query = query.gte('created_at', from);
    if (to) query = query.lte('created_at', to);

    const { data: orders, count, error: listErr } = await query;
    if (listErr) throw listErr;

    const body = { data: orders ?? [], page, limit, total: count ?? (orders?.length ?? 0) };
    await logRequest(supabase, app.id, '/api-orders', 'GET', 200, { status, customerPhone, from, to, page, limit }, { count: body.data.length }, Date.now() - startTime);
    return new Response(JSON.stringify(body), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('api-orders error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
