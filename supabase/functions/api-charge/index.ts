import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as encodeBase64 } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key, x-api-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function hashSecret(secret: string): Promise<string> {
  const data = new TextEncoder().encode(secret);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hashPin(pin: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(pin + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return encodeBase64(new Uint8Array(hashBuffer));
}

async function verifyPin(pin: string, storedHash: string): Promise<boolean> {
  if (!storedHash.includes(':')) return pin === storedHash;
  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) return false;
  const computed = await hashPin(pin, salt);
  return computed === hash;
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
    const authHeader = req.headers.get('Authorization');

    if (!apiKey || !apiSecret) {
      return new Response(JSON.stringify({ error: 'Missing API credentials' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const bearerToken = authHeader?.replace('Bearer ', '');
    if (!bearerToken) {
      return new Response(JSON.stringify({ error: 'Missing access token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate API app
    const { data: app } = await supabase
      .from('api_applications')
      .select('id, merchant_user_id, branch_id, is_active, is_sandbox, name, api_secret_hash, webhook_url')
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

    // Rate limit: 30 requests per minute per API key
    const { data: allowed } = await supabase.rpc('check_rate_limit', {
      p_identifier: apiKey, p_endpoint: 'api-charge', p_max_requests: 30, p_window_seconds: 60,
    });
    if (!allowed) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Max 30 requests per minute.' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' },
      });
    }

    // Validate access token
    const tokenHash = await hashSecret(bearerToken);
    const { data: token } = await supabase
      .from('api_access_tokens')
      .select('id, user_id, scopes, is_active, expires_at')
      .eq('app_id', app.id)
      .eq('access_token_hash', tokenHash)
      .eq('is_active', true)
      .single();

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
    if (!scopes.includes('charge')) {
      return new Response(JSON.stringify({ error: 'Insufficient scope' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update last_used_at
    await supabase.from('api_access_tokens').update({ last_used_at: new Date().toISOString() }).eq('id', token.id);

    const { amount, description, reference, pin } = await req.json();
    const payerId = token.user_id;
    const branch_id = app.branch_id;

    if (!amount || typeof amount !== 'number' || amount < 0.01 || amount > 50000) {
      return new Response(JSON.stringify({ error: 'Amount must be between 0.01 and 50000' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get branch info
    const { data: branch } = await supabase
      .from('merchant_branches')
      .select('id, merchant_user_id, branch_name, commission_percent, is_active, owner_user_id')
      .eq('id', branch_id)
      .single();

    if (!branch || !branch.is_active) {
      return new Response(JSON.stringify({ error: 'Branch not found or inactive' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (payerId === branch.merchant_user_id) {
      return new Response(JSON.stringify({ error: 'Cannot pay to your own branch' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create charge record
    const { data: charge, error: chargeError } = await supabase
      .from('api_charges')
      .insert({
        app_id: app.id,
        user_id: payerId,
        amount,
        description: description || null,
        reference: reference || null,
        status: 'pending',
        is_sandbox: app.is_sandbox,
      })
      .select('id')
      .single();

    if (chargeError) {
      return new Response(JSON.stringify({ error: 'Failed to create charge' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // === SANDBOX MODE ===
    if (app.is_sandbox) {
      // Skip all validations and balance checks
      await supabase.from('api_charges').update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        metadata: { sandbox: true }
      }).eq('id', charge.id);

      console.log(`[SANDBOX] API Charge: ${payerId} -> ${branch.branch_name}, RM${amount}, app: ${app.name}`);

      // Send webhook for sandbox
      if (app.webhook_url) {
        const webhookPayload = {
          event: 'charge.completed',
          charge_id: charge.id,
          amount,
          description: description || null,
          reference: reference || null,
          status: 'completed',
          is_sandbox: true,
          timestamp: new Date().toISOString(),
        };
        const payloadStr = JSON.stringify(webhookPayload);

        const encoder = new TextEncoder();
        const hmacKey = await crypto.subtle.importKey(
          'raw', encoder.encode(app.api_secret_hash),
          { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
        );
        const sigBuf = await crypto.subtle.sign('HMAC', hmacKey, encoder.encode(payloadStr));
        const signature = Array.from(new Uint8Array(sigBuf)).map(b => b.toString(16).padStart(2, '0')).join('');

        fetch(app.webhook_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signature,
          },
          body: payloadStr,
        }).catch(err => console.error('Webhook delivery failed:', err));
      }

      return new Response(JSON.stringify({
        success: true,
        charge_id: charge.id,
        amount,
        is_sandbox: true,
        message: 'Sandbox transaction completed (no real money movement)',
      }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // PIN verification
    const { data: pinSetting } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'min_pin_amount')
      .single();
    const minPinAmount = pinSetting ? Number(pinSetting.value) : 100;

    if (amount >= minPinAmount) {
      if (!pin) {
        // Update charge to failed
        await supabase.from('api_charges').update({ status: 'failed' }).eq('id', charge.id);
        return new Response(JSON.stringify({ error: `PIN required for amounts >= RM${minPinAmount}`, code: 'PIN_REQUIRED', charge_id: charge.id }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: pinProfile } = await supabase
        .from('profiles')
        .select('has_pin, pin_hash')
        .eq('user_id', payerId)
        .single();

      if (!pinProfile?.has_pin || !pinProfile.pin_hash) {
        await supabase.from('api_charges').update({ status: 'failed' }).eq('id', charge.id);
        return new Response(JSON.stringify({ error: 'PIN not set', code: 'PIN_NOT_SET', charge_id: charge.id }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const pinValid = await verifyPin(pin, pinProfile.pin_hash);
      if (!pinValid) {
        await supabase.from('api_charges').update({ status: 'failed' }).eq('id', charge.id);
        return new Response(JSON.stringify({ error: 'Invalid PIN', charge_id: charge.id }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Check balance
    const { data: payerWallet } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', payerId)
      .eq('wallet_type', 'member')
      .single();

    if (!payerWallet || Number(payerWallet.balance) < amount) {
      await supabase.from('api_charges').update({ status: 'failed' }).eq('id', charge.id);
      return new Response(JSON.stringify({ error: 'Insufficient balance', charge_id: charge.id }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // === PAYMENT LOGIC (same as process-payment) ===
    const { data: feeSetting } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'platform_fee_percent')
      .single();

    const platformFeePercent = feeSetting ? Number(feeSetting.value) : 2.0;
    const commissionPercent = Number(branch.commission_percent);

    const feeAmount = Math.round(amount * platformFeePercent) / 100;
    const commissionPool = Math.round(amount * commissionPercent) / 100;
    const netAmount = amount - feeAmount;
    const cashbackShare = Math.floor((commissionPool / 6) * 100) / 100;
    const tierShare = Math.floor((commissionPool / 6) * 100) / 100;

    // Debit payer
    const newPayerBalance = Number(payerWallet.balance) - amount;
    await supabase
      .from('wallets')
      .update({ balance: newPayerBalance, updated_at: new Date().toISOString() })
      .eq('user_id', payerId)
      .eq('wallet_type', 'member');

    // Credit branch wallet
    const branchCredit = netAmount - commissionPool;
    const { data: branchWallet } = await supabase
      .from('wallets')
      .select('balance')
      .eq('wallet_type', 'branch')
      .eq('branch_id', branch_id)
      .single();

    if (branchWallet) {
      await supabase.from('wallets').update({
        balance: Number(branchWallet.balance) + branchCredit,
        updated_at: new Date().toISOString(),
      }).eq('wallet_type', 'branch').eq('branch_id', branch_id);
    }

    // Update merchant_branches.balance
    const { data: branchRow } = await supabase
      .from('merchant_branches')
      .select('balance')
      .eq('id', branch_id)
      .single();
    if (branchRow) {
      await supabase.from('merchant_branches').update({ balance: Number(branchRow.balance) + branchCredit }).eq('id', branch_id);
    }

    // Get payer name
    const { data: payerProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', payerId)
      .single();
    const payerName = payerProfile?.full_name || 'Member';

    // Create payment transaction
    const { data: paymentTx } = await supabase
      .from('transactions')
      .insert({
        user_id: payerId,
        type: 'payment',
        amount,
        fee_amount: feeAmount,
        net_amount: netAmount,
        status: 'completed',
        description: description || `API Payment to ${branch.branch_name}`,
        metadata: { branch_id, branch_name: branch.branch_name, api_app_id: app.id, api_app_name: app.name },
      })
      .select('id')
      .single();

    // Create income transaction for branch
    const branchIncomeUserId = branch.owner_user_id || branch.merchant_user_id;
    await supabase.from('transactions').insert({
      user_id: branchIncomeUserId,
      type: 'top_up',
      amount: branchCredit,
      status: 'completed',
      description: `API Payment from ${payerName}`,
      reference_id: paymentTx?.id || null,
      metadata: { branch_id, branch_name: branch.branch_name, api_app_id: app.id },
    });

    // Cashback
    if (cashbackShare > 0) {
      await supabase.from('wallets').update({
        balance: newPayerBalance + cashbackShare,
        updated_at: new Date().toISOString(),
      }).eq('user_id', payerId).eq('wallet_type', 'member');

      await supabase.from('transactions').insert({
        user_id: payerId,
        type: 'cashback',
        amount: cashbackShare,
        status: 'completed',
        description: `Cashback from ${branch.branch_name}`,
        reference_id: paymentTx?.id || null,
      });
    }

    // Referral tier commissions
    const { data: ancestors } = await supabase
      .from('referral_tree')
      .select('ancestor_id, tier')
      .eq('user_id', payerId)
      .order('tier', { ascending: true })
      .limit(5);

    let unclaimedCommission = 0;
    if (ancestors && ancestors.length > 0) {
      for (const ancestor of ancestors) {
        if (ancestor.tier >= 1 && ancestor.tier <= 5) {
          const { data: ancestorWallet } = await supabase
            .from('wallets')
            .select('balance')
            .eq('user_id', ancestor.ancestor_id)
            .eq('wallet_type', 'member')
            .single();

          if (ancestorWallet) {
            await supabase.from('wallets').update({
              balance: Number(ancestorWallet.balance) + tierShare,
              updated_at: new Date().toISOString(),
            }).eq('user_id', ancestor.ancestor_id).eq('wallet_type', 'member');

            await supabase.from('transactions').insert({
              user_id: ancestor.ancestor_id,
              type: 'commission',
              amount: tierShare,
              status: 'completed',
              description: `Tier ${ancestor.tier} commission from ${branch.branch_name}`,
              reference_id: paymentTx?.id || null,
            });
          } else {
            unclaimedCommission += tierShare;
          }
        }
      }
      const missingTiers = 5 - ancestors.length;
      unclaimedCommission += missingTiers * tierShare;
    } else {
      unclaimedCommission = 5 * tierShare;
    }

    // Return unclaimed to branch
    if (unclaimedCommission > 0 && branchWallet) {
      const { data: updatedBW } = await supabase
        .from('wallets')
        .select('balance')
        .eq('wallet_type', 'branch')
        .eq('branch_id', branch_id)
        .single();

      if (updatedBW) {
        await supabase.from('wallets').update({
          balance: Number(updatedBW.balance) + unclaimedCommission,
          updated_at: new Date().toISOString(),
        }).eq('wallet_type', 'branch').eq('branch_id', branch_id);
      }
    }

    // Update charge to completed
    await supabase.from('api_charges').update({
      status: 'completed',
      transaction_id: paymentTx?.id || null,
      completed_at: new Date().toISOString(),
    }).eq('id', charge.id);

    console.log(`API Charge completed: ${payerId} -> ${branch.branch_name}, RM${amount}, app: ${app.name}`);

    // Send webhook notification (fire-and-forget)
    if (app.webhook_url) {
      const webhookPayload = {
        event: 'charge.completed',
        charge_id: charge.id,
        transaction_id: paymentTx?.id,
        amount,
        description: description || null,
        reference: reference || null,
        status: 'completed',
        timestamp: new Date().toISOString(),
      };
      const payloadStr = JSON.stringify(webhookPayload);

      // HMAC-SHA256 signature using the app's api_secret_hash as key
      const encoder = new TextEncoder();
      const hmacKey = await crypto.subtle.importKey(
        'raw', encoder.encode(app.api_secret_hash),
        { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
      );
      const sigBuf = await crypto.subtle.sign('HMAC', hmacKey, encoder.encode(payloadStr));
      const signature = Array.from(new Uint8Array(sigBuf)).map(b => b.toString(16).padStart(2, '0')).join('');

      fetch(app.webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
        },
        body: payloadStr,
      }).catch(err => console.error('Webhook delivery failed:', err));
    }

    return new Response(JSON.stringify({
      success: true,
      charge_id: charge.id,
      transaction_id: paymentTx?.id,
      amount,
      new_balance: newPayerBalance + cashbackShare,
      cashback: cashbackShare,
      branch_name: branch.branch_name,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Charge error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
