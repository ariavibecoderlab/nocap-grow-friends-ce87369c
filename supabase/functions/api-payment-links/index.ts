// v1.4 — Hosted Payment Links (additive, non-breaking)
// POST /api-payment-links            → create a payment link
// GET  /api-payment-links?id=<uuid>  → fetch link status
// GET  /api-payment-links            → list links (filters: status, page, limit)
//
// Auth: server-to-server merchant via X-Api-Key + X-Api-Secret headers.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-api-key, x-api-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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
    .eq('api_key', apiKey).single();
  if (!app || !app.is_active) return null;
  if ((await hashSecret(apiSecret)) !== app.api_secret_hash) return null;
  return app;
}

// deno-lint-ignore no-explicit-any
function appHasScope(app: any, required: string): boolean {
  const scopes = Array.isArray(app?.scopes) ? app.scopes : [];
  return scopes.includes(required) || scopes.includes('payments') || scopes.includes('orders') || scopes.includes('*');
}

// deno-lint-ignore no-explicit-any
async function logRequest(supabase: any, appId: string, method: string, status: number, reqBody: unknown, resBody: unknown, durationMs: number) {
  try {
    await supabase.from('api_request_logs').insert({
      app_id: appId, endpoint: '/api-payment-links', method, status_code: status,
      request_body: reqBody ?? {}, response_body: resBody ?? {}, duration_ms: durationMs,
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
    const apiKey = req.headers.get('x-api-key');
    const apiSecret = req.headers.get('x-api-secret');
    if (!apiKey || !apiSecret) {
      return new Response(JSON.stringify({ error: 'Missing API credentials. Provide x-api-key and x-api-secret headers.' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: allowed } = await supabase.rpc('check_rate_limit', {
      p_identifier: apiKey, p_endpoint: 'api-payment-links', p_max_requests: 60, p_window_seconds: 60,
    });
    if (allowed === false) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Max 60 requests per minute.' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' },
      });
    }

    const app = await validateApiApp(supabase, apiKey, apiSecret);
    if (!app) {
      return new Response(JSON.stringify({ error: 'Invalid API credentials' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!appHasScope(app, 'payments')) {
      return new Response(JSON.stringify({ error: 'Insufficient scope. Required: payments or orders.' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      const { amount, currency, description, order_id, expires_in_seconds, metadata } = body ?? {};

      const amt = Number(amount);
      if (!Number.isFinite(amt) || amt <= 0) {
        return new Response(JSON.stringify({ error: 'amount must be a positive number' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const ttl = Math.min(7 * 24 * 3600, Math.max(60, Number(expires_in_seconds) || 24 * 3600));
      const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();

      // If order_id provided, ensure it belongs to this merchant
      if (order_id) {
        const { data: stores } = await supabase
          .from('marketplace_stores').select('id').eq('merchant_user_id', app.merchant_user_id);
        const storeIds = (stores ?? []).map((s: { id: string }) => s.id);
        const { data: ord } = await supabase
          .from('marketplace_orders').select('id').eq('id', order_id).in('store_id', storeIds).maybeSingle();
        if (!ord) {
          return new Response(JSON.stringify({ error: 'order_id not found for this merchant' }), {
            status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      const { data: link, error } = await supabase
        .from('payment_links')
        .insert({
          app_id: app.id, merchant_user_id: app.merchant_user_id,
          branch_id: app.branch_id ?? null, order_id: order_id ?? null,
          amount: amt, currency: currency ?? 'MYR', status: 'active',
          expires_at: expiresAt, description: description ?? null,
          metadata: metadata ?? {},
        })
        .select('id, amount, currency, status, expires_at, description, order_id, created_at')
        .single();
      if (error) throw error;

      const origin = req.headers.get('origin') ?? 'https://nocap.life';
      const resBody = { ...link, url: `${origin}/pay/${link.id}`, link_id: link.id };
      await logRequest(supabase, app.id, 'POST', 201, { amount: amt, order_id }, { link_id: link.id }, Date.now() - startTime);
      return new Response(JSON.stringify(resBody), {
        status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method !== 'GET') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (id) {
      const { data: link } = await supabase
        .from('payment_links').select('*').eq('id', id).eq('app_id', app.id).maybeSingle();
      if (!link) {
        return new Response(JSON.stringify({ error: 'Payment link not found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const origin = req.headers.get('origin') ?? 'https://nocap.life';
      return new Response(JSON.stringify({ ...link, url: `${origin}/pay/${link.id}` }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const status = url.searchParams.get('status');
    const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') ?? '20', 10) || 20));
    const offset = (page - 1) * limit;

    let q = supabase
      .from('payment_links')
      .select('id, amount, currency, status, expires_at, order_id, paid_at, created_at', { count: 'exact' })
      .eq('app_id', app.id).order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (status) q = q.eq('status', status);

    const { data: links, count } = await q;
    return new Response(JSON.stringify({ data: links ?? [], page, limit, total: count ?? (links?.length ?? 0) }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('api-payment-links error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
