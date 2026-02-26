import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TEST_EMAIL = 'azarul@brainybunch.com';
const TOPUP_AMOUNT = 1000;
const RESET_DESCRIPTION = 'Nightly test reset top-up';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const url = new URL(req.url);
    const mode = url.searchParams.get('mode') || 'reverse';

    // Look up test user
    const { data: { users }, error: usersErr } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (usersErr) throw usersErr;
    const testUser = users?.find((u: any) => u.email === TEST_EMAIL);
    if (!testUser) {
      return new Response(JSON.stringify({ error: `Test user ${TEST_EMAIL} not found` }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = testUser.id;

    if (mode === 'reverse') {
      const result = await reverseAllTransactions(supabase, userId);
      return new Response(JSON.stringify({ success: true, ...result }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (mode === 'topup') {
      const result = await topUpWallet(supabase, userId);
      return new Response(JSON.stringify({ success: true, ...result }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (mode === 'report') {
      const result = await sendDailyReport(supabase, userId);
      return new Response(JSON.stringify({ success: true, ...result }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid mode. Use ?mode=reverse|topup|report' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Nightly test reset error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ─────────────────────────────────────────────────────────
// REVERSE MODE
// ─────────────────────────────────────────────────────────
async function reverseAllTransactions(supabase: any, userId: string) {
  // Get today's date range in MYT (UTC+8)
  const now = new Date();
  const mytOffset = 8 * 60 * 60 * 1000;
  const mytNow = new Date(now.getTime() + mytOffset);
  const todayStart = new Date(Date.UTC(mytNow.getUTCFullYear(), mytNow.getUTCMonth(), mytNow.getUTCDate()) - mytOffset).toISOString();

  console.log(`[RESET] Reversing transactions for ${TEST_EMAIL} since ${todayStart}`);

  // Fetch ALL completed transactions for this user today
  const { data: userTxs, error: txErr } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .gte('created_at', todayStart)
    .order('created_at', { ascending: true });

  if (txErr) throw txErr;

  const transactions = userTxs || [];
  let reversedCount = 0;
  const summary = {
    payments: 0, transfers: 0, topups: 0, cashbacks: 0, commissions: 0, refunds: 0,
    totalPaymentAmount: 0, totalTransferAmount: 0, totalCashbackAmount: 0, totalCommissionAmount: 0,
  };

  for (const tx of transactions) {
    // Skip already reversed
    const meta = tx.metadata || {};
    if (meta.nightly_reversed || meta.nightly_reset) continue;
    // Skip our own reset top-ups
    if (tx.description === RESET_DESCRIPTION) continue;

    try {
      switch (tx.type) {
        case 'payment':
          await reversePayment(supabase, tx, userId);
          summary.payments++;
          summary.totalPaymentAmount += Number(tx.amount);
          break;
        case 'transfer_out':
          await reverseTransferOut(supabase, tx, userId);
          summary.transfers++;
          summary.totalTransferAmount += Number(tx.amount);
          break;
        case 'transfer_in':
          await reverseTransferIn(supabase, tx, userId);
          summary.transfers++;
          summary.totalTransferAmount += Number(tx.amount);
          break;
        case 'top_up':
          await reverseTopUp(supabase, tx, userId);
          summary.topups++;
          break;
        case 'cashback':
          await reverseCashbackOrCommission(supabase, tx, userId);
          summary.cashbacks++;
          summary.totalCashbackAmount += Number(tx.amount);
          break;
        case 'commission':
          await reverseCashbackOrCommission(supabase, tx, userId);
          summary.commissions++;
          summary.totalCommissionAmount += Number(tx.amount);
          break;
        case 'refund':
          await reverseRefund(supabase, tx, userId);
          summary.refunds++;
          break;
        default:
          console.log(`[RESET] Skipping unknown type: ${tx.type}`);
          continue;
      }
      reversedCount++;
    } catch (err) {
      console.error(`[RESET] Failed to reverse tx ${tx.id} (${tx.type}):`, err);
    }
  }

  // Also reverse downstream transactions from OTHER users that reference test user's payments
  // (commissions earned by ancestors, admin fees, branch income txs)
  const paymentTxIds = transactions.filter((t: any) => t.type === 'payment').map((t: any) => t.id);
  if (paymentTxIds.length > 0) {
    await reverseDownstreamTransactions(supabase, paymentTxIds);
  }

  console.log(`[RESET] Reversal complete: ${reversedCount} transactions reversed`, summary);
  return { reversed: reversedCount, summary };
}

// ── Reverse a PAYMENT transaction ──
async function reversePayment(supabase: any, tx: any, userId: string) {
  const amount = Number(tx.amount);
  const branchId = tx.metadata?.branch_id;

  // 1. Credit back payer's member wallet
  await adjustWallet(supabase, userId, 'member', amount, null);

  // 2. Debit branch wallet and merchant_branches.balance
  if (branchId) {
    const branchCredit = Number(tx.net_amount || 0) - Number(tx.commission_amount || 0);
    // Actually, let's calculate from the payment flow:
    // branchCredit = netAmount - commissionPool
    // But we need to trace the actual amounts. Safer to find all related txs.
    
    // Find related downstream transactions
    const { data: relatedTxs } = await supabase
      .from('transactions')
      .select('*')
      .eq('reference_id', tx.id)
      .eq('status', 'completed');

    let totalBranchCredit = 0;
    let totalCashback = 0;
    let totalCommissions = 0;
    let totalAdminFee = 0;

    for (const rel of (relatedTxs || [])) {
      const relMeta = rel.metadata || {};
      if (rel.type === 'top_up' && relMeta.branch_id) {
        // Branch owner income transaction
        totalBranchCredit = Number(rel.amount);
      } else if (rel.type === 'cashback' && rel.user_id === userId) {
        totalCashback = Number(rel.amount);
      } else if (rel.type === 'commission' && relMeta.source === 'platform_fee') {
        totalAdminFee = Number(rel.amount);
      } else if (rel.type === 'commission') {
        totalCommissions += Number(rel.amount);
      }
    }

    // Debit branch wallet by the branch credit amount
    if (totalBranchCredit > 0) {
      await adjustWallet(supabase, null, 'branch', -totalBranchCredit, branchId);
      // Also debit merchant_branches.balance
      const { data: branchRow } = await supabase
        .from('merchant_branches')
        .select('balance')
        .eq('id', branchId)
        .single();
      if (branchRow) {
        await supabase.from('merchant_branches')
          .update({ balance: Math.max(0, Number(branchRow.balance) - totalBranchCredit) })
          .eq('id', branchId);
      }
    }

    // Debit cashback from payer
    if (totalCashback > 0) {
      await adjustWallet(supabase, userId, 'member', -totalCashback, null);
    }

    // Debit commissions from each ancestor (handled in reverseDownstreamTransactions)

    // Debit admin fee from admin wallet
    if (totalAdminFee > 0) {
      const { data: adminRole } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin')
        .limit(1)
        .single();
      if (adminRole) {
        await adjustWallet(supabase, adminRole.user_id, 'admin', -totalAdminFee, null);
      }
    }
  }

  // Mark as reversed
  await markReversed(supabase, tx.id);
}

// ── Reverse downstream transactions (commissions, cashback, admin fee, branch income) ──
async function reverseDownstreamTransactions(supabase: any, paymentTxIds: string[]) {
  // Find all transactions that reference any of the test user's payment IDs
  for (const paymentId of paymentTxIds) {
    const { data: relatedTxs } = await supabase
      .from('transactions')
      .select('*')
      .eq('reference_id', paymentId)
      .eq('status', 'completed');

    for (const rel of (relatedTxs || [])) {
      const relMeta = rel.metadata || {};
      if (relMeta.nightly_reversed) continue;

      if (rel.type === 'commission' && relMeta.source !== 'platform_fee') {
        // Tier commission to an ancestor — debit their member wallet
        await adjustWallet(supabase, rel.user_id, 'member', -Number(rel.amount), null);
        await markReversed(supabase, rel.id);
        console.log(`[RESET] Reversed tier commission RM${rel.amount} from user ${rel.user_id}`);
      } else if (rel.type === 'commission' && relMeta.source === 'platform_fee') {
        // Admin fee — already handled in reversePayment
        await markReversed(supabase, rel.id);
      } else if (rel.type === 'top_up' && relMeta.branch_id) {
        // Branch owner income transaction — mark reversed
        await markReversed(supabase, rel.id);
      } else if (rel.type === 'cashback') {
        // Cashback — already handled in reversePayment
        await markReversed(supabase, rel.id);
      }
    }
  }
}

// ── Reverse TRANSFER_OUT ──
async function reverseTransferOut(supabase: any, tx: any, userId: string) {
  const amount = Number(tx.amount);
  // Credit sender back
  await adjustWallet(supabase, userId, 'member', amount, null);

  // Find the corresponding transfer_in via reference_id
  const { data: inTxs } = await supabase
    .from('transactions')
    .select('*')
    .eq('reference_id', tx.id)
    .eq('type', 'transfer_in')
    .eq('status', 'completed');

  for (const inTx of (inTxs || [])) {
    // Debit recipient
    await adjustWallet(supabase, inTx.user_id, 'member', -amount, null);
    await markReversed(supabase, inTx.id);
  }

  await markReversed(supabase, tx.id);
}

// ── Reverse TRANSFER_IN (someone sent TO test user) ──
async function reverseTransferIn(supabase: any, tx: any, userId: string) {
  const amount = Number(tx.amount);
  // Debit test user
  await adjustWallet(supabase, userId, 'member', -amount, null);

  // Find the original transfer_out that this references
  if (tx.reference_id) {
    const { data: outTx } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', tx.reference_id)
      .eq('type', 'transfer_out')
      .single();

    if (outTx && !(outTx.metadata?.nightly_reversed)) {
      // Credit sender back
      await adjustWallet(supabase, outTx.user_id, 'member', amount, null);
      await markReversed(supabase, outTx.id);
    }
  }

  await markReversed(supabase, tx.id);
}

// ── Reverse TOP_UP ──
async function reverseTopUp(supabase: any, tx: any, userId: string) {
  if (tx.description === RESET_DESCRIPTION) return; // skip our own
  await adjustWallet(supabase, userId, 'member', -Number(tx.amount), null);
  await markReversed(supabase, tx.id);
}

// ── Reverse CASHBACK or COMMISSION received by test user ──
async function reverseCashbackOrCommission(supabase: any, tx: any, userId: string) {
  // If this cashback/commission references a payment by the test user,
  // it was already handled in reversePayment. Only reverse if it's from someone else's payment.
  const meta = tx.metadata || {};
  if (meta.nightly_reversed) return;

  // Check if the referenced payment belongs to the test user
  if (tx.reference_id) {
    const { data: refTx } = await supabase
      .from('transactions')
      .select('user_id')
      .eq('id', tx.reference_id)
      .single();

    if (refTx && refTx.user_id === userId) {
      // This cashback/commission is from test user's own payment — already reversed in reversePayment
      return;
    }
  }

  // Commission from someone else's payment — debit test user
  await adjustWallet(supabase, userId, 'member', -Number(tx.amount), null);
  await markReversed(supabase, tx.id);
}

// ── Reverse REFUND received by test user ──
async function reverseRefund(supabase: any, tx: any, userId: string) {
  const amount = Number(tx.amount);
  const branchId = tx.metadata?.branch_id;

  // Debit test user (undo refund credit)
  await adjustWallet(supabase, userId, 'member', -amount, null);

  // Credit back branch wallet
  if (branchId) {
    await adjustWallet(supabase, null, 'branch', amount, branchId);
    const { data: branchRow } = await supabase
      .from('merchant_branches')
      .select('balance')
      .eq('id', branchId)
      .single();
    if (branchRow) {
      await supabase.from('merchant_branches')
        .update({ balance: Number(branchRow.balance) + amount })
        .eq('id', branchId);
    }
  }

  await markReversed(supabase, tx.id);
}

// ─────────────────────────────────────────────────────────
// TOPUP MODE
// ─────────────────────────────────────────────────────────
async function topUpWallet(supabase: any, userId: string) {
  // Set wallet to exactly RM1,000
  const { data: wallet } = await supabase
    .from('wallets')
    .select('id, balance')
    .eq('user_id', userId)
    .eq('wallet_type', 'member')
    .single();

  if (!wallet) {
    // Create wallet if missing
    await supabase.from('wallets').insert({
      user_id: userId,
      wallet_type: 'member',
      balance: TOPUP_AMOUNT,
    });
  } else {
    await supabase.from('wallets')
      .update({ balance: TOPUP_AMOUNT, updated_at: new Date().toISOString() })
      .eq('id', wallet.id);
  }

  // Insert top-up transaction
  await supabase.from('transactions').insert({
    user_id: userId,
    type: 'top_up',
    amount: TOPUP_AMOUNT,
    status: 'completed',
    description: RESET_DESCRIPTION,
    metadata: { nightly_reset: true },
  });

  console.log(`[RESET] Wallet set to RM${TOPUP_AMOUNT} for ${TEST_EMAIL}`);
  return { balance: TOPUP_AMOUNT };
}

// ─────────────────────────────────────────────────────────
// REPORT MODE
// ─────────────────────────────────────────────────────────
async function sendDailyReport(supabase: any, userId: string) {
  const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');
  const SENDGRID_FROM_EMAIL = Deno.env.get('SENDGRID_FROM_EMAIL');
  if (!SENDGRID_API_KEY || !SENDGRID_FROM_EMAIL) throw new Error('SendGrid not configured');

  // Get today's date range in MYT
  const now = new Date();
  const mytOffset = 8 * 60 * 60 * 1000;
  const mytNow = new Date(now.getTime() + mytOffset);
  const todayStart = new Date(Date.UTC(mytNow.getUTCFullYear(), mytNow.getUTCMonth(), mytNow.getUTCDate()) - mytOffset).toISOString();

  // Get all transactions for today (both reversed and the reset top-up)
  const { data: allTxs } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', todayStart)
    .order('created_at', { ascending: true });

  const txs = allTxs || [];

  // Also get downstream transactions (commissions/cashback from test user's payments)
  const paymentIds = txs.filter((t: any) => t.type === 'payment').map((t: any) => t.id);
  let downstreamTxs: any[] = [];
  for (const pid of paymentIds) {
    const { data: related } = await supabase
      .from('transactions')
      .select('*')
      .eq('reference_id', pid)
      .neq('user_id', userId);
    if (related) downstreamTxs = downstreamTxs.concat(related);
  }

  // Get wallet balance
  const { data: wallet } = await supabase
    .from('wallets')
    .select('balance')
    .eq('user_id', userId)
    .eq('wallet_type', 'member')
    .single();

  const balance = wallet ? Number(wallet.balance) : 0;

  // Calculate summary
  const reversed = txs.filter((t: any) => t.metadata?.nightly_reversed);
  const payments = txs.filter((t: any) => t.type === 'payment');
  const transfers = txs.filter((t: any) => t.type === 'transfer_out' || t.type === 'transfer_in');
  const cashbacks = txs.filter((t: any) => t.type === 'cashback');
  const commissions = txs.filter((t: any) => t.type === 'commission');
  const downstreamReversed = downstreamTxs.filter((t: any) => t.metadata?.nightly_reversed);

  const dateStr = mytNow.toLocaleDateString('en-MY', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    timeZone: 'Asia/Kuala_Lumpur',
  });

  const formatRM = (val: number) => `RM ${val.toFixed(2)}`;
  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Kuala_Lumpur' });
  };

  // Build HTML email
  const detailRows = [...txs, ...downstreamTxs]
    .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .map((t: any) => {
      const isReversed = t.metadata?.nightly_reversed;
      const isReset = t.metadata?.nightly_reset;
      const statusLabel = isReversed ? '🔄 Reversed' : isReset ? '✅ Reset Top-up' : '✅ Active';
      const rowColor = isReversed ? '#fff3cd' : isReset ? '#d4edda' : '#ffffff';
      const ownerLabel = t.user_id === userId ? TEST_EMAIL : `Other (${t.user_id.slice(0, 8)}...)`;

      return `
        <tr style="background: ${rowColor};">
          <td style="padding: 8px; border: 1px solid #dee2e6; font-size: 12px;">${formatTime(t.created_at)}</td>
          <td style="padding: 8px; border: 1px solid #dee2e6; font-size: 12px;">${t.type}</td>
          <td style="padding: 8px; border: 1px solid #dee2e6; font-size: 12px; text-align: right;">${formatRM(Number(t.amount))}</td>
          <td style="padding: 8px; border: 1px solid #dee2e6; font-size: 12px;">${t.description || '-'}</td>
          <td style="padding: 8px; border: 1px solid #dee2e6; font-size: 12px;">${ownerLabel}</td>
          <td style="padding: 8px; border: 1px solid #dee2e6; font-size: 12px;">${statusLabel}</td>
        </tr>`;
    }).join('');

  const htmlContent = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 24px; background: #ffffff;">
      <h2 style="color: #2dac76; margin-bottom: 4px;">NOcap — Nightly Test Reset Report</h2>
      <p style="color: #666; font-size: 14px; margin-bottom: 20px;">${dateStr}</p>

      <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <h3 style="margin: 0 0 16px 0; color: #222;">Summary</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #dee2e6;">
            <td style="padding: 10px 0; color: #555;">Test Account</td>
            <td style="padding: 10px 0; text-align: right; font-weight: 600;">${TEST_EMAIL}</td>
          </tr>
          <tr style="border-bottom: 1px solid #dee2e6;">
            <td style="padding: 10px 0; color: #555;">Total Transactions Today</td>
            <td style="padding: 10px 0; text-align: right; font-weight: 600;">${txs.length}</td>
          </tr>
          <tr style="border-bottom: 1px solid #dee2e6;">
            <td style="padding: 10px 0; color: #555;">Transactions Reversed (test user)</td>
            <td style="padding: 10px 0; text-align: right; font-weight: 600; color: #e67e22;">${reversed.length}</td>
          </tr>
          <tr style="border-bottom: 1px solid #dee2e6;">
            <td style="padding: 10px 0; color: #555;">Downstream Reversed (commissions/fees)</td>
            <td style="padding: 10px 0; text-align: right; font-weight: 600; color: #e67e22;">${downstreamReversed.length}</td>
          </tr>
          <tr style="border-bottom: 1px solid #dee2e6;">
            <td style="padding: 10px 0; color: #555;">Payments Reversed</td>
            <td style="padding: 10px 0; text-align: right;">${payments.length} — ${formatRM(payments.reduce((s: number, t: any) => s + Number(t.amount), 0))}</td>
          </tr>
          <tr style="border-bottom: 1px solid #dee2e6;">
            <td style="padding: 10px 0; color: #555;">Transfers Reversed</td>
            <td style="padding: 10px 0; text-align: right;">${transfers.length} — ${formatRM(transfers.reduce((s: number, t: any) => s + Number(t.amount), 0))}</td>
          </tr>
          <tr style="border-bottom: 1px solid #dee2e6;">
            <td style="padding: 10px 0; color: #555;">Cashback Reversed</td>
            <td style="padding: 10px 0; text-align: right;">${cashbacks.length} — ${formatRM(cashbacks.reduce((s: number, t: any) => s + Number(t.amount), 0))}</td>
          </tr>
          <tr style="border-bottom: 1px solid #dee2e6;">
            <td style="padding: 10px 0; color: #555;">Commissions Reversed</td>
            <td style="padding: 10px 0; text-align: right;">${commissions.length} — ${formatRM(commissions.reduce((s: number, t: any) => s + Number(t.amount), 0))}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #222; font-weight: 700;">Final Wallet Balance</td>
            <td style="padding: 10px 0; text-align: right; font-weight: 700; font-size: 18px; color: #2dac76;">${formatRM(balance)}</td>
          </tr>
        </table>
      </div>

      <h3 style="color: #222; margin-bottom: 12px;">Transaction Detail</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
        <thead>
          <tr style="background: #343a40; color: #fff;">
            <th style="padding: 10px 8px; text-align: left;">Time</th>
            <th style="padding: 10px 8px; text-align: left;">Type</th>
            <th style="padding: 10px 8px; text-align: right;">Amount</th>
            <th style="padding: 10px 8px; text-align: left;">Description</th>
            <th style="padding: 10px 8px; text-align: left;">Account</th>
            <th style="padding: 10px 8px; text-align: left;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${detailRows || '<tr><td colspan="6" style="padding: 20px; text-align: center; color: #888;">No transactions today</td></tr>'}
        </tbody>
      </table>

      <p style="color: #aaa; font-size: 11px; text-align: center; margin-top: 24px;">
        This is an automated nightly test reset report from NOcap. Do not reply to this email.
      </p>
    </div>
  `;

  // Send via SendGrid
  const sgResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: TEST_EMAIL }] }],
      from: { email: SENDGRID_FROM_EMAIL, name: 'NOcap Test Reset' },
      subject: `Nightly Test Reset Report — ${dateStr}`,
      content: [{ type: 'text/html', value: htmlContent }],
    }),
  });

  if (!sgResponse.ok) {
    const sgErr = await sgResponse.text();
    console.error('SendGrid error:', sgErr);
    throw new Error(`SendGrid failed: ${sgErr}`);
  }

  console.log(`[RESET] Report emailed to ${TEST_EMAIL}`);
  return { emailed: true, transactionCount: txs.length, downstreamCount: downstreamTxs.length };
}

// ─────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────
async function adjustWallet(supabase: any, userId: string | null, walletType: string, delta: number, branchId: string | null) {
  let query = supabase.from('wallets').select('id, balance').eq('wallet_type', walletType);
  if (branchId) {
    query = query.eq('branch_id', branchId);
  } else if (userId) {
    query = query.eq('user_id', userId);
  } else {
    return;
  }

  const { data: wallet } = await query.single();
  if (!wallet) {
    console.warn(`[RESET] Wallet not found: type=${walletType}, user=${userId}, branch=${branchId}`);
    return;
  }

  const newBalance = Math.max(0, Number(wallet.balance) + delta);
  await supabase.from('wallets')
    .update({ balance: newBalance, updated_at: new Date().toISOString() })
    .eq('id', wallet.id);

  console.log(`[RESET] Wallet ${walletType} (${userId || branchId}): ${delta > 0 ? '+' : ''}${delta} → ${newBalance}`);
}

async function markReversed(supabase: any, txId: string) {
  const { data: tx } = await supabase
    .from('transactions')
    .select('metadata')
    .eq('id', txId)
    .single();

  const existingMeta = tx?.metadata || {};
  await supabase.from('transactions')
    .update({
      metadata: { ...existingMeta, nightly_reversed: true, reversed_at: new Date().toISOString() },
    })
    .eq('id', txId);
}
