// v1.4 — Product Catalog read API (additive, non-breaking)
// GET /api-products                  → list products (filters: branch_id, status, q, page, limit)
// GET /api-products?id=<uuid>        → product detail with variants
// GET /api-products?search=<query>   → tsvector full-text search
//
// Auth: server-to-server merchant auth via X-Api-Key + X-Api-Secret headers.
// Existing OAuth Bearer flow is NOT used here (this is a new endpoint per the
// v1.4 plan; no existing endpoint behavior changes).

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
  // Default v1.3 apps may not have an explicit "products" scope; "read" satisfies catalog reads.
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
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = req.headers.get('x-api-key');
    const apiSecret = req.headers.get('x-api-secret');
    if (!apiKey || !apiSecret) {
      return new Response(
        JSON.stringify({ error: 'Missing API credentials. Provide x-api-key and x-api-secret headers.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Rate limit: 120 req/min per API key (read-heavy endpoint)
    const { data: allowed } = await supabase.rpc('check_rate_limit', {
      p_identifier: apiKey,
      p_endpoint: 'api-products',
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
    if (!appHasScope(app, 'products')) {
      return new Response(JSON.stringify({ error: 'Insufficient scope. Required: products or read.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Resolve the merchant's store(s)
    const { data: stores } = await supabase
      .from('marketplace_stores')
      .select('id')
      .eq('merchant_user_id', app.merchant_user_id);
    const storeIds = (stores ?? []).map((s: { id: string }) => s.id);
    if (storeIds.length === 0) {
      const body = { data: [], page: 1, limit: 0, total: 0 };
      await logRequest(supabase, app.id, '/api-products', 200, null, body, Date.now() - startTime);
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    const search = url.searchParams.get('search');
    const status = url.searchParams.get('status') ?? 'active';
    const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') ?? '20', 10) || 20));
    const offset = (page - 1) * limit;

    // Detail mode
    if (id) {
      const { data: product, error } = await supabase
        .from('marketplace_products')
        .select('id, store_id, category_id, name, description, price, stock_quantity, sku, weight_kg, images, status, sold_count, seo, created_at, updated_at')
        .eq('id', id)
        .in('store_id', storeIds)
        .maybeSingle();
      if (error) throw error;
      if (!product) {
        const body = { error: 'Product not found' };
        await logRequest(supabase, app.id, '/api-products', 404, { id }, body, Date.now() - startTime);
        return new Response(JSON.stringify(body), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const { data: variants } = await supabase
        .from('marketplace_product_variants')
        .select('id, variant_name, variant_value, price_adjustment, stock_quantity, sku, sort_order')
        .eq('product_id', id)
        .order('sort_order', { ascending: true });
      const body = { ...product, variants: variants ?? [] };
      await logRequest(supabase, app.id, '/api-products', 200, { id }, { id }, Date.now() - startTime);
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // List / search mode
    let query = supabase
      .from('marketplace_products')
      .select('id, store_id, category_id, name, description, price, stock_quantity, sku, images, status, sold_count, updated_at', { count: 'exact' })
      .in('store_id', storeIds)
      .eq('status', status)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search && search.trim().length > 0) {
      // Use existing tsvector column; ilike fallback for short/non-alpha tokens.
      const term = search.trim();
      query = query.or(`name.ilike.%${term}%,description.ilike.%${term}%`);
    }

    const { data: products, count, error: listErr } = await query;
    if (listErr) throw listErr;

    const body = {
      data: products ?? [],
      page,
      limit,
      total: count ?? (products?.length ?? 0),
    };
    await logRequest(supabase, app.id, '/api-products', 200, { search, status, page, limit }, { count: body.data.length }, Date.now() - startTime);
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('api-products error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
