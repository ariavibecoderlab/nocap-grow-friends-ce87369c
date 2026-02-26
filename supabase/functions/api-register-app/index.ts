import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function hashSecret(secret: string): Promise<string> {
  const data = new TextEncoder().encode(secret);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    // Verify user is a merchant
    const { data: merchantRole } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', user.id)
      .eq('role', 'merchant')
      .single();

    if (!merchantRole) {
      return new Response(JSON.stringify({ error: 'Only merchants can register API apps' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { name, description, branch_id, webhook_url, is_sandbox } = await req.json();

    if (!name || typeof name !== 'string' || name.trim().length === 0 || name.trim().length > 100) {
      return new Response(JSON.stringify({ error: 'App name is required (max 100 chars)' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // branch_id is optional — omitting it creates a merchant-level app
    if (branch_id) {
      // Verify branch belongs to this merchant
      const { data: branch } = await supabase
        .from('merchant_branches')
        .select('id')
        .eq('id', branch_id)
        .eq('merchant_user_id', user.id)
        .single();

      if (!branch) {
        return new Response(JSON.stringify({ error: 'Branch not found or not yours' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Generate API secret (shown once)
    const secretBytes = new Uint8Array(32);
    crypto.getRandomValues(secretBytes);
    const apiSecret = Array.from(secretBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    const apiSecretHash = await hashSecret(apiSecret);

    // Insert app
    const insertData: Record<string, unknown> = {
      name: name.trim(),
      description: description?.trim() || null,
      api_secret_hash: apiSecretHash,
      merchant_user_id: user.id,
      webhook_url: webhook_url?.trim() || null,
      is_sandbox: !!is_sandbox,
    };
    if (branch_id) {
      insertData.branch_id = branch_id;
    }

    const { data: app, error: insertError } = await supabase
      .from('api_applications')
      .insert(insertData)
      .select('id, api_key, name')
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to create app' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Auto-generate a test access token for sandbox apps
    let testAccessToken: string | null = null;
    if (is_sandbox) {
      const tokenBytes = new Uint8Array(32);
      crypto.getRandomValues(tokenBytes);
      testAccessToken = Array.from(tokenBytes).map(b => b.toString(16).padStart(2, '0')).join('');
      const tokenHash = await hashSecret(testAccessToken);

      const { error: tokenError } = await supabase
        .from('api_access_tokens')
        .insert({
          app_id: app.id,
          user_id: user.id,
          access_token_hash: tokenHash,
          scopes: ['balance', 'charge'],
        });

      if (tokenError) {
        console.error('Test token insert error:', tokenError);
        // Non-fatal: app was created, just warn about token
      }
    }

    return new Response(JSON.stringify({
      success: true,
      app_id: app.id,
      app_name: app.name,
      api_key: app.api_key,
      api_secret: apiSecret, // shown only once
      ...(testAccessToken ? { test_access_token: testAccessToken } : {}),
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
