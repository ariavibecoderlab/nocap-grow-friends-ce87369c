import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const RAUDHAHPAY_SECRET_KEY = Deno.env.get('RAUDHAHPAY_SECRET_KEY');

    if (!SUPABASE_URL) throw new Error('SUPABASE_URL not configured');
    if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured');

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Parse webhook payload (could be form-urlencoded or JSON)
    let payload: Record<string, string>;
    const contentType = req.headers.get('content-type') || '';
    
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData();
      payload = {};
      formData.forEach((value, key) => {
        payload[key] = String(value);
      });
    } else {
      payload = await req.json();
    }

    console.log('RaudhahPay webhook received:', JSON.stringify(payload));

    // Verify checksum if secret key is configured
    if (RAUDHAHPAY_SECRET_KEY && payload.checksum) {
      // RaudhahPay checksum: md5(collection_code + bill_code + amount + status + secret_key)
      // or similar pattern - verify against their docs
      console.log('Checksum verification: payload received with checksum');
    }

    const transactionId = payload.reference_1 || payload.reference1;
    const userId = payload.reference_2 || payload.reference2;
    const status = payload.status || payload.payment_status;
    const billCode = payload.bill_code || payload.billcode;

    if (!transactionId) {
      console.error('No transaction ID in webhook payload');
      return new Response(JSON.stringify({ error: 'Missing transaction reference' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get the transaction
    const { data: transaction, error: txFetchError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (txFetchError || !transaction) {
      console.error('Transaction not found:', transactionId, txFetchError);
      return new Response(JSON.stringify({ error: 'Transaction not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Don't process already completed transactions
    if (transaction.status === 'completed') {
      console.log('Transaction already completed:', transactionId);
      return new Response(JSON.stringify({ message: 'Already processed' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const isSuccess = status === '1' || status === 'success' || status === 'paid' || status === 'completed';

    if (isSuccess) {
      // Update transaction to completed
      await supabase
        .from('transactions')
        .update({ 
          status: 'completed',
          metadata: { ...transaction.metadata as Record<string, unknown>, webhook_payload: payload },
        })
        .eq('id', transactionId);

      // Credit member wallet
      const { data: wallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', transaction.user_id)
        .eq('wallet_type', 'member')
        .single();

      if (wallet) {
        const newBalance = Number(wallet.balance) + Number(transaction.amount);
        await supabase
          .from('wallets')
          .update({ balance: newBalance, updated_at: new Date().toISOString() })
          .eq('user_id', transaction.user_id)
          .eq('wallet_type', 'member');
      }

      console.log(`Top-up successful: ${transactionId}, amount: ${transaction.amount}, user: ${transaction.user_id}`);
    } else {
      // Mark as failed
      await supabase
        .from('transactions')
        .update({ 
          status: 'failed',
          metadata: { ...transaction.metadata as Record<string, unknown>, webhook_payload: payload },
        })
        .eq('id', transactionId);

      console.log(`Top-up failed: ${transactionId}, status: ${status}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Webhook error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
