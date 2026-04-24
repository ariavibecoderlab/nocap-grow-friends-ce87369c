// v1.4 — Orders read API (additive, non-breaking)
// GET /api-orders                  → list orders (filters: status, branch_id, customer_phone, from, to, page, limit)
// GET /api-orders?id=<uuid>        → order detail incl. line items + status history
//
// Auth: server-to-server merchant via X-Api-Key + X-Api-Secret headers.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-api-key, x-api-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function hashSecret(secret: string): Promise<string> {
  const data = new TextEncoder().encode(secret);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// deno-lint-ignore no-explicit-any
async function validateApiApp(supabase: any, apiKey: string, apiSecret: string) {
  const { data: app } = await supabase
    .from('api_applications')
    .select('id, merchant_user_id, branch_id, is_active, scopes, api_secret_hash')
    .eq('api_key', apiKey)
    .single();
  if (!app || !app.is_active) return null;
  const secretHash = await hashSecret(apiSecret);
  if (secretHash !== app.api_secret_hash) return null;
  return app;
}

// deno-lint-ignore no-explicit-any
function appHasScope(app: any, required: string): boolean {
  const scopes = Array.isArray(app?.scopes) ? app.scopes : [];
  return scopes.includes(required) || scopes.includes('read') || scopes.includes('*');
}

// deno-lint-ignore no-explicit-any
async function logRequest(supabase: any, appId: string, endpoint: string, status: number, reqBody: unknown, resBody: unknown, durationMs: number) {
  try {
    await supabase.from('api_request_logs').insert({
      app_id: appId,
      endpoint,
      method: 'GET',
      status_code: status,
      request_body: reqBody ?? {},
      response_body: resBody ?? {},
      duration_ms: durationMs,
    });
  } catch (_) { /* best-effort */ }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const startTime = Date.now();
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    if (req.method !== 'GET') {
      return new Response(JSON.stringify({ error: 'Method not allowed (v1.4 read-only; write methods land in Phase 1.2)' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = req.headers.get('x-api-key');
    const apiSecret = req.headers.get('x-api-secret');
    if (!apiKey || !apiSecret) {
      return new Response(JSON.stringify({ error: 'Missing API credentials. Provide x-api-key and x-api-secret headers.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: allowed } = await supabase.rpc('check_rate_limit', {
      p_identifier: apiKey,
      p_endpoint: 'api-orders',
      p_max_requests: 120,
      p_window_seconds: 60,
    });
    if (allowed === false) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Max 120 requests per minute.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' },
      });
    }

    const app = await validateApiApp(supabase, apiKey, apiSecret);
    if (!app) {
      return new Response(JSON.stringify({ error: 'Invalid API credentials' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!appHasScope(app, 'orders')) {
      return new Response(JSON.stringify({ error: 'Insufficient scope. Required: orders or read.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: stores } = await supabase
      .from('marketplace_stores')
      .select('id')
      .eq('merchant_user_id', app.merchant_user_id);
    const storeIds = (stores ?? []).map((s: { id: string }) => s.id);
    if (storeIds.length === 0) {
      const body = { data: [], page: 1, limit: 0, total: 0 };
      await logRequest(supabase, app.id, '/api-orders', 200, null, body, Date.now() - startTime);
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (id) {
      const { data: order, error } = await supabase
        .from('marketplace_orders')
        .select('*')
        .eq('id', id)
        .in('store_id', storeIds)
        .maybeSingle();
      if (error) throw error;
      if (!order) {
        const body = { error: 'Order not found' };
        await logRequest(supabase, app.id, '/api-orders', 404, { id }, body, Date.now() - startTime);
        return new Response(JSON.stringify(body), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const [{ data: items }, { data: history }] = await Promise.all([
        supabase.from('marketplace_order_items').select('*').eq('order_id', id),
        supabase.from('marketplace_order_status_history').select('*').eq('order_id', id).order('created_at', { ascending: true }),
      ]);
      const body = { ...order, items: items ?? [], status_history: history ?? [] };
      await logRequest(supabase, app.id, '/api-orders', 200, { id }, { id }, Date.now() - startTime);
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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

    const body = {
      data: orders ?? [],
      page,
      limit,
      total: count ?? (orders?.length ?? 0),
    };
    await logRequest(supabase, app.id, '/api-orders', 200, { status, customerPhone, from, to, page, limit }, { count: body.data.length }, Date.now() - startTime);
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('api-orders error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
