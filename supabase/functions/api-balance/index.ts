import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key, x-api-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function hashSecret(secret: string): Promise<string> {
  const data = new TextEncoder().encode(secret);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function validateApiApp(supabase: any, apiKey: string, apiSecret: string) {
  const { data: app } = await supabase
    .from('api_applications')
    .select('id, merchant_user_id, branch_id, is_active, name, api_secret_hash')
    .eq('api_key', apiKey)
    .single();

  if (!app || !app.is_active) return null;

  const secretHash = await hashSecret(apiSecret);
  if (secretHash !== app.api_secret_hash) return null;

  return app;
}

async function validateAccessToken(supabase: any, appId: string, token: string) {
  const tokenHash = await hashSecret(token);
  const { data } = await supabase
    .from('api_access_tokens')
    .select('id, user_id, scopes, is_active, expires_at')
    .eq('app_id', appId)
    .eq('access_token_hash', tokenHash)
    .eq('is_active', true)
    .single();

  if (!data) return null;
  if (data.expires_at && new Date(data.expires_at) < new Date()) return null;

  // Update last_used_at
  await supabase.from('api_access_tokens').update({ last_used_at: new Date().toISOString() }).eq('id', data.id);

  return data;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const startTime = Date.now();
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Parse body (may be empty for GET, safe to try)
    let bodyData: Record<string, string> = {};
    try {
      const cloned = req.clone();
      const text = await cloned.text();
      if (text) bodyData = JSON.parse(text);
    } catch { /* no body or not JSON */ }

    // Accept credentials from headers OR request body (for 3rd party compatibility)
    const apiKey = req.headers.get('x-api-key') || bodyData.api_key;
    const apiSecret = req.headers.get('x-api-secret') || bodyData.api_secret || bodyData.app_secret;
    const authHeader = req.headers.get('Authorization');

    if (!apiKey || !apiSecret) {
      return new Response(JSON.stringify({ error: 'Missing API credentials. Provide x-api-key and x-api-secret headers, or api_key and api_secret in the request body.' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const bearerToken = authHeader?.replace('Bearer ', '');
    if (!bearerToken) {
      return new Response(JSON.stringify({ error: 'Missing access token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const app = await validateApiApp(supabase, apiKey, apiSecret);
    if (!app) {
      return new Response(JSON.stringify({ error: 'Invalid API credentials' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Rate limit: 60 requests per minute per API key
    const { data: allowed } = await supabase.rpc('check_rate_limit', {
      p_identifier: apiKey, p_endpoint: 'api-balance', p_max_requests: 60, p_window_seconds: 60,
    });
    if (!allowed) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Max 60 requests per minute.' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' },
      });
    }

    const token = await validateAccessToken(supabase, app.id, bearerToken);
    if (!token) {
      return new Response(JSON.stringify({ error: 'Invalid or expired access token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check scope
    const scopes = token.scopes as string[];
    if (!scopes.includes('balance')) {
      return new Response(JSON.stringify({ error: 'Insufficient scope' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get member wallet balance
    const { data: wallet } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', token.user_id)
      .eq('wallet_type', 'member')
      .single();

    const resBody = { balance: wallet ? Number(wallet.balance) : 0, currency: 'MYR' };
    // Log request
    try {
      await supabase.from('api_request_logs').insert({
        app_id: app.id, endpoint: '/api-balance', method: 'GET', status_code: 200,
        request_body: {}, response_body: resBody, user_id: token.user_id,
        duration_ms: Date.now() - startTime,
      });
    } catch (_) { /* ignore */ }
    return new Response(JSON.stringify(resBody), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
