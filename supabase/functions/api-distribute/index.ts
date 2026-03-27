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

async function hmacSign(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const startTime = Date.now();
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // --- Auth: x-api-key / x-api-secret ---
    const apiKey = req.headers.get('x-api-key');
    const apiSecret = req.headers.get('x-api-secret');

    if (!apiKey || !apiSecret) {
      return new Response(JSON.stringify({ error: 'Missing API credentials. Provide x-api-key and x-api-secret headers.' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: app } = await supabase
      .from('api_applications')
      .select('id, merchant_user_id, is_active, api_secret_hash, webhook_url, is_sandbox')
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

    // --- Rate limit ---
    const { data: allowed } = await supabase.rpc('check_rate_limit', {
      p_identifier: apiKey, p_endpoint: 'api-distribute', p_max_requests: 60, p_window_seconds: 60,
    });
    if (!allowed) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Max 60 requests per minute.' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' },
      });
    }

    // --- Parse body ---
    const { branch_id, member_referral_code, user_id, amount, reference } = await req.json();

    if (!branch_id) {
      return new Response(JSON.stringify({ error: 'branch_id is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!member_referral_code && !user_id) {
      return new Response(JSON.stringify({ error: 'member_referral_code or user_id is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!amount || typeof amount !== 'number' || amount < 0.01 || amount > 500000) {
      return new Response(JSON.stringify({ error: 'amount must be between 0.01 and 500,000' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- Idempotency check ---
    if (reference) {
      const ikey = `dist:${app.id}:${reference}`;
      const { data: existing } = await supabase
        .from('transactions')
        .select('id')
        .eq('idempotency_key', ikey)
        .maybeSingle();
      if (existing) {
        return new Response(JSON.stringify({ error: 'Duplicate reference', distribution_id: existing.id }), {
          status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // --- Validate branch belongs to this merchant ---
    const { data: branch } = await supabase
      .from('merchant_branches')
      .select('id, merchant_user_id, branch_name, commission_percent, is_active, owner_user_id')
      .eq('id', branch_id)
      .single();

    if (!branch) {
      return new Response(JSON.stringify({ error: 'Branch not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (branch.merchant_user_id !== app.merchant_user_id) {
      return new Response(JSON.stringify({ error: 'Branch does not belong to this merchant' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!branch.is_active) {
      return new Response(JSON.stringify({ error: 'Branch is not active' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- Resolve member ---
    let memberId: string | null = null;
    if (user_id) {
      memberId = user_id;
    } else if (member_referral_code) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('referral_code', member_referral_code.toUpperCase())
        .single();
      if (!profile) {
        return new Response(JSON.stringify({ error: 'Member not found with this referral code' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      memberId = profile.user_id;
    }

    if (!memberId) {
      return new Response(JSON.stringify({ error: 'Could not resolve member' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- Calculate commission pool ---
    const commissionPercent = Number(branch.commission_percent);
    const commissionPool = Math.round(amount * commissionPercent) / 100;
    const baseShare = Math.round((commissionPool / 6) * 100) / 100;
    const cashbackShare = commissionPool > 0 ? Math.max(0.01, baseShare) : 0;
    const tierShare = baseShare;

    const branchIncomeUserId = branch.owner_user_id || branch.merchant_user_id;

    // --- Debit branch wallet (allow negative) ---
    // Only debit the actual amount distributed, not the full pool upfront.
    // We'll track total debited as we go.
    let totalDebited = 0;

    // --- Create parent distribution transaction ---
    const ikey = reference ? `dist:${app.id}:${reference}` : `dist:${app.id}:${branch_id}:${memberId}:${amount}:${Math.floor(Date.now() / 10000).toString(36)}`;
    const { data: distTx, error: distTxErr } = await supabase.from('transactions').insert({
      user_id: branchIncomeUserId,
      type: 'distribution' as any,
      amount: 0, // will update after we know actual debited
      status: 'completed',
      description: `Commission distribution for sale RM${amount.toFixed(2)}`,
      metadata: { branch_id, branch_name: branch.branch_name, member_id: memberId, sale_amount: amount, source: 'api-distribute' },
      idempotency_key: ikey,
    }).select('id').single();

    if (distTxErr) {
      if ((distTxErr as any).code === '23505') {
        return new Response(JSON.stringify({ error: 'Duplicate reference' }), {
          status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw distTxErr;
    }

    const distributionId = distTx!.id;
    const tierCommissions: Array<{ tier: number; amount: number; user_id: string }> = [];

    // --- Credit cashback to member ---
    if (cashbackShare > 0) {
      await supabase.rpc('credit_wallet', {
        p_user_id: memberId, p_wallet_type: 'member', p_amount: cashbackShare,
      });
      await supabase.from('transactions').insert({
        user_id: memberId, type: 'cashback', amount: cashbackShare, status: 'completed',
        description: `Cashback from ${branch.branch_name}`, reference_id: distributionId,
        metadata: { source: 'api-distribute', branch_id },
      });
      totalDebited += cashbackShare;
    }

    // --- Tier commissions ---
    const { data: ancestors } = await supabase
      .from('referral_tree')
      .select('ancestor_id, tier')
      .eq('user_id', memberId)
      .order('tier', { ascending: true })
      .limit(5);

    let unclaimedCommission = 0;
    if (ancestors && ancestors.length > 0) {
      for (const ancestor of ancestors) {
        if (ancestor.tier >= 1 && ancestor.tier <= 5 && tierShare > 0) {
          const share = Math.max(0.01, tierShare);
          const { error: commErr } = await supabase.rpc('credit_wallet', {
            p_user_id: ancestor.ancestor_id, p_wallet_type: 'member', p_amount: share,
          });
          if (!commErr) {
            await supabase.from('transactions').insert({
              user_id: ancestor.ancestor_id, type: 'commission', amount: share, status: 'completed',
              description: `Tier ${ancestor.tier} commission from ${branch.branch_name}`,
              reference_id: distributionId,
              metadata: { source: 'api-distribute', branch_id, tier: ancestor.tier },
            });
            tierCommissions.push({ tier: ancestor.tier, amount: share, user_id: ancestor.ancestor_id });
            totalDebited += share;
          } else {
            unclaimedCommission += share;
          }
        }
      }
      // Unclaimed tiers (no ancestor)
      const missingTiers = 5 - ancestors.length;
      if (missingTiers > 0 && tierShare > 0) {
        unclaimedCommission += missingTiers * Math.max(0.01, tierShare);
      }
    } else {
      // No ancestors at all
      if (tierShare > 0) {
        unclaimedCommission = 5 * Math.max(0.01, tierShare);
      }
    }

    // --- Debit branch wallet for total distributed amount (allow negative) ---
    if (totalDebited > 0) {
      const { error: debitErr } = await supabase.rpc('debit_wallet_allow_negative', {
        p_user_id: branchIncomeUserId, p_wallet_type: 'branch', p_amount: totalDebited, p_branch_id: branch_id,
      });
      if (debitErr) {
        // Wallet may not exist - create it with negative balance
        console.log(`Creating branch wallet with negative balance for branch_id=${branch_id}`);
        await supabase.from('wallets').insert({
          user_id: branchIncomeUserId, wallet_type: 'branch', branch_id, balance: -totalDebited,
        });
      }

      // Update merchant_branches.balance
      const { data: branchRow } = await supabase.from('merchant_branches').select('balance').eq('id', branch_id).single();
      if (branchRow) {
        await supabase.from('merchant_branches').update({
          balance: Number(branchRow.balance) - totalDebited,
        }).eq('id', branch_id);
      }
    }

    // --- Update distribution transaction with actual amount ---
    await supabase.from('transactions').update({ amount: totalDebited }).eq('id', distributionId);

    // --- Build response ---
    const breakdown = {
      sale_amount: amount,
      commission_percent: commissionPercent,
      total_pool: commissionPool,
      cashback: cashbackShare,
      tier_commissions: tierCommissions,
      unclaimed_returned: unclaimedCommission,
      branch_debited: totalDebited,
    };

    const resBody = { success: true, distribution_id: distributionId, breakdown };

    // --- Fire webhook ---
    if (app.webhook_url) {
      try {
        const webhookPayload = JSON.stringify({
          event: 'distribution.completed',
          distribution_id: distributionId,
          app_id: app.id,
          branch_id,
          member_id: memberId,
          sale_amount: amount,
          breakdown,
          reference: reference || null,
          is_sandbox: app.is_sandbox,
          timestamp: new Date().toISOString(),
        });
        const signature = await hmacSign(app.api_secret_hash, webhookPayload);
        fetch(app.webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-NoCap-Signature': signature },
          body: webhookPayload,
        }).catch(e => console.error('Webhook delivery error:', e));
      } catch (e) {
        console.error('Webhook error:', e);
      }
    }

    // --- Log request ---
    try {
      await supabase.from('api_request_logs').insert({
        app_id: app.id, endpoint: '/api-distribute', method: 'POST', status_code: 200,
        request_body: { branch_id, member_referral_code, user_id, amount, reference },
        response_body: resBody,
        duration_ms: Date.now() - startTime,
      });
    } catch (_) { /* ignore */ }

    return new Response(JSON.stringify(resBody), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
