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

const hasBranchReadScope = (scopes: string[] = []) =>
  scopes.some((scope) => ['branches', 'branches:read', 'merchant', 'merchant:read', 'merchant.branches.read'].includes(scope));

const credentialSource = (req: Request, bodyData: Record<string, string>, url: URL) => ({
  api_key: req.headers.get('x-api-key') ? 'header' : bodyData.api_key ? 'body' : url.searchParams.get('api_key') ? 'query' : 'missing',
  api_secret: req.headers.get('x-api-secret') ? 'header' : (bodyData.api_secret || bodyData.app_secret) ? 'body' : (url.searchParams.get('api_secret') || url.searchParams.get('app_secret')) ? 'query' : 'missing',
  bearer_token: req.headers.get('Authorization')?.startsWith('Bearer ') ? 'authorization_header' : 'missing',
});

const logBranchRequest = async (
  supabase: any,
  appId: string,
  req: Request,
  startTime: number,
  requestBody: Record<string, unknown>,
  responseBody: Record<string, unknown>,
  statusCode: number,
) => {
  try {
    await supabase.from('api_request_logs').insert({
      app_id: appId,
      endpoint: '/api-branches',
      method: req.method,
      status_code: statusCode,
      request_body: requestBody,
      response_body: responseBody,
      duration_ms: Date.now() - startTime,
    });
  } catch (_) { /* ignore */ }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const startTime = Date.now();
    const url = new URL(req.url);
    let bodyData: Record<string, string> = {};
    try {
      const text = await req.clone().text();
      if (text) bodyData = JSON.parse(text);
    } catch { /* ignore empty or non-JSON body */ }

    const apiKey = req.headers.get('x-api-key') || bodyData.api_key || url.searchParams.get('api_key');
    const apiSecret = req.headers.get('x-api-secret') || bodyData.api_secret || bodyData.app_secret || url.searchParams.get('api_secret') || url.searchParams.get('app_secret');
    const bearerToken = req.headers.get('Authorization')?.replace('Bearer ', '');
    const parsedAuthMode = bearerToken ? 'api_key_secret_bearer' : 'api_key_secret';
    const credential_sources = credentialSource(req, bodyData, url);

    if (!apiKey || !apiSecret) {
      return new Response(JSON.stringify({ error: 'Missing API credentials. Provide x-api-key and x-api-secret headers, or api_key and api_secret in the request body/query string.' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate API app
    const { data: app } = await supabase
      .from('api_applications')
      .select('id, merchant_user_id, branch_id, is_active, api_secret_hash')
      .eq('api_key', apiKey)
      .single();

    if (!app || !app.is_active) {
      return new Response(JSON.stringify({ error: 'Invalid API credentials' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const secretHash = await hashSecret(apiSecret);
    if (secretHash !== app.api_secret_hash) {
      return new Response(JSON.stringify({ error: 'Invalid API credentials' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (bearerToken) {
      const tokenHash = await hashSecret(bearerToken);
      const { data: token } = await supabase
        .from('api_access_tokens')
        .select('id, scopes, is_active, expires_at')
        .eq('app_id', app.id)
        .eq('access_token_hash', tokenHash)
        .eq('is_active', true)
        .maybeSingle();

      if (!token || (token.expires_at && new Date(token.expires_at) < new Date())) {
        const responseBody = { error: 'Invalid or expired access token' };
        await logBranchRequest(supabase, app.id, req, startTime, {
          parsed_auth_mode: parsedAuthMode,
          credential_sources,
          requested_branch_scope: true,
        }, responseBody, 401);
        return new Response(JSON.stringify(responseBody), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!hasBranchReadScope(token.scopes as string[])) {
        const responseBody = { error: 'Insufficient scope. Request merchant.branches.read to list branches.', scopes: token.scopes };
        await logBranchRequest(supabase, app.id, req, startTime, {
          parsed_auth_mode: parsedAuthMode,
          credential_sources,
          requested_branch_scope: true,
        }, responseBody, 403);
        return new Response(JSON.stringify(responseBody), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      await supabase.from('api_access_tokens').update({ last_used_at: new Date().toISOString() }).eq('id', token.id);
    }

    // Rate limit
    const { data: allowed } = await supabase.rpc('check_rate_limit', {
      p_identifier: apiKey, p_endpoint: 'api-branches', p_max_requests: 60, p_window_seconds: 60,
    });
    if (!allowed) {
      const responseBody = { error: 'Rate limit exceeded. Max 60 requests per minute.' };
      await logBranchRequest(supabase, app.id, req, startTime, {
        parsed_auth_mode: parsedAuthMode,
        credential_sources,
      }, responseBody, 429);
      return new Response(JSON.stringify(responseBody), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' },
      });
    }

    // Fetch active branches for this merchant; branch-level apps return their configured branch.
    let branchQuery = supabase
      .from('merchant_branches')
      .select('id, branch_name, qr_code_id, is_active')
      .eq('merchant_user_id', app.merchant_user_id)
      .eq('is_active', true)
      .order('branch_name', { ascending: true });

    if (app.branch_id) branchQuery = branchQuery.eq('id', app.branch_id);

    const { data: branches, error: branchErr } = await branchQuery;

    if (branchErr) {
      console.error('Branch fetch error:', branchErr);
      const responseBody = { error: 'Failed to fetch branches', details: branchErr.message };
      await logBranchRequest(supabase, app.id, req, startTime, {
        parsed_auth_mode: parsedAuthMode,
        credential_sources,
        merchant_user_id: app.merchant_user_id,
        configured_branch_id: app.branch_id,
      }, responseBody, 500);
      return new Response(JSON.stringify(responseBody), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const branchList = branches || [];
    const branchIds = branchList.map((branch) => branch.id);
    const resBody = { branches: branchList, data: branchList, count: branchList.length };
    await logBranchRequest(supabase, app.id, req, startTime, {
      parsed_auth_mode: parsedAuthMode,
      credential_sources,
      merchant_user_id: app.merchant_user_id,
      configured_branch_id: app.branch_id,
      branch_filter_applied: Boolean(app.branch_id),
    }, {
      branch_count: branchList.length,
      branch_ids: branchIds,
      branches: branchList.map((branch) => ({ id: branch.id, branch_name: branch.branch_name, is_active: branch.is_active })),
    }, 200);

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
