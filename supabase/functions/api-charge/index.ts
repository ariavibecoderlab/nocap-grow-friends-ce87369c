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

async function logRequest(supabase: any, appId: string, endpoint: string, method: string, statusCode: number, reqBody: any, resBody: any, userId?: string, startTime?: number) {
  try {
    await supabase.from('api_request_logs').insert({
      app_id: appId,
      endpoint,
      method,
      status_code: statusCode,
      request_body: reqBody || {},
      response_body: resBody || {},
      user_id: userId || null,
      duration_ms: startTime ? Date.now() - startTime : null,
    });
} catch (e) { console.error('Log insert failed:', e); }
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
    const hmacKey = await crypto.subtle.importKey(
      'raw', encoder.encode(secretHash),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const sigBuf = await crypto.subtle.sign('HMAC', hmacKey, encoder.encode(payloadStr));
    const signature = Array.from(new Uint8Array(sigBuf)).map(b => b.toString(16).padStart(2, '0')).join('');

    // Retry with exponential backoff: 1s, 2s, 4s (3 attempts max)
    const maxRetries = 3;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      totalAttempts = attempt + 1;
      try {
        const res = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signature,
            'X-Webhook-Attempt': String(attempt + 1),
          },
          body: payloadStr,
        });
        await res.text(); // consume body
        lastStatus = res.status;
        if (res.ok) {
          console.log(`Webhook delivered (attempt ${attempt + 1}): ${payload.event}`);
          delivered = true;
          break;
        }
        console.warn(`Webhook attempt ${attempt + 1} failed with status ${res.status}`);
      } catch (err) {
        console.warn(`Webhook attempt ${attempt + 1} network error:`, err);
        lastStatus = 0;
      }
      if (attempt < maxRetries - 1) {
        const delayMs = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        await new Promise(r => setTimeout(r, delayMs));
      }
    }
    if (!delivered) {
      console.error(`Webhook delivery failed after ${maxRetries} attempts: ${webhookUrl}`);
    }
  } catch (e) { console.error('Webhook send error:', e); }

  // Log webhook delivery to api_request_logs
  if (supabase && appId) {
    try {
      await supabase.from('api_request_logs').insert({
        app_id: appId,
        endpoint: `webhook:${payload.event || 'unknown'}`,
        method: 'WEBHOOK',
        status_code: delivered ? (lastStatus || 200) : (lastStatus || 0),
        request_body: { url: webhookUrl, event: payload.event, charge_id: payload.charge_id },
        response_body: { delivered, attempts: totalAttempts, final_status: lastStatus },
        duration_ms: Date.now() - startTime,
      });
    } catch (e) { console.error('Webhook log insert failed:', e); }
  }
}

function timeBucket(windowSec = 10): string { return Math.floor(Date.now() / (windowSec * 1000)).toString(36); }

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const startTime = Date.now();
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Parse body first so we can extract credentials from it if not in headers
    const rawBody = await req.text();
    let bodyData: Record<string, unknown> = {};
    try { if (rawBody) bodyData = JSON.parse(rawBody); } catch { /* not JSON */ }

    // Accept credentials from headers OR request body (for 3rd party compatibility)
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

    const { amount, description, reference, pin, metadata: customMetadata, branch_id: bodyBranchId } = bodyData as { amount: number; description?: string; reference?: string; pin?: string; metadata?: Record<string, unknown>; branch_id?: string };

    // Validate custom metadata
    if (customMetadata !== undefined && customMetadata !== null) {
      if (typeof customMetadata !== 'object' || Array.isArray(customMetadata)) {
        return new Response(JSON.stringify({ error: 'metadata must be a JSON object' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const metadataStr = JSON.stringify(customMetadata);
      if (metadataStr.length > 4096) {
        return new Response(JSON.stringify({ error: 'metadata must be less than 4KB' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }
    const payerId = token.user_id;

    // Resolve branch_id: use body param if provided, otherwise fall back to app's default branch
    const branch_id = bodyBranchId || app.branch_id;
    if (!branch_id) {
      return new Response(JSON.stringify({ error: 'branch_id is required for merchant-level apps (no default branch). Include branch_id in the request body.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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
    const chargeMetadata = { branch_id, ...(customMetadata ? { custom: customMetadata } : {}) };
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
        metadata: chargeMetadata,
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
        metadata: { sandbox: true, ...(customMetadata ? { custom: customMetadata } : {}) }
      }).eq('id', charge.id);

      console.log(`[SANDBOX] API Charge: ${payerId} -> ${branch.branch_name}, RM${amount}, app: ${app.name}`);

      // Send webhook for sandbox
      sendWebhook(app.webhook_url, app.api_secret_hash, {
        event: 'charge.completed', charge_id: charge.id, amount,
        description: description || null, reference: reference || null,
        status: 'completed', is_sandbox: true, metadata: customMetadata || {},
        timestamp: new Date().toISOString(),
      }, supabase, app.id);

      const sandboxRes = { success: true, charge_id: charge.id, amount, is_sandbox: true, message: 'Sandbox transaction completed (no real money movement)' };
      await logRequest(supabase, app.id, '/api-charge', 'POST', 200, { amount, description, reference, is_sandbox: true }, sandboxRes, payerId, startTime);
      return new Response(JSON.stringify(sandboxRes), {
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
        sendWebhook(app.webhook_url, app.api_secret_hash, {
          event: 'charge.failed', charge_id: charge.id, amount, description: description || null,
          reference: reference || null, status: 'failed', reason: 'PIN_REQUIRED',
          metadata: customMetadata || {}, timestamp: new Date().toISOString(),
        }, supabase, app.id);
        return new Response(JSON.stringify({ error: `PIN required for amounts >= RM${minPinAmount}`, code: 'PIN_REQUIRED', charge_id: charge.id }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: pinProfile } = await supabase
        .from('profiles')
        .select('has_pin, pin_hash, pin_attempts, pin_locked_until')
        .eq('user_id', payerId)
        .single();

      if (!pinProfile?.has_pin || !pinProfile.pin_hash) {
        await supabase.from('api_charges').update({ status: 'failed' }).eq('id', charge.id);
        sendWebhook(app.webhook_url, app.api_secret_hash, {
          event: 'charge.failed', charge_id: charge.id, amount, description: description || null,
          reference: reference || null, status: 'failed', reason: 'PIN_NOT_SET',
          metadata: customMetadata || {}, timestamp: new Date().toISOString(),
        }, supabase, app.id);
        return new Response(JSON.stringify({ error: 'PIN not set', code: 'PIN_NOT_SET', charge_id: charge.id }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check PIN lockout
      if (pinProfile.pin_locked_until) {
        const lockedUntil = new Date(pinProfile.pin_locked_until);
        if (lockedUntil > new Date()) {
          const minutesLeft = Math.ceil((lockedUntil.getTime() - Date.now()) / 60000);
          await supabase.from('api_charges').update({ status: 'failed' }).eq('id', charge.id);
          sendWebhook(app.webhook_url, app.api_secret_hash, {
            event: 'charge.failed', charge_id: charge.id, amount, description: description || null,
            reference: reference || null, status: 'failed', reason: 'PIN_LOCKED',
            metadata: customMetadata || {}, timestamp: new Date().toISOString(),
          }, supabase, app.id);
          return new Response(JSON.stringify({
            error: `PIN locked. Try again in ${minutesLeft} minute(s).`,
            code: 'PIN_LOCKED', charge_id: charge.id,
          }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        // Lockout expired — reset
        await supabase.from('profiles').update({ pin_attempts: 0, pin_locked_until: null }).eq('user_id', payerId);
      }

      const pinValid = await verifyPin(pin, pinProfile.pin_hash);
      if (!pinValid) {
        const MAX_ATTEMPTS = 5;
        const LOCKOUT_MINUTES = 15;
        const newAttempts = (pinProfile.pin_attempts || 0) + 1;
        const updates: Record<string, unknown> = { pin_attempts: newAttempts };
        if (newAttempts >= MAX_ATTEMPTS) {
          updates.pin_locked_until = new Date(Date.now() + LOCKOUT_MINUTES * 60000).toISOString();
        }
        await supabase.from('profiles').update(updates).eq('user_id', payerId);

        await supabase.from('api_charges').update({ status: 'failed' }).eq('id', charge.id);
        sendWebhook(app.webhook_url, app.api_secret_hash, {
          event: 'charge.failed', charge_id: charge.id, amount, description: description || null,
          reference: reference || null, status: 'failed', reason: 'INVALID_PIN',
          metadata: customMetadata || {}, timestamp: new Date().toISOString(),
        }, supabase, app.id);

        const remaining = MAX_ATTEMPTS - newAttempts;
        return new Response(JSON.stringify({
          error: remaining > 0
            ? `Invalid PIN. ${remaining} attempt(s) remaining.`
            : `Too many failed attempts. PIN locked for ${LOCKOUT_MINUTES} minutes.`,
          code: 'INVALID_PIN',
          locked: newAttempts >= MAX_ATTEMPTS,
          attempts_remaining: Math.max(0, remaining),
          charge_id: charge.id,
        }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Reset attempts on successful PIN
      await supabase.from('profiles').update({ pin_attempts: 0, pin_locked_until: null }).eq('user_id', payerId);
    }

    // === PAYMENT LOGIC (atomic wallet operations) ===
    const { data: feeSetting } = await supabase
      .from('system_settings').select('value').eq('key', 'platform_fee_percent').single();

    const platformFeePercent = feeSetting ? Number(feeSetting.value) : 2.0;
    const commissionPercent = Number(branch.commission_percent);

    const feeAmount = Math.round(amount * platformFeePercent) / 100;
    const commissionPool = Math.round(amount * commissionPercent) / 100;
    const netAmount = amount - feeAmount;
    const cashbackShare = Math.floor((commissionPool / 6) * 100) / 100;
    const tierShare = Math.floor((commissionPool / 6) * 100) / 100;

    // ATOMIC: Debit payer
    const { data: newPayerBalance, error: debitErr } = await supabase.rpc('debit_wallet', {
      p_user_id: payerId, p_wallet_type: 'member', p_amount: amount,
    });
    if (debitErr) {
      await supabase.from('api_charges').update({ status: 'failed' }).eq('id', charge.id);
      sendWebhook(app.webhook_url, app.api_secret_hash, {
        event: 'charge.failed', charge_id: charge.id, amount, description: description || null,
        reference: reference || null, status: 'failed', reason: 'INSUFFICIENT_BALANCE',
        metadata: customMetadata || {}, timestamp: new Date().toISOString(),
      }, supabase, app.id);
      return new Response(JSON.stringify({ error: 'Insufficient balance', charge_id: charge.id }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ATOMIC: Credit branch wallet (create if missing)
    const branchCredit = netAmount - commissionPool;
    const branchIncomeUserId = branch.owner_user_id || branch.merchant_user_id;
    const { error: branchCreditErr } = await supabase.rpc('credit_wallet', {
      p_user_id: branchIncomeUserId, p_wallet_type: 'branch', p_amount: branchCredit, p_branch_id: branch_id,
    });
    if (branchCreditErr) {
      console.log(`Creating missing branch wallet for branch_id=${branch_id}`);
      await supabase.from('wallets').insert({
        user_id: branchIncomeUserId, wallet_type: 'branch', branch_id, balance: branchCredit,
      });
    }

    // Update merchant_branches.balance
    const { data: branchRow } = await supabase.from('merchant_branches').select('balance').eq('id', branch_id).single();
    if (branchRow) {
      await supabase.from('merchant_branches').update({ balance: Number(branchRow.balance) + branchCredit }).eq('id', branch_id);
    }

    const { data: payerProfile } = await supabase.from('profiles').select('full_name').eq('user_id', payerId).single();
    const payerName = payerProfile?.full_name || 'Member';

    const ikey = [
      'apichg', app.id, payerId, amount.toString(), reference || timeBucket()
    ].join(':');
    const { data: paymentTx, error: payTxErr } = await supabase.from('transactions').insert({
      user_id: payerId, type: 'payment', amount, fee_amount: feeAmount, net_amount: netAmount,
      status: 'completed', description: description || `API Payment to ${branch.branch_name}`,
      metadata: { branch_id, branch_name: branch.branch_name, api_app_id: app.id, api_app_name: app.name },
      idempotency_key: ikey,
    }).select('id').single();

    if (payTxErr && (payTxErr as any).code === '23505') {
      const { data: existing } = await supabase.from('transactions').select('id').eq('idempotency_key', ikey).single();
      return new Response(JSON.stringify({ error: 'Duplicate request', transaction_id: existing?.id }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await supabase.from('transactions').insert({
      user_id: branchIncomeUserId, type: 'top_up', amount: branchCredit, status: 'completed',
      description: `API Payment from ${payerName}`, reference_id: paymentTx?.id || null,
      metadata: { branch_id, branch_name: branch.branch_name, api_app_id: app.id },
    });

    // ATOMIC: Cashback
    if (cashbackShare > 0) {
      await supabase.rpc('credit_wallet', {
        p_user_id: payerId, p_wallet_type: 'member', p_amount: cashbackShare,
      });
      await supabase.from('transactions').insert({
        user_id: payerId, type: 'cashback', amount: cashbackShare, status: 'completed',
        description: `Cashback from ${branch.branch_name}`, reference_id: paymentTx?.id || null,
      });
    }

    // ATOMIC: Referral tier commissions
    const { data: ancestors } = await supabase
      .from('referral_tree').select('ancestor_id, tier')
      .eq('user_id', payerId).order('tier', { ascending: true }).limit(5);

    let unclaimedCommission = 0;
    if (ancestors && ancestors.length > 0) {
      for (const ancestor of ancestors) {
        if (ancestor.tier >= 1 && ancestor.tier <= 5) {
          const { error: commErr } = await supabase.rpc('credit_wallet', {
            p_user_id: ancestor.ancestor_id, p_wallet_type: 'member', p_amount: tierShare,
          });
          if (!commErr) {
            await supabase.from('transactions').insert({
              user_id: ancestor.ancestor_id, type: 'commission', amount: tierShare, status: 'completed',
              description: `Tier ${ancestor.tier} commission from ${branch.branch_name}`,
              reference_id: paymentTx?.id || null,
            });
          } else {
            unclaimedCommission += tierShare;
          }
        }
      }
      unclaimedCommission += (5 - ancestors.length) * tierShare;
    } else {
      unclaimedCommission = 5 * tierShare;
    }

    // Return unclaimed to branch
    if (unclaimedCommission > 0) {
      await supabase.rpc('credit_wallet', {
        p_user_id: branchIncomeUserId, p_wallet_type: 'branch', p_amount: unclaimedCommission, p_branch_id: branch_id,
      });
    }

    // ATOMIC: Credit platform fee to admin
    if (feeAmount > 0) {
      const { data: adminRole } = await supabase.from('user_roles').select('user_id').eq('role', 'admin').limit(1).single();
      if (adminRole) {
        const { error: adminErr } = await supabase.rpc('credit_wallet', {
          p_user_id: adminRole.user_id, p_wallet_type: 'admin', p_amount: feeAmount,
        });
        if (adminErr) {
          await supabase.from('wallets').insert({ user_id: adminRole.user_id, wallet_type: 'admin', balance: feeAmount });
        }
        await supabase.from('transactions').insert({
          user_id: adminRole.user_id, type: 'commission', amount: feeAmount, status: 'completed',
          description: `Platform fee from ${branch.branch_name}`, reference_id: paymentTx?.id || null,
          metadata: { source: 'platform_fee', branch_id, branch_name: branch.branch_name },
        });
      }
    }

    // Update charge to completed
    await supabase.from('api_charges').update({
      status: 'completed', transaction_id: paymentTx?.id || null, completed_at: new Date().toISOString(),
    }).eq('id', charge.id);

    console.log(`API Charge completed: ${payerId} -> ${branch.branch_name}, RM${amount}, app: ${app.name}`);

    sendWebhook(app.webhook_url, app.api_secret_hash, {
      event: 'charge.completed', charge_id: charge.id, transaction_id: paymentTx?.id,
      amount, description: description || null, reference: reference || null,
      status: 'completed', metadata: customMetadata || {}, timestamp: new Date().toISOString(),
    }, supabase, app.id);

    const successRes = { success: true, charge_id: charge.id, transaction_id: paymentTx?.id, amount, new_balance: Number(newPayerBalance) + cashbackShare, cashback: cashbackShare, branch_name: branch.branch_name };
    await logRequest(supabase, app.id, '/api-charge', 'POST', 200, { amount, description, reference }, successRes, payerId, startTime);
    return new Response(JSON.stringify(successRes), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Charge error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    // Best-effort log on error
    try {
      const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      await logRequest(sb, 'unknown', '/api-charge', 'POST', 500, {}, { error: msg });
    } catch (_) { /* ignore */ }
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
