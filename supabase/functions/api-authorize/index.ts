import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key, x-api-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function hashToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const startTime = Date.now();
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Rate limit: 10 requests per minute per user (brute-force protection)
    const { data: allowed } = await supabase.rpc('check_rate_limit', {
      p_identifier: user.id, p_endpoint: 'api-authorize', p_max_requests: 10, p_window_seconds: 60,
    });
    if (!allowed) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Max 10 requests per minute.' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' },
      });
    }

    const { app_id, scopes } = await req.json();

    if (!app_id) {
      return new Response(JSON.stringify({ error: 'app_id is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify app exists and is active
    const { data: app } = await supabase
      .from('api_applications')
      .select('id, name, is_active')
      .eq('id', app_id)
      .eq('is_active', true)
      .single();

    if (!app) {
      return new Response(JSON.stringify({ error: 'App not found or inactive' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if already authorized
    const { data: existing } = await supabase
      .from('api_access_tokens')
      .select('id')
      .eq('app_id', app_id)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (existing) {
      // Revoke old token to allow scope upgrade
      await supabase
        .from('api_access_tokens')
        .update({ is_active: false })
        .eq('id', existing.id);
    }

    // Generate access token
    const tokenBytes = new Uint8Array(32);
    crypto.getRandomValues(tokenBytes);
    const accessToken = Array.from(tokenBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    const tokenHash = await hashToken(accessToken);

    const allowedScopes = ['balance', 'charge', 'referral'];
    const validScopes = (scopes || ['balance', 'charge']).filter((s: string) => allowedScopes.includes(s));

    const { error: insertError } = await supabase
      .from('api_access_tokens')
      .insert({
        app_id,
        user_id: user.id,
        access_token_hash: tokenHash,
        scopes: validScopes,
      });

    if (insertError) {
      console.error('Insert error:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to authorize' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const resBody = { success: true, access_token: '[redacted]', app_name: app.name, scopes: validScopes };
    try {
      await supabase.from('api_request_logs').insert({
        app_id: app_id, endpoint: '/api-authorize', method: 'POST', status_code: 200,
        request_body: { app_id, scopes: validScopes }, response_body: resBody, user_id: user.id,
        duration_ms: Date.now() - startTime,
      });
    } catch (_) { /* ignore */ }
    return new Response(JSON.stringify({
      success: true,
      access_token: accessToken,
      app_name: app.name,
      scopes: validScopes,
    }), {
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
