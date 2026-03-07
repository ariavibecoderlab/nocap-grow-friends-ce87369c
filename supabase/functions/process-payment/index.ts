import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as encodeBase64 } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

async function hashPin(pin: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(pin + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return encodeBase64(new Uint8Array(hashBuffer));
}

async function verifyPin(pin: string, storedHash: string): Promise<boolean> {
  if (!storedHash.includes(':')) return pin === storedHash;
  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) return false;
  return (await hashPin(pin, salt)) === hash;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function idempotencyKey(...parts: string[]): string { return parts.join(':'); }
function timeBucket(windowSec = 10): string { return Math.floor(Date.now() / (windowSec * 1000)).toString(36); }

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await anonClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const payerId = user.id;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { branch_id, qr_code_id, amount, pin } = await req.json();

    if (!branch_id || typeof branch_id !== 'string') {
      return new Response(JSON.stringify({ error: 'Branch is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!amount || typeof amount !== 'number' || amount < 0.01 || amount > 50000) {
      return new Response(JSON.stringify({ error: 'Amount must be between RM0.01 and RM50,000' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: branch } = await supabase
      .from('merchant_branches')
      .select('id, merchant_user_id, branch_name, commission_percent, is_active, owner_user_id')
      .eq('id', branch_id)
      .single();

    if (!branch) {
      return new Response(JSON.stringify({ error: 'Merchant branch not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!branch.is_active) {
      return new Response(JSON.stringify({ error: 'This merchant branch is not active' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (payerId === branch.merchant_user_id) {
      return new Response(JSON.stringify({ error: 'Cannot pay to your own branch' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If dynamic QR, validate and mark as used
    if (qr_code_id) {
      const { data: qrCode } = await supabase
        .from('merchant_qr_codes')
        .select('id, amount, is_used, expires_at')
        .eq('id', qr_code_id)
        .single();

      if (!qrCode) {
        return new Response(JSON.stringify({ error: 'QR code not found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (qrCode.is_used) {
        return new Response(JSON.stringify({ error: 'This QR code has already been used' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (qrCode.expires_at && new Date(qrCode.expires_at) < new Date()) {
        return new Response(JSON.stringify({ error: 'This QR code has expired' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      await supabase.from('merchant_qr_codes').update({ is_used: true }).eq('id', qr_code_id);
    }

    // PIN verification
    const { data: pinSetting } = await supabase
      .from('system_settings').select('value').eq('key', 'min_pin_amount').single();
    const minPinAmount = pinSetting ? Number(pinSetting.value) : 100;

    if (amount >= minPinAmount) {
      if (!pin) {
        return new Response(JSON.stringify({ error: `PIN is required for payments of RM${minPinAmount} and above` }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: pinProfile } = await supabase
        .from('profiles')
        .select('has_pin, pin_hash, pin_attempts, pin_locked_until')
        .eq('user_id', payerId)
        .single();

      if (!pinProfile?.has_pin || !pinProfile.pin_hash) {
        return new Response(JSON.stringify({ error: 'Please set up your PIN first in Settings', code: 'PIN_NOT_SET' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (pinProfile.pin_locked_until) {
        const lockedUntil = new Date(pinProfile.pin_locked_until);
        if (lockedUntil > new Date()) {
          const minutesLeft = Math.ceil((lockedUntil.getTime() - Date.now()) / 60000);
          return new Response(JSON.stringify({ error: `PIN locked. Try again in ${minutesLeft} minute(s).`, code: 'PIN_LOCKED' }), {
            status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        await supabase.from('profiles').update({ pin_attempts: 0, pin_locked_until: null }).eq('user_id', payerId);
      }

      const pinValid = await verifyPin(pin, pinProfile.pin_hash);
      if (!pinValid) {
        const newAttempts = (pinProfile.pin_attempts || 0) + 1;
        const updates: Record<string, unknown> = { pin_attempts: newAttempts };
        if (newAttempts >= MAX_ATTEMPTS) {
          updates.pin_locked_until = new Date(Date.now() + LOCKOUT_MINUTES * 60000).toISOString();
        }
        await supabase.from('profiles').update(updates).eq('user_id', payerId);
        const remaining = MAX_ATTEMPTS - newAttempts;
        return new Response(JSON.stringify({
          error: remaining > 0 ? `Incorrect PIN. ${remaining} attempt(s) remaining.` : `Too many failed attempts. PIN locked for ${LOCKOUT_MINUTES} minutes.`,
          code: 'INVALID_PIN', locked: newAttempts >= MAX_ATTEMPTS, attempts_remaining: Math.max(0, remaining),
        }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      await supabase.from('profiles').update({ pin_attempts: 0, pin_locked_until: null }).eq('user_id', payerId);
    }

    // Calculate amounts
    const { data: feeSetting } = await supabase
      .from('system_settings').select('value').eq('key', 'platform_fee_percent').single();
    const platformFeePercent = feeSetting ? Number(feeSetting.value) : 2.0;
    const commissionPercent = Number(branch.commission_percent);

    const feeAmount = Math.round(amount * platformFeePercent) / 100;
    const commissionPool = Math.round(amount * commissionPercent) / 100;
    const netAmount = amount - feeAmount;
    const baseShare = Math.round((commissionPool / 6) * 100) / 100;
    const cashbackShare = commissionPool > 0 ? Math.max(0.01, baseShare) : 0;
    const tierShare = baseShare;

    // ATOMIC: Debit payer's member wallet
    const { data: newPayerBalance, error: debitErr } = await supabase.rpc('debit_wallet', {
      p_user_id: payerId, p_wallet_type: 'member', p_amount: amount,
    });
    if (debitErr) {
      const msg = debitErr.message || '';
      if (msg.includes('Insufficient balance')) {
        return new Response(JSON.stringify({ error: 'Insufficient balance' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw debitErr;
    }

    // ATOMIC: Credit branch wallet (create if missing)
    const branchCredit = netAmount - commissionPool;
    const branchIncomeUserId = branch.owner_user_id || branch.merchant_user_id;
    const { error: branchCreditErr } = await supabase.rpc('credit_wallet', {
      p_user_id: branchIncomeUserId, p_wallet_type: 'branch', p_amount: branchCredit, p_branch_id: branch_id,
    });
    if (branchCreditErr) {
      // Wallet doesn't exist — create it
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

    // Get payer name
    const { data: payerProfile } = await supabase.from('profiles').select('full_name').eq('user_id', payerId).single();
    const payerName = payerProfile?.full_name || 'Member';

    // Create payment transaction with idempotency
    const ikey = idempotencyKey('pay', payerId, branch_id, amount.toString(), timeBucket());
    const { data: paymentTx, error: payTxErr } = await supabase.from('transactions').insert({
      user_id: payerId, type: 'payment', amount, fee_amount: feeAmount, net_amount: netAmount,
      status: 'completed', description: `Payment to ${branch.branch_name}`,
      metadata: { branch_id, branch_name: branch.branch_name },
      idempotency_key: ikey,
    }).select('id').single();

    if (payTxErr && (payTxErr as any).code === '23505') {
      const { data: existing } = await supabase.from('transactions').select('id').eq('idempotency_key', ikey).single();
      return new Response(JSON.stringify({ error: 'Duplicate request', transaction_id: existing?.id }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create income transaction for branch
    await supabase.from('transactions').insert({
      user_id: branchIncomeUserId, type: 'top_up', amount: branchCredit, status: 'completed',
      description: `Payment from ${payerName}`, reference_id: paymentTx?.id || null,
      metadata: { branch_id, branch_name: branch.branch_name },
    });

    // ATOMIC: Cashback to payer
    if (cashbackShare > 0) {
      await supabase.rpc('credit_wallet', {
        p_user_id: payerId, p_wallet_type: 'member', p_amount: cashbackShare,
      });
      await supabase.from('transactions').insert({
        user_id: payerId, type: 'cashback', amount: cashbackShare, status: 'completed',
        description: `Cashback from ${branch.branch_name}`, reference_id: paymentTx?.id || null,
      });
    }

    // ATOMIC: Tier commissions
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

    // ATOMIC: Credit platform fee to admin wallet
    if (feeAmount > 0) {
      const { data: adminRole } = await supabase.from('user_roles').select('user_id').eq('role', 'admin').limit(1).single();
      if (adminRole) {
        const { error: adminCreditErr } = await supabase.rpc('credit_wallet', {
          p_user_id: adminRole.user_id, p_wallet_type: 'admin', p_amount: feeAmount,
        });
        if (adminCreditErr) {
          // Admin wallet doesn't exist — create it
          await supabase.from('wallets').insert({
            user_id: adminRole.user_id, wallet_type: 'admin', balance: feeAmount,
          });
        }
        await supabase.from('transactions').insert({
          user_id: adminRole.user_id, type: 'commission', amount: feeAmount, status: 'completed',
          description: `Platform fee from ${branch.branch_name}`, reference_id: paymentTx?.id || null,
          metadata: { source: 'platform_fee', branch_id, branch_name: branch.branch_name },
        });
      }
    }

    console.log(`Payment completed: ${payerId} -> ${branch.branch_name}, RM${amount}`);

    return new Response(JSON.stringify({
      success: true, transaction_id: paymentTx?.id,
      new_balance: Number(newPayerBalance) + cashbackShare,
      cashback: cashbackShare, branch_name: branch.branch_name,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: unknown) {
    console.error('Payment error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
