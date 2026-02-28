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
    .select('id, merchant_user_id, branch_id, is_active, name, api_secret_hash, webhook_url')
    .eq('api_key', apiKey)
    .single();
  if (!app || !app.is_active) return null;
  const secretHash = await hashSecret(apiSecret);
  if (secretHash !== app.api_secret_hash) return null;
  return app;
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

    const body = await req.json();
    const apiKey = req.headers.get('x-api-key') || body.api_key;
    const apiSecret = req.headers.get('x-api-secret') || body.api_secret || body.app_secret;

    if (!apiKey || !apiSecret) {
      return new Response(JSON.stringify({ error: 'Missing API credentials.' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const app = await validateApiApp(supabase, apiKey, apiSecret);
    if (!app) {
      return new Response(JSON.stringify({ error: 'Invalid API credentials' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: allowed } = await supabase.rpc('check_rate_limit', {
      p_identifier: apiKey, p_endpoint: 'api-referral-register', p_max_requests: 20, p_window_seconds: 60,
    });
    if (!allowed) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Max 20 requests per minute.' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' },
      });
    }

    const { email, referral_code, full_name } = body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return new Response(JSON.stringify({ error: 'Valid email is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate referral code if provided
    if (referral_code) {
      const { data: referrer } = await supabase
        .from('profiles')
        .select('id')
        .eq('referral_code', referral_code)
        .single();

      if (!referrer) {
        return new Response(JSON.stringify({ error: 'Invalid referral code' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Create user via admin API (auto-confirm)
    const randomPassword = crypto.randomUUID() + crypto.randomUUID();
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password: randomPassword,
      email_confirm: true,
      user_metadata: {
        full_name: full_name || '',
        referral_code: referral_code || '',
      },
    });

    if (authError) {
      // Check if user already exists
      if (authError.message?.includes('already') || authError.message?.includes('duplicate')) {
        // Look up the existing user's profile for helpful details
        const { data: existingUsers } = await supabase.auth.admin.listUsers({ filter: email.trim().toLowerCase() });
        const existingUser = existingUsers?.users?.find(u => u.email === email.trim().toLowerCase());
        
        let existingProfile = null;
        let hasAccessToken = false;
        if (existingUser) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('referral_code, referred_by, has_pin')
            .eq('user_id', existingUser.id)
            .single();
          existingProfile = profile;

          // Check if user already has an active token for this app
          const { data: tokenData } = await supabase
            .from('api_access_tokens')
            .select('id')
            .eq('app_id', app.id)
            .eq('user_id', existingUser.id)
            .eq('is_active', true)
            .limit(1);
          hasAccessToken = (tokenData && tokenData.length > 0);
        }

        const resBody = {
          error: 'User with this email already exists.',
          code: 'USER_EXISTS',
          user_id: existingUser?.id || null,
          has_referral: !!existingProfile?.referred_by,
          referral_code: existingProfile?.referral_code || null,
          has_wallet_pin: existingProfile?.has_pin || false,
          already_connected: hasAccessToken,
          action: hasAccessToken
            ? 'User is already connected to your app. No further action needed.'
            : 'Use the OAuth authorization flow to connect this existing user\'s wallet to your app.',
        };

        try {
          await supabase.from('api_request_logs').insert({
            app_id: app.id, endpoint: '/api-referral-register', method: 'POST', status_code: 409,
            request_body: { email: '[redacted]', referral_code: referral_code || null },
            response_body: { ...resBody, user_id: '[redacted]' }, duration_ms: Date.now() - startTime,
          });
        } catch (_) { /* ignore */ }

        return new Response(JSON.stringify(resBody), {
          status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      console.error('Auth create error:', authError);
      return new Response(JSON.stringify({ error: 'Failed to create user: ' + authError.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const newUserId = authData.user.id;

    // Wait briefly for the handle_new_user trigger to execute
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Get the new user's referral code
    const { data: newProfile } = await supabase
      .from('profiles')
      .select('referral_code')
      .eq('user_id', newUserId)
      .single();

    // Generate access token for the 3rd party app
    const tokenBytes = new Uint8Array(32);
    crypto.getRandomValues(tokenBytes);
    const accessToken = Array.from(tokenBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    const tokenHash = await hashSecret(accessToken);

    const tokenScopes = ['balance', 'charge', 'referral'];

    const { error: tokenError } = await supabase
      .from('api_access_tokens')
      .insert({
        app_id: app.id,
        user_id: newUserId,
        access_token_hash: tokenHash,
        scopes: tokenScopes,
      });

    if (tokenError) {
      console.error('Token insert error:', tokenError);
    }

    // Send webhook if configured
    if (app.webhook_url) {
      try {
        const webhookPayload = JSON.stringify({
          event: 'user.registered',
          user_id: newUserId,
          email: email.trim().toLowerCase(),
          referral_code: newProfile?.referral_code || '',
          referred_by: referral_code || null,
          timestamp: new Date().toISOString(),
        });

        const signingKey = await hashSecret(apiSecret);
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey('raw', encoder.encode(signingKey), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
        const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(webhookPayload));
        const signatureHex = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');

        fetch(app.webhook_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signatureHex,
            'X-Webhook-Attempt': '1',
          },
          body: webhookPayload,
        }).catch(() => { /* fire and forget */ });
      } catch (_) { /* ignore webhook errors */ }
    }

    const resBody = {
      success: true,
      user_id: newUserId,
      referral_code: newProfile?.referral_code || '',
      access_token: '[redacted]',
      scopes: tokenScopes,
      message: 'User registered and connected',
    };

    try {
      await supabase.from('api_request_logs').insert({
        app_id: app.id, endpoint: '/api-referral-register', method: 'POST', status_code: 200,
        request_body: { email: '[redacted]', referral_code: referral_code || null, full_name: full_name || null },
        response_body: resBody, user_id: newUserId, duration_ms: Date.now() - startTime,
      });
    } catch (_) { /* ignore */ }

    return new Response(JSON.stringify({
      ...resBody,
      access_token: accessToken,
    }), {
      status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
