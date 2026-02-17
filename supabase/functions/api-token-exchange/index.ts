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
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { code, app_id, app_secret } = await req.json();

    if (!code || !app_id || !app_secret) {
      return new Response(JSON.stringify({ error: 'code, app_id, and app_secret are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Rate limit: 10 requests per minute per app
    const { data: allowed } = await supabase.rpc('check_rate_limit', {
      p_identifier: app_id, p_endpoint: 'api-token-exchange', p_max_requests: 10, p_window_seconds: 60,
    });
    if (!allowed) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Max 10 requests per minute.' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' },
      });
    }

    // Verify app credentials
    const { data: app } = await supabase
      .from('api_applications')
      .select('id, name, is_active, api_secret_hash')
      .eq('id', app_id)
      .eq('is_active', true)
      .single();

    if (!app) {
      return new Response(JSON.stringify({ error: 'App not found or inactive' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify app secret
    const secretHash = await hashToken(app_secret);
    if (secretHash !== app.api_secret_hash) {
      return new Response(JSON.stringify({ error: 'Invalid app credentials' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Look up the authorization code
    const { data: authCode } = await supabase
      .from('api_authorization_codes')
      .select('*')
      .eq('code', code)
      .eq('app_id', app_id)
      .eq('is_used', false)
      .single();

    if (!authCode) {
      return new Response(JSON.stringify({ error: 'Invalid or expired authorization code' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check expiry
    if (new Date(authCode.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: 'Authorization code has expired' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Mark code as used
    await supabase
      .from('api_authorization_codes')
      .update({ is_used: true })
      .eq('id', authCode.id);

    // Check if user already has an active token for this app
    const { data: existing } = await supabase
      .from('api_access_tokens')
      .select('id')
      .eq('app_id', app_id)
      .eq('user_id', authCode.user_id)
      .eq('is_active', true)
      .maybeSingle();

    if (existing) {
      // Revoke old token
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

    const scopes = authCode.scopes || ['balance', 'charge'];

    const { error: insertError } = await supabase
      .from('api_access_tokens')
      .insert({
        app_id,
        user_id: authCode.user_id,
        access_token_hash: tokenHash,
        scopes,
      });

    if (insertError) {
      console.error('Insert error:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to create access token' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const resBody = { success: true, access_token: '[redacted]', scopes, token_type: 'Bearer' };
    try {
      await supabase.from('api_request_logs').insert({
        app_id, endpoint: '/api-token-exchange', method: 'POST', status_code: 200,
        request_body: { app_id, code: '[redacted]' }, response_body: resBody,
        user_id: authCode.user_id, duration_ms: Date.now() - startTime,
      });
    } catch (_) { /* ignore */ }

    return new Response(JSON.stringify({
      success: true,
      access_token: accessToken,
      token_type: 'Bearer',
      scopes,
      expires_in: 7776000, // 90 days in seconds
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
