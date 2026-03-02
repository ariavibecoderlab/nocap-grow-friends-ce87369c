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

async function logRequest(supabase: any, appId: string, endpoint: string, method: string, statusCode: number, reqBody: any, resBody: any, userId?: string, startTime?: number) {
  try {
    await supabase.from('api_request_logs').insert({
      app_id: appId, endpoint, method, status_code: statusCode,
      request_body: reqBody || {}, response_body: resBody || {},
      user_id: userId || null, duration_ms: startTime ? Date.now() - startTime : null,
    });
  } catch (e) { console.error('Log insert failed:', e); }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const startTime = Date.now();
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const RAUDHAHPAY_API_KEY = Deno.env.get('RAUDHAHPAY_API_KEY');
    const RAUDHAHPAY_COLLECTION_CODE = Deno.env.get('RAUDHAHPAY_COLLECTION_CODE');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const rawBody = await req.text();
    let bodyData: Record<string, unknown> = {};
    try { if (rawBody) bodyData = JSON.parse(rawBody); } catch { /* not JSON */ }

    const apiKey = req.headers.get('x-api-key') || (bodyData.api_key as string);
    const apiSecret = req.headers.get('x-api-secret') || (bodyData.api_secret as string) || (bodyData.app_secret as string);
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

    const { data: app } = await supabase
      .from('api_applications')
      .select('id, merchant_user_id, is_active, is_sandbox, name, api_secret_hash, webhook_url')
      .eq('api_key', apiKey).single();

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

    const { data: allowed } = await supabase.rpc('check_rate_limit', {
      p_identifier: apiKey, p_endpoint: 'api-topup', p_max_requests: 30, p_window_seconds: 60,
    });
    if (!allowed) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Max 30 requests per minute.' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' },
      });
    }

    const tokenHash = await hashSecret(bearerToken);
    const { data: token } = await supabase
      .from('api_access_tokens')
      .select('id, user_id, scopes, is_active, expires_at')
      .eq('app_id', app.id).eq('access_token_hash', tokenHash).eq('is_active', true).single();

    if (!token) {
      return new Response(JSON.stringify({ error: 'Invalid or expired access token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (token.expires_at && new Date(token.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: 'Access token expired' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const scopes = token.scopes as string[];
    if (!scopes.includes('topup')) {
      return new Response(JSON.stringify({ error: 'Insufficient scope. Required: topup' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await supabase.from('api_access_tokens').update({ last_used_at: new Date().toISOString() }).eq('id', token.id);

    const { amount, description, reference } = bodyData as { amount: number; description?: string; reference?: string };
    const userId = token.user_id;

    if (!amount || typeof amount !== 'number' || amount < 10 || amount > 500) {
      return new Response(JSON.stringify({ error: 'Amount must be between RM10 and RM500' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (reference) {
      const { data: existing } = await supabase
        .from('transactions').select('id')
        .eq('user_id', userId).eq('type', 'top_up')
        .eq('description', `API Top-up: ${reference}`)
        .in('status', ['pending', 'completed']).maybeSingle();
      if (existing) {
        return new Response(JSON.stringify({ error: 'Duplicate reference. A top-up with this reference already exists.', transaction_id: existing.id }), {
          status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // === SANDBOX MODE ===
    if (app.is_sandbox) {
      const { data: sandboxTx, error: sandboxErr } = await supabase.from('transactions').insert({
        user_id: userId, type: 'top_up', amount, status: 'completed',
        description: description || `API Top-up RM${amount.toFixed(2)}${reference ? ` (${reference})` : ''}`,
        metadata: { api_app_id: app.id, api_app_name: app.name, sandbox: true, reference: reference || null },
      }).select('id').single();

      if (sandboxErr) {
        return new Response(JSON.stringify({ error: 'Failed to create transaction' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // ATOMIC: Credit wallet in sandbox
      await supabase.rpc('credit_wallet', {
        p_user_id: userId, p_wallet_type: 'member', p_amount: amount,
      });

      console.log(`[SANDBOX] API Top-up: RM${amount} for user ${userId}, app: ${app.name}`);

      const sandboxRes = {
        success: true, transaction_id: sandboxTx.id, amount, is_sandbox: true,
        payment_url: `https://sandbox.example.com/pay/${sandboxTx.id}`,
        message: 'Sandbox top-up completed immediately (no real payment)',
      };
      await logRequest(supabase, app.id, '/api-topup', 'POST', 200, { amount, description, reference, is_sandbox: true }, sandboxRes, userId, startTime);
      return new Response(JSON.stringify(sandboxRes), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // === PRODUCTION MODE ===
    if (!RAUDHAHPAY_API_KEY || !RAUDHAHPAY_COLLECTION_CODE) {
      return new Response(JSON.stringify({ error: 'Payment gateway not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: profile } = await supabase.from('profiles').select('full_name, phone, address').eq('user_id', userId).single();

    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: { user } } = await anonClient.auth.getUser(bearerToken);

    let mobile = profile?.phone || '60123456789';
    if (mobile.startsWith('0')) mobile = '60' + mobile.substring(1);
    else if (!mobile.startsWith('6')) mobile = '60' + mobile;

    const txDescription = description || `API Top-up RM${amount.toFixed(2)}${reference ? ` (${reference})` : ''}`;
    const { data: transaction, error: txError } = await supabase.from('transactions').insert({
      user_id: userId, type: 'top_up', amount, status: 'pending', description: txDescription,
      metadata: { api_app_id: app.id, api_app_name: app.name, reference: reference || null },
    }).select('id').single();

    if (txError) {
      console.error('Transaction insert error:', txError);
      return new Response(JSON.stringify({ error: 'Failed to create transaction' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 1);
    const dueDateStr = dueDate.toISOString().split('T')[0];

    const billPayload = {
      due: dueDateStr, currency: 'MYR', ref1: transaction.id, ref2: userId,
      customer: {
        first_name: profile?.full_name?.split(' ')[0] || 'Member',
        last_name: profile?.full_name?.split(' ').slice(1).join(' ') || 'User',
        email: user?.email || 'noemail@nocap.app', mobile,
        address: profile?.address || 'Malaysia',
      },
      product: [{ title: 'NOcap Wallet Top Up (API)', price: amount.toFixed(2), quantity: '1' }],
    };

    console.log('Creating RaudhahPay bill for API top-up:', JSON.stringify(billPayload));

    const rpResponse = await fetch(
      `https://api.raudhahpay.com/api/collections/${RAUDHAHPAY_COLLECTION_CODE}/bills`,
      {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RAUDHAHPAY_API_KEY}`, 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(billPayload),
        signal: AbortSignal.timeout(30000),
      }
    );

    const contentType = rpResponse.headers.get('content-type');
    let rpData: any;

    if (!contentType?.includes('application/json')) {
      const textResponse = await rpResponse.text();
      console.error('RaudhahPay returned non-JSON:', textResponse.substring(0, 500));
      await supabase.from('transactions').update({ status: 'failed' }).eq('id', transaction.id);
      return new Response(JSON.stringify({ error: 'Payment gateway returned invalid response' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    try { rpData = await rpResponse.json(); } catch {
      await supabase.from('transactions').update({ status: 'failed' }).eq('id', transaction.id);
      return new Response(JSON.stringify({ error: 'Payment gateway returned malformed response' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!rpResponse.ok) {
      console.error('RaudhahPay API error:', rpData);
      await supabase.from('transactions').update({ status: 'failed' }).eq('id', transaction.id);
      return new Response(JSON.stringify({ error: 'Payment gateway error', details: rpData }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const billCode = rpData?.bill_no || rpData?.data?.code || rpData?.code || '';
    await supabase.from('transactions')
      .update({ metadata: { api_app_id: app.id, api_app_name: app.name, reference: reference || null, bill_code: billCode, raudhahpay_response: rpData } })
      .eq('id', transaction.id);

    const paymentUrl = rpData?.payment_url || rpData?.bill_url || rpData?.data?.payment_url || rpData?.data?.url ||
      `https://cloud.raudhahpay.com/payment/gateway/secure-pay?bill_no=${billCode}`;

    const successRes = { success: true, payment_url: paymentUrl, transaction_id: transaction.id, bill_code: billCode, amount };
    await logRequest(supabase, app.id, '/api-topup', 'POST', 200, { amount, description, reference }, successRes, userId, startTime);
    return new Response(JSON.stringify(successRes), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('API Top-up error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
