import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Verify RaudhahPay signature (HMAC SHA256)
 * Signature format: sorted ascending key:value pairs joined with |
 * e.g. "amount:10.00|bill_id:123|bill_no:ABC|..."
 * Hashed with the signature/secret key using HMAC SHA256
 */
async function verifySignature(
  payload: Record<string, string>,
  signature: string,
  secretKey: string
): Promise<boolean> {
  // Build the string to sign: sorted keys, format "key:value|key:value|..."
  const keysToSign = Object.keys(payload)
    .filter(k => k !== 'signature')
    .sort();

  const signString = keysToSign
    .map(k => `${k}:${payload[k]}`)
    .join('|');

  // HMAC SHA256
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secretKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(signString));
  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  const computedSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return computedSignature === signature;
}

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

    // Parse webhook payload - RaudhahPay sends form-urlencoded data
    let payload: Record<string, string> = {};
    const contentType = req.headers.get('content-type') || '';
    
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData();
      formData.forEach((value, key) => {
        payload[key] = String(value);
      });
    } else if (contentType.includes('application/json')) {
      const jsonData = await req.json();
      for (const [key, value] of Object.entries(jsonData)) {
        payload[key] = String(value);
      }
    } else {
      // Try to parse as form data by default (RaudhahPay sends form-urlencoded)
      try {
        const formData = await req.formData();
        formData.forEach((value, key) => {
          payload[key] = String(value);
        });
      } catch {
        const text = await req.text();
        console.error('Unable to parse webhook payload, content-type:', contentType, 'body:', text.substring(0, 500));
        return new Response(JSON.stringify({ error: 'Unable to parse payload' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    console.log('RaudhahPay webhook received:', JSON.stringify(payload));

    // Verify signature if secret key is configured
    if (RAUDHAHPAY_SECRET_KEY && payload.signature) {
      const isValid = await verifySignature(payload, payload.signature, RAUDHAHPAY_SECRET_KEY);
      if (!isValid) {
        console.error('Invalid signature! Possible tampered callback.');
        return new Response(JSON.stringify({ error: 'Invalid signature' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      console.log('Signature verified successfully');
    } else {
      console.warn('No signature verification: missing secret key or signature in payload');
    }

    // RaudhahPay callback fields per API docs:
    // amount, bill_id, bill_no, currency, paid (true/false), payment_method,
    // ref1, ref2, ref_id, status (1=Created,2=Pending,3=Failed,4=Success,5=Unknown,6=Not Found), signature
    const transactionId = payload.ref1;
    const userId = payload.ref2;
    const status = payload.status;
    const paid = payload.paid;
    const billNo = payload.bill_no;
    const refId = payload.ref_id;
    const paymentAmount = payload.amount;

    if (!transactionId) {
      console.error('No transaction ID (ref1) in webhook payload');
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

    // Status 4 = Success, paid = "true"
    const isSuccess = status === '4' || paid === 'true';

    if (isSuccess) {
      // Update transaction to completed
      await supabase
        .from('transactions')
        .update({ 
          status: 'completed',
          metadata: { 
            ...(transaction.metadata as Record<string, unknown>), 
            webhook_payload: payload,
            bill_no: billNo,
            ref_id: refId,
            payment_method: payload.payment_method,
          },
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

      // Create notification for user
      await supabase.from('notifications').insert({
        user_id: transaction.user_id,
        title: 'Top-up Successful',
        message: `Your wallet has been credited with RM${Number(transaction.amount).toFixed(2)}.`,
        type: 'topup',
        link: '/transactions',
      });

      console.log(`Top-up successful: ${transactionId}, amount: ${transaction.amount}, user: ${transaction.user_id}`);
    } else {
      // Status 3 = Failed, or other non-success statuses
      await supabase
        .from('transactions')
        .update({ 
          status: 'failed',
          metadata: { 
            ...(transaction.metadata as Record<string, unknown>), 
            webhook_payload: payload,
            bill_no: billNo,
            ref_id: refId,
          },
        })
        .eq('id', transactionId);

      console.log(`Top-up failed: ${transactionId}, status: ${status}, paid: ${paid}`);
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
