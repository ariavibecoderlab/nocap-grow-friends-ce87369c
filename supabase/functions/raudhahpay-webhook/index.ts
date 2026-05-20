import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function verifySignature(
  payload: Record<string, string>,
  signature: string,
  secretKey: string
): Promise<boolean> {
  const keysToSign = Object.keys(payload).filter(k => k !== 'signature').sort();
  const signString = keysToSign.map(k => `${k}:${payload[k]}`).join('|');
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secretKey), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(signString));
  const computedSignature = Array.from(new Uint8Array(signatureBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
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

    // Parse webhook payload
    let payload: Record<string, string> = {};
    const contentType = req.headers.get('content-type') || '';
    
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData();
      formData.forEach((value, key) => { payload[key] = String(value); });
    } else if (contentType.includes('application/json')) {
      const jsonData = await req.json();
      for (const [key, value] of Object.entries(jsonData)) { payload[key] = String(value); }
    } else {
      try {
        const formData = await req.formData();
        formData.forEach((value, key) => { payload[key] = String(value); });
      } catch {
        const text = await req.text();
        console.error('Unable to parse webhook payload, content-type:', contentType, 'body:', text.substring(0, 500));
        return new Response(JSON.stringify({ error: 'Unable to parse payload' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    console.log('RaudhahPay webhook received:', JSON.stringify(payload));

    // HMAC signature verification — fail closed if secret missing or signature invalid.
    if (!RAUDHAHPAY_SECRET_KEY) {
      console.error('[webhook-verify] raudhahpay RAUDHAHPAY_SECRET_KEY not configured — rejecting payload');
      return new Response(JSON.stringify({ error: 'Webhook secret not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!payload.signature) {
      console.warn('[webhook-verify] raudhahpay missing signature on payload — rejecting');
      return new Response(JSON.stringify({ error: 'Missing signature' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const isValid = await verifySignature(payload, payload.signature, RAUDHAHPAY_SECRET_KEY);
    console.log(`[webhook-verify] raudhahpay signature_status=${isValid ? 'verified' : 'invalid'} ref1=${payload.ref1 ?? 'none'}`);
    if (!isValid) {
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const transactionId = payload.ref1;
    const userId = payload.ref2;
    const status = payload.status;
    const paid = payload.paid;
    const billNo = payload.bill_no;
    const refId = payload.ref_id;

    if (!transactionId) {
      console.error('No transaction ID (ref1) in webhook payload');
      return new Response(JSON.stringify({ error: 'Missing transaction reference' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: transaction, error: txFetchError } = await supabase
      .from('transactions').select('*').eq('id', transactionId).single();

    if (txFetchError || !transaction) {
      console.error('Transaction not found:', transactionId, txFetchError);
      return new Response(JSON.stringify({ error: 'Transaction not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (transaction.status === 'completed') {
      console.log('Transaction already completed:', transactionId);
      return new Response(JSON.stringify({ message: 'Already processed' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const isSuccess = status === '4' || paid === 'true';

    if (isSuccess) {
      const webhookIkey = `rpwh:${transactionId}`;
      await supabase.from('transactions').update({ 
        status: 'completed',
        idempotency_key: webhookIkey,
        metadata: { 
          ...(transaction.metadata as Record<string, unknown>), 
          webhook_payload: payload, bill_no: billNo, ref_id: refId,
          payment_method: payload.payment_method,
        },
      }).eq('id', transactionId);

      // ATOMIC: Credit member wallet
      await supabase.rpc('credit_wallet', {
        p_user_id: transaction.user_id,
        p_wallet_type: 'member',
        p_amount: Number(transaction.amount),
      });

      await supabase.from('notifications').insert({
        user_id: transaction.user_id,
        title: 'Top-up Successful',
        message: `Your wallet has been credited with RM${Number(transaction.amount).toFixed(2)}.`,
        type: 'topup', link: '/transactions',
      });

      console.log(`Top-up successful: ${transactionId}, amount: ${transaction.amount}, user: ${transaction.user_id}`);

      // Send webhook to 3rd party app if API-initiated
      const metadata = transaction.metadata as Record<string, unknown> | null;
      if (metadata?.api_app_id) {
        try {
          const { data: apiApp } = await supabase
            .from('api_applications').select('id, webhook_url, api_secret_hash')
            .eq('id', metadata.api_app_id).single();

          if (apiApp?.webhook_url) {
            const webhookPayload = {
              event: 'topup.completed', transaction_id: transactionId,
              amount: Number(transaction.amount), reference: metadata.reference || null,
              status: 'completed', timestamp: new Date().toISOString(),
            };
            const payloadStr = JSON.stringify(webhookPayload);
            const encoder = new TextEncoder();
            const hmacKey = await crypto.subtle.importKey('raw', encoder.encode(apiApp.api_secret_hash), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
            const sigBuf = await crypto.subtle.sign('HMAC', hmacKey, encoder.encode(payloadStr));
            const signature = Array.from(new Uint8Array(sigBuf)).map(b => b.toString(16).padStart(2, '0')).join('');

            const maxRetries = 3;
            let delivered = false;
            let lastStatus = 0;
            for (let attempt = 0; attempt < maxRetries; attempt++) {
              try {
                const res = await fetch(apiApp.webhook_url, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'X-Webhook-Signature': signature, 'X-Webhook-Attempt': String(attempt + 1) },
                  body: payloadStr,
                });
                await res.text();
                lastStatus = res.status;
                if (res.ok) { delivered = true; break; }
              } catch (err) {
                console.warn(`Topup webhook attempt ${attempt + 1} failed:`, err);
                lastStatus = 0;
              }
              if (attempt < maxRetries - 1) {
                await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
              }
            }

            await supabase.from('api_request_logs').insert({
              app_id: apiApp.id, endpoint: 'webhook:topup.completed', method: 'WEBHOOK',
              status_code: delivered ? (lastStatus || 200) : (lastStatus || 0),
              request_body: { url: apiApp.webhook_url, event: 'topup.completed', transaction_id: transactionId },
              response_body: { delivered, final_status: lastStatus },
              user_id: transaction.user_id, duration_ms: 0,
            });
            console.log(`Topup webhook ${delivered ? 'delivered' : 'failed'} to ${apiApp.webhook_url}`);
          }
        } catch (webhookErr) {
          console.error('Error sending topup webhook to 3rd party:', webhookErr);
        }
      }
    } else {
      await supabase.from('transactions').update({ 
        status: 'failed',
        metadata: { ...(transaction.metadata as Record<string, unknown>), webhook_payload: payload, bill_no: billNo, ref_id: refId },
      }).eq('id', transactionId);

      console.log(`Top-up failed: ${transactionId}, status: ${status}, paid: ${paid}`);

      const failMetadata = transaction.metadata as Record<string, unknown> | null;
      if (failMetadata?.api_app_id) {
        try {
          const { data: apiApp } = await supabase
            .from('api_applications').select('id, webhook_url, api_secret_hash')
            .eq('id', failMetadata.api_app_id).single();
          if (apiApp?.webhook_url) {
            const failPayload = {
              event: 'topup.failed', transaction_id: transactionId,
              amount: Number(transaction.amount), reference: failMetadata.reference || null,
              status: 'failed', timestamp: new Date().toISOString(),
            };
            const payloadStr = JSON.stringify(failPayload);
            const encoder = new TextEncoder();
            const hmacKey = await crypto.subtle.importKey('raw', encoder.encode(apiApp.api_secret_hash), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
            const sigBuf = await crypto.subtle.sign('HMAC', hmacKey, encoder.encode(payloadStr));
            const signature = Array.from(new Uint8Array(sigBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
            fetch(apiApp.webhook_url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'X-Webhook-Signature': signature },
              body: payloadStr,
            }).catch(e => console.error('Failed topup webhook error:', e));
            await supabase.from('api_request_logs').insert({
              app_id: apiApp.id, endpoint: 'webhook:topup.failed', method: 'WEBHOOK',
              status_code: 0, request_body: { url: apiApp.webhook_url, event: 'topup.failed', transaction_id: transactionId },
              response_body: {}, user_id: transaction.user_id,
            });
          }
        } catch (webhookErr) {
          console.error('Error sending topup.failed webhook:', webhookErr);
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Webhook error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
