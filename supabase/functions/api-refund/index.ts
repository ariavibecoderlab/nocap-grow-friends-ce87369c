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

async function sendWebhook(
  webhookUrl: string | null, secretHash: string, payload: Record<string, unknown>,
  supabase?: any, appId?: string
) {
  if (!webhookUrl) return;
  const startTime = Date.now();
  let lastStatus = 0;
  let delivered = false;
  let totalAttempts = 0;
  try {
    const payloadStr = JSON.stringify(payload);
    const encoder = new TextEncoder();
    const hmacKey = await crypto.subtle.importKey('raw', encoder.encode(secretHash), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sigBuf = await crypto.subtle.sign('HMAC', hmacKey, encoder.encode(payloadStr));
    const signature = Array.from(new Uint8Array(sigBuf)).map(b => b.toString(16).padStart(2, '0')).join('');

    const maxRetries = 3;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      totalAttempts = attempt + 1;
      try {
        const res = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Webhook-Signature': signature, 'X-Webhook-Attempt': String(attempt + 1) },
          body: payloadStr,
        });
        await res.text();
        lastStatus = res.status;
        if (res.ok) { delivered = true; break; }
      } catch (err) {
        lastStatus = 0;
      }
      if (attempt < maxRetries - 1) await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
    }
  } catch (e) { console.error('Webhook send error:', e); }

  if (supabase && appId) {
    try {
      await supabase.from('api_request_logs').insert({
        app_id: appId, endpoint: `webhook:${payload.event || 'unknown'}`, method: 'WEBHOOK',
        status_code: delivered ? (lastStatus || 200) : (lastStatus || 0),
        request_body: { url: webhookUrl, event: payload.event, charge_id: payload.charge_id },
        response_body: { delivered, attempts: totalAttempts, final_status: lastStatus },
        duration_ms: Date.now() - startTime,
      });
    } catch (e) { console.error('Webhook log insert failed:', e); }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const apiKey = req.headers.get('x-api-key');
    const apiSecret = req.headers.get('x-api-secret');

    if (!apiKey || !apiSecret) {
      return new Response(JSON.stringify({ error: 'Missing API credentials' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: app } = await supabase
      .from('api_applications')
      .select('id, merchant_user_id, branch_id, is_active, name, api_secret_hash, webhook_url')
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
      p_identifier: apiKey, p_endpoint: 'api-refund', p_max_requests: 20, p_window_seconds: 60,
    });
    if (!allowed) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Max 20 requests per minute.' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' },
      });
    }

    const { charge_id, amount: refundAmount, reason } = await req.json();

    if (!charge_id) {
      return new Response(JSON.stringify({ error: 'charge_id is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: charge } = await supabase
      .from('api_charges').select('*').eq('id', charge_id).eq('app_id', app.id).single();

    if (!charge) {
      return new Response(JSON.stringify({ error: 'Charge not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (charge.status !== 'completed') {
      return new Response(JSON.stringify({ error: 'Only completed charges can be refunded' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const metadata = (charge as any).metadata || {};
    const alreadyRefunded = Number(metadata.total_refunded || 0);
    const maxRefundable = Number(charge.amount) - alreadyRefunded;
    const actualRefund = refundAmount ? Math.min(Number(refundAmount), maxRefundable) : maxRefundable;

    if (actualRefund <= 0) {
      return new Response(JSON.stringify({ error: 'Charge already fully refunded' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const isSandbox = !!charge.is_sandbox;

    if (isSandbox) {
      const newTotalRefunded = alreadyRefunded + actualRefund;
      const newStatus = newTotalRefunded >= Number(charge.amount) ? 'refunded' : 'partial_refund';
      await supabase.from('api_charges').update({
        status: newStatus, metadata: { ...metadata, total_refunded: newTotalRefunded, sandbox: true },
      }).eq('id', charge_id);

      sendWebhook(app.webhook_url, app.api_secret_hash, {
        event: newStatus === 'refunded' ? 'charge.refunded' : 'charge.partial_refund',
        charge_id, refund_amount: actualRefund, total_refunded: newTotalRefunded,
        charge_amount: Number(charge.amount), status: newStatus, is_sandbox: true,
        timestamp: new Date().toISOString(),
      }, supabase, app.id);

      return new Response(JSON.stringify({
        success: true, refund_amount: actualRefund, total_refunded: newTotalRefunded,
        charge_amount: Number(charge.amount), status: newStatus, is_sandbox: true,
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // REAL MODE: Resolve branch
    const chargeMeta = (charge as any).metadata || {};
    const refundBranchId = chargeMeta.branch_id || (chargeMeta.custom?.branch_id) || app.branch_id;
    if (!refundBranchId) {
      return new Response(JSON.stringify({ error: 'Cannot determine branch for refund' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ATOMIC: Debit branch wallet
    const { error: debitErr } = await supabase.rpc('debit_wallet', {
      p_user_id: '', // We need the branch owner's user_id
      p_wallet_type: 'branch',
      p_amount: actualRefund,
      p_branch_id: refundBranchId,
    });

    // If debit_wallet fails because we don't know user_id, fall back to direct query
    // Actually we need to get the branch owner first
    const { data: branch } = await supabase
      .from('merchant_branches')
      .select('branch_name, merchant_user_id, owner_user_id, balance')
      .eq('id', refundBranchId).single();

    const branchUserId = branch?.owner_user_id || branch?.merchant_user_id || app.merchant_user_id;
    const branchName = branch?.branch_name || 'Merchant';

    // ATOMIC: Debit branch wallet
    const { error: branchDebitErr } = await supabase.rpc('debit_wallet', {
      p_user_id: branchUserId,
      p_wallet_type: 'branch',
      p_amount: actualRefund,
      p_branch_id: refundBranchId,
    });

    if (branchDebitErr) {
      const msg = branchDebitErr.message || '';
      if (msg.includes('Insufficient balance')) {
        return new Response(JSON.stringify({ error: 'Insufficient branch balance for refund' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw branchDebitErr;
    }

    // Update merchant_branches.balance
    if (branch) {
      await supabase.from('merchant_branches').update({
        balance: Number(branch.balance) - actualRefund,
      }).eq('id', refundBranchId);
    }

    // ATOMIC: Credit member wallet
    await supabase.rpc('credit_wallet', {
      p_user_id: charge.user_id,
      p_wallet_type: 'member',
      p_amount: actualRefund,
    });

    // Create refund transaction for member with idempotency
    const refundIkey = `apiref:${charge_id}:${actualRefund}`;
    const { data: refundTx, error: refundTxErr } = await supabase.from('transactions').insert({
      user_id: charge.user_id, type: 'refund', amount: actualRefund, status: 'completed',
      description: reason || `Refund from ${branchName} via ${app.name}`,
      reference_id: charge.transaction_id || null,
      metadata: { charge_id, branch_id: refundBranchId, api_app_id: app.id, api_app_name: app.name },
      idempotency_key: refundIkey,
    }).select('id').single();

    if (refundTxErr && (refundTxErr as any).code === '23505') {
      const { data: existing } = await supabase.from('transactions').select('id').eq('idempotency_key', refundIkey).single();
      return new Response(JSON.stringify({ error: 'Duplicate refund request', transaction_id: existing?.id }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create debit transaction for branch owner
    await supabase.from('transactions').insert({
      user_id: branchUserId, type: 'refund', amount: actualRefund, status: 'completed',
      description: `Refund to member via ${app.name}`, reference_id: refundTx?.id || null,
      metadata: { charge_id, branch_id: refundBranchId, api_app_id: app.id },
    });

    const newTotalRefunded = alreadyRefunded + actualRefund;
    const newStatus = newTotalRefunded >= Number(charge.amount) ? 'refunded' : 'partial_refund';

    await supabase.from('api_charges').update({
      status: newStatus, metadata: { total_refunded: newTotalRefunded },
    }).eq('id', charge_id);

    await supabase.from('notifications').insert({
      user_id: charge.user_id, title: 'Refund Received',
      message: `You received a refund of RM${actualRefund.toFixed(2)} from ${branchName}.`,
      type: 'payment',
    });

    console.log(`API Refund: RM${actualRefund} back to ${charge.user_id}, charge: ${charge_id}, app: ${app.name}`);

    sendWebhook(app.webhook_url, app.api_secret_hash, {
      event: newStatus === 'refunded' ? 'charge.refunded' : 'charge.partial_refund',
      charge_id, transaction_id: refundTx?.id, refund_amount: actualRefund,
      total_refunded: newTotalRefunded, charge_amount: Number(charge.amount),
      reason: reason || null, status: newStatus, timestamp: new Date().toISOString(),
    }, supabase, app.id);

    return new Response(JSON.stringify({
      success: true, refund_amount: actualRefund, total_refunded: newTotalRefunded,
      charge_amount: Number(charge.amount), status: newStatus, transaction_id: refundTx?.id,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: unknown) {
    console.error('Refund error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
