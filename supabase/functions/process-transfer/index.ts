import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function idempotencyKey(...parts: string[]): string { return parts.join(':'); }
function timeBucket(windowSec = 10): string { return Math.floor(Date.now() / (windowSec * 1000)).toString(36); }

async function hashPin(pin: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(pin + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return encodeBase64(hashBuffer);
}

async function verifyPin(pin: string, storedHash: string): Promise<boolean> {
  if (!storedHash.includes(':')) return pin === storedHash;
  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) return false;
  return (await hashPin(pin, salt)) === hash;
}

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

    if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured');
    if (!SUPABASE_ANON_KEY) throw new Error('SUPABASE_ANON_KEY not configured');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await anonClient.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const senderId = user.id;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // CRIT-5: Rate limit — 10 transfer requests per 60 seconds per user
    const { data: allowed } = await supabase.rpc('check_rate_limit', {
      p_identifier: senderId, p_endpoint: 'process-transfer', p_max_requests: 10, p_window_seconds: 60,
    });
    if (!allowed) {
      return new Response(JSON.stringify({ error: 'Too many transfer requests. Please wait a moment.' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' },
      });
    }

    const { recipient_user_id, amount, pin } = await req.json();

    // Validate inputs
    if (!recipient_user_id || typeof recipient_user_id !== 'string') {
      return new Response(JSON.stringify({ error: 'Recipient is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!amount || typeof amount !== 'number' || amount < 0.01 || amount > 10000) {
      return new Response(JSON.stringify({ error: 'Amount must be between RM0.01 and RM10,000' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (senderId === recipient_user_id) {
      return new Response(JSON.stringify({ error: 'Cannot transfer to yourself' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get min PIN amount from system_settings
    const { data: pinSetting } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'min_pin_amount')
      .single();
    const minPinAmount = pinSetting ? Number(pinSetting.value) : 100;

    // PIN verification for amounts at or above the configured limit
    if (amount >= minPinAmount) {
      if (!pin) {
        return new Response(JSON.stringify({ error: `PIN is required for transfers of RM${minPinAmount} and above` }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: senderProfile } = await supabase
        .from('profiles')
        .select('has_pin, pin_hash, pin_attempts, pin_locked_until')
        .eq('user_id', senderId)
        .single();

      if (!senderProfile?.has_pin || !senderProfile.pin_hash) {
        return new Response(JSON.stringify({ error: 'Please set up your PIN first in Settings', code: 'PIN_NOT_SET' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (senderProfile.pin_locked_until) {
        const lockedUntil = new Date(senderProfile.pin_locked_until);
        if (lockedUntil > new Date()) {
          const minutesLeft = Math.ceil((lockedUntil.getTime() - Date.now()) / 60000);
          return new Response(JSON.stringify({
            error: `PIN locked. Try again in ${minutesLeft} minute(s).`,
            code: 'PIN_LOCKED',
          }), {
            status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        await supabase.from('profiles').update({ pin_attempts: 0, pin_locked_until: null }).eq('user_id', senderId);
      }

      const isValid = await verifyPin(String(pin), senderProfile.pin_hash);
      if (!isValid) {
        const newAttempts = (senderProfile.pin_attempts || 0) + 1;
        const updates: Record<string, unknown> = { pin_attempts: newAttempts };
        if (newAttempts >= MAX_ATTEMPTS) {
          updates.pin_locked_until = new Date(Date.now() + LOCKOUT_MINUTES * 60000).toISOString();
        }
        await supabase.from('profiles').update(updates).eq('user_id', senderId);

        const remaining = MAX_ATTEMPTS - newAttempts;
        return new Response(JSON.stringify({
          error: remaining > 0
            ? `Incorrect PIN. ${remaining} attempt(s) remaining.`
            : `Too many failed attempts. PIN locked for ${LOCKOUT_MINUTES} minutes.`,
          code: 'INVALID_PIN',
          locked: newAttempts >= MAX_ATTEMPTS,
          attempts_remaining: Math.max(0, remaining),
        }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      await supabase.from('profiles').update({ pin_attempts: 0, pin_locked_until: null }).eq('user_id', senderId);
    }

    // Check recipient wallet exists
    const { data: recipientWallet } = await supabase
      .from('wallets')
      .select('id')
      .eq('user_id', recipient_user_id)
      .eq('wallet_type', 'member')
      .single();

    if (!recipientWallet) {
      return new Response(JSON.stringify({ error: 'Recipient not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ATOMIC: Debit sender's member wallet
    const { data: newSenderBalance, error: debitErr } = await supabase.rpc('debit_wallet', {
      p_user_id: senderId,
      p_wallet_type: 'member',
      p_amount: amount,
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

    // ATOMIC: Credit recipient's member wallet
    const { error: creditErr } = await supabase.rpc('credit_wallet', {
      p_user_id: recipient_user_id,
      p_wallet_type: 'member',
      p_amount: amount,
    });

    if (creditErr) throw creditErr;

    // Get names for description
    const [{ data: recipientProfile }, { data: senderProfileName }] = await Promise.all([
      supabase.from('profiles').select('full_name').eq('user_id', recipient_user_id).single(),
      supabase.from('profiles').select('full_name').eq('user_id', senderId).single(),
    ]);

    const recipientName = recipientProfile?.full_name || 'Member';
    const senderName = senderProfileName?.full_name || 'Member';

    // Create transfer_out transaction for sender with idempotency
    const ikey = idempotencyKey('xfer', senderId, recipient_user_id, amount.toString(), timeBucket());
    const { data: outTx, error: outTxErr } = await supabase
      .from('transactions')
      .insert({
        user_id: senderId,
        type: 'transfer_out',
        amount,
        status: 'completed',
        description: `Transfer to ${recipientName}`,
        idempotency_key: ikey,
      })
      .select('id')
      .single();

    if (outTxErr && (outTxErr as any).code === '23505') {
      const { data: existing } = await supabase.from('transactions').select('id').eq('idempotency_key', ikey).single();
      return new Response(JSON.stringify({ error: 'Duplicate request', transaction_id: existing?.id }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create transfer_in transaction for recipient
    await supabase
      .from('transactions')
      .insert({
        user_id: recipient_user_id,
        type: 'transfer_in',
        amount,
        status: 'completed',
        description: `Received from ${senderName}`,
        reference_id: outTx?.id || null,
      });

    console.log(`Transfer completed: ${senderId} -> ${recipient_user_id}, RM${amount}`);

    return new Response(JSON.stringify({
      success: true,
      transaction_id: outTx?.id,
      new_balance: newSenderBalance,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Transfer error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
