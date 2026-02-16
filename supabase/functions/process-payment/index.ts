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
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Authenticate user
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

    // Validate inputs
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

    // Get branch info
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

      // Mark as used
      await supabase.from('merchant_qr_codes').update({ is_used: true }).eq('id', qr_code_id);
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
        return new Response(JSON.stringify({ error: `PIN is required for payments of RM${minPinAmount} and above` }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: payerProfile } = await supabase
        .from('profiles')
        .select('has_pin, pin_hash')
        .eq('user_id', payerId)
        .single();

      if (!payerProfile?.has_pin || !payerProfile.pin_hash) {
        return new Response(JSON.stringify({ error: 'Please set up your PIN first in Settings', code: 'PIN_NOT_SET' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (payerProfile.pin_hash !== pin) {
        return new Response(JSON.stringify({ error: 'Invalid PIN' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Check payer's MEMBER wallet
    const { data: payerWallet } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', payerId)
      .eq('wallet_type', 'member')
      .single();

    if (!payerWallet || Number(payerWallet.balance) < amount) {
      return new Response(JSON.stringify({ error: 'Insufficient balance' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get platform fee from system_settings
    const { data: feeSetting } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'platform_fee_percent')
      .single();

    const platformFeePercent = feeSetting ? Number(feeSetting.value) : 2.0;
    const commissionPercent = Number(branch.commission_percent);

    // Calculate amounts
    const feeAmount = Math.round(amount * platformFeePercent) / 100;
    const commissionPool = Math.round(amount * commissionPercent) / 100;
    const netAmount = amount - feeAmount;

    // Commission split: pool / 6 → 1 part cashback, 5 parts for referral tiers
    const cashbackShare = Math.floor((commissionPool / 6) * 100) / 100;
    const tierShare = Math.floor((commissionPool / 6) * 100) / 100;

    // Debit payer's member wallet
    const newPayerBalance = Number(payerWallet.balance) - amount;
    await supabase
      .from('wallets')
      .update({ balance: newPayerBalance, updated_at: new Date().toISOString() })
      .eq('user_id', payerId)
      .eq('wallet_type', 'member');

    // Credit BRANCH wallet (payment goes directly to branch wallet)
    const branchCredit = netAmount - commissionPool;
    const { data: branchWallet } = await supabase
      .from('wallets')
      .select('balance')
      .eq('wallet_type', 'branch')
      .eq('branch_id', branch_id)
      .single();

    if (branchWallet) {
      await supabase
        .from('wallets')
        .update({
          balance: Number(branchWallet.balance) + branchCredit,
          updated_at: new Date().toISOString(),
        })
        .eq('wallet_type', 'branch')
        .eq('branch_id', branch_id);
    }

    // Also update merchant_branches.balance for backward compatibility
    const { data: branchRow } = await supabase
      .from('merchant_branches')
      .select('balance')
      .eq('id', branch_id)
      .single();
    if (branchRow) {
      await supabase
        .from('merchant_branches')
        .update({ balance: Number(branchRow.balance) + branchCredit })
        .eq('id', branch_id);
    }

    // Get payer name
    const { data: payerProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', payerId)
      .single();
    const payerName = payerProfile?.full_name || 'Member';

    // Create payment transaction for payer
    const { data: paymentTx } = await supabase
      .from('transactions')
      .insert({
        user_id: payerId,
        type: 'payment',
        amount,
        fee_amount: feeAmount,
        net_amount: netAmount,
        status: 'completed',
        description: `Payment to ${branch.branch_name}`,
        metadata: { branch_id, branch_name: branch.branch_name },
      })
      .select('id')
      .single();

    // Create income transaction for branch owner (or merchant if no owner)
    const branchIncomeUserId = branch.owner_user_id || branch.merchant_user_id;
    await supabase.from('transactions').insert({
      user_id: branchIncomeUserId,
      type: 'top_up',
      amount: branchCredit,
      status: 'completed',
      description: `Payment from ${payerName}`,
      reference_id: paymentTx?.id || null,
      metadata: { branch_id, branch_name: branch.branch_name },
    });

    // Distribute cashback to payer's member wallet
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

    // Distribute tier commissions to referral ancestors (member wallets)
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

      // Unclaimed tiers (if fewer than 5 ancestors)
      const missingTiers = 5 - ancestors.length;
      unclaimedCommission += missingTiers * tierShare;
    } else {
      // No referral tree — all 5 tier shares unclaimed
      unclaimedCommission = 5 * tierShare;
    }

    // Return unclaimed commissions to branch wallet
    if (unclaimedCommission > 0 && branchWallet) {
      const { data: updatedBranchWallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('wallet_type', 'branch')
        .eq('branch_id', branch_id)
        .single();

      if (updatedBranchWallet) {
        await supabase.from('wallets').update({
          balance: Number(updatedBranchWallet.balance) + unclaimedCommission,
          updated_at: new Date().toISOString(),
        }).eq('wallet_type', 'branch').eq('branch_id', branch_id);
      }
    }

    console.log(`Payment completed: ${payerId} -> ${branch.branch_name}, RM${amount}, fee: RM${feeAmount}, commission pool: RM${commissionPool}`);

    return new Response(JSON.stringify({
      success: true,
      transaction_id: paymentTx?.id,
      new_balance: newPayerBalance + cashbackShare,
      cashback: cashbackShare,
      branch_name: branch.branch_name,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Payment error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
