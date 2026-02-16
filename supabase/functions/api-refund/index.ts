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

    // Validate API app
    const { data: app } = await supabase
      .from('api_applications')
      .select('id, merchant_user_id, branch_id, is_active, name, api_secret_hash')
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

    const { charge_id, amount: refundAmount, reason } = await req.json();

    if (!charge_id) {
      return new Response(JSON.stringify({ error: 'charge_id is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get the original charge
    const { data: charge } = await supabase
      .from('api_charges')
      .select('*')
      .eq('id', charge_id)
      .eq('app_id', app.id)
      .single();

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

    // Calculate already-refunded amount from metadata
    const metadata = (charge as any).metadata || {};
    const alreadyRefunded = Number(metadata.total_refunded || 0);
    const maxRefundable = Number(charge.amount) - alreadyRefunded;

    const actualRefund = refundAmount
      ? Math.min(Number(refundAmount), maxRefundable)
      : maxRefundable;

    if (actualRefund <= 0) {
      return new Response(JSON.stringify({ error: 'Charge already fully refunded' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check branch wallet has sufficient balance
    const { data: branchWallet } = await supabase
      .from('wallets')
      .select('balance')
      .eq('wallet_type', 'branch')
      .eq('branch_id', app.branch_id)
      .single();

    if (!branchWallet || Number(branchWallet.balance) < actualRefund) {
      return new Response(JSON.stringify({ error: 'Insufficient branch balance for refund' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Debit branch wallet
    await supabase.from('wallets').update({
      balance: Number(branchWallet.balance) - actualRefund,
      updated_at: new Date().toISOString(),
    }).eq('wallet_type', 'branch').eq('branch_id', app.branch_id);

    // Update merchant_branches.balance
    const { data: branchRow } = await supabase
      .from('merchant_branches')
      .select('balance')
      .eq('id', app.branch_id)
      .single();
    if (branchRow) {
      await supabase.from('merchant_branches').update({
        balance: Number(branchRow.balance) - actualRefund,
      }).eq('id', app.branch_id);
    }

    // Credit member wallet
    const { data: memberWallet } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', charge.user_id)
      .eq('wallet_type', 'member')
      .single();

    if (memberWallet) {
      await supabase.from('wallets').update({
        balance: Number(memberWallet.balance) + actualRefund,
        updated_at: new Date().toISOString(),
      }).eq('user_id', charge.user_id).eq('wallet_type', 'member');
    }

    // Get branch name
    const { data: branch } = await supabase
      .from('merchant_branches')
      .select('branch_name, merchant_user_id, owner_user_id')
      .eq('id', app.branch_id)
      .single();

    const branchName = branch?.branch_name || 'Merchant';

    // Create refund transaction for member
    const { data: refundTx } = await supabase
      .from('transactions')
      .insert({
        user_id: charge.user_id,
        type: 'refund',
        amount: actualRefund,
        status: 'completed',
        description: reason || `Refund from ${branchName} via ${app.name}`,
        reference_id: charge.transaction_id || null,
        metadata: { charge_id, branch_id: app.branch_id, api_app_id: app.id, api_app_name: app.name },
      })
      .select('id')
      .single();

    // Create debit transaction for branch owner
    const branchUserId = branch?.owner_user_id || branch?.merchant_user_id || app.merchant_user_id;
    await supabase.from('transactions').insert({
      user_id: branchUserId,
      type: 'refund',
      amount: actualRefund,
      status: 'completed',
      description: `Refund to member via ${app.name}`,
      reference_id: refundTx?.id || null,
      metadata: { charge_id, branch_id: app.branch_id, api_app_id: app.id },
    });

    // Update the charge status and refunded total
    const newTotalRefunded = alreadyRefunded + actualRefund;
    const newStatus = newTotalRefunded >= Number(charge.amount) ? 'refunded' : 'partial_refund';

    // We store refund info in description since api_charges doesn't have a metadata column
    await supabase.from('api_charges').update({
      status: newStatus,
      metadata: { total_refunded: newTotalRefunded },
    }).eq('id', charge_id);
    await supabase.from('notifications').insert({
      user_id: charge.user_id,
      title: 'Refund Received',
      message: `You received a refund of RM${actualRefund.toFixed(2)} from ${branchName}.`,
      type: 'payment',
    });

    console.log(`API Refund: RM${actualRefund} back to ${charge.user_id}, charge: ${charge_id}, app: ${app.name}`);

    // Send webhook notification (fire-and-forget)
    const { data: appWithWebhook } = await supabase
      .from('api_applications')
      .select('webhook_url')
      .eq('id', app.id)
      .single();

    if (appWithWebhook?.webhook_url) {
      const webhookPayload = {
        event: newStatus === 'refunded' ? 'charge.refunded' : 'charge.partial_refund',
        charge_id,
        transaction_id: refundTx?.id,
        refund_amount: actualRefund,
        total_refunded: newTotalRefunded,
        charge_amount: Number(charge.amount),
        reason: reason || null,
        status: newStatus,
        timestamp: new Date().toISOString(),
      };
      fetch(appWithWebhook.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload),
      }).catch(err => console.error('Webhook delivery failed:', err));
    }

    return new Response(JSON.stringify({
      success: true,
      refund_amount: actualRefund,
      total_refunded: newTotalRefunded,
      charge_amount: Number(charge.amount),
      status: newStatus,
      transaction_id: refundTx?.id,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Refund error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
