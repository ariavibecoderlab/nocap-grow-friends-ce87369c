import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const SUPABASE_PUBLISHABLE_KEY = Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!;

    if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured');

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const anonClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const senderId = claimsData.claims.sub as string;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
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

    // PIN verification for RM50 and above
    if (amount >= 50) {
      if (!pin) {
        return new Response(JSON.stringify({ error: 'PIN is required for transfers of RM50 and above' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: senderProfile } = await supabase
        .from('profiles')
        .select('has_pin, pin_hash')
        .eq('user_id', senderId)
        .single();

      if (!senderProfile?.has_pin || !senderProfile.pin_hash) {
        return new Response(JSON.stringify({ error: 'Please set up your PIN first in Profile settings', code: 'PIN_NOT_SET' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Simple PIN comparison (in production, use proper hash comparison)
      if (senderProfile.pin_hash !== pin) {
        return new Response(JSON.stringify({ error: 'Invalid PIN' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Check sender wallet balance
    const { data: senderWallet } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', senderId)
      .single();

    if (!senderWallet || Number(senderWallet.balance) < amount) {
      return new Response(JSON.stringify({ error: 'Insufficient balance' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check recipient exists
    const { data: recipientWallet } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', recipient_user_id)
      .single();

    if (!recipientWallet) {
      return new Response(JSON.stringify({ error: 'Recipient not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get recipient name for description
    const { data: recipientProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', recipient_user_id)
      .single();

    const { data: senderProfileName } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', senderId)
      .single();

    const recipientName = recipientProfile?.full_name || 'Member';
    const senderName = senderProfileName?.full_name || 'Member';

    // Debit sender
    const newSenderBalance = Number(senderWallet.balance) - amount;
    await supabase
      .from('wallets')
      .update({ balance: newSenderBalance, updated_at: new Date().toISOString() })
      .eq('user_id', senderId);

    // Credit recipient
    const newRecipientBalance = Number(recipientWallet.balance) + amount;
    await supabase
      .from('wallets')
      .update({ balance: newRecipientBalance, updated_at: new Date().toISOString() })
      .eq('user_id', recipient_user_id);

    // Create transfer_out transaction for sender
    const { data: outTx } = await supabase
      .from('transactions')
      .insert({
        user_id: senderId,
        type: 'transfer_out',
        amount,
        status: 'completed',
        description: `Transfer to ${recipientName}`,
      })
      .select('id')
      .single();

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
