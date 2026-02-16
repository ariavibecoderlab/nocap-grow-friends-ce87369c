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
    const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');
    const SENDGRID_FROM_EMAIL = Deno.env.get('SENDGRID_FROM_EMAIL');

    if (!SENDGRID_API_KEY) throw new Error('SENDGRID_API_KEY not configured');
    if (!SENDGRID_FROM_EMAIL) throw new Error('SENDGRID_FROM_EMAIL not configured');

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Get all active branches with their owner
    const { data: branches, error: branchErr } = await supabase
      .from('merchant_branches')
      .select('id, branch_name, owner_user_id, merchant_user_id')
      .eq('is_active', true)
      .not('owner_user_id', 'is', null);

    if (branchErr) throw branchErr;
    if (!branches || branches.length === 0) {
      console.log('No active branches with owners found');
      return new Response(JSON.stringify({ success: true, sent: 0 }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Today's date range (UTC)
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

    let sentCount = 0;

    for (const branch of branches) {
      // Get today's completed payment transactions for this branch
      // Payments to a branch have metadata->branch_id matching
      const { data: transactions, error: txErr } = await supabase
        .from('transactions')
        .select('amount, fee_amount, commission_amount, net_amount, created_at, type')
        .eq('status', 'completed')
        .gte('created_at', todayStart)
        .lt('created_at', todayEnd)
        .in('type', ['payment', 'commission'])
        .or(`user_id.eq.${branch.owner_user_id},user_id.eq.${branch.merchant_user_id}`);

      if (txErr) {
        console.error(`Error fetching transactions for branch ${branch.id}:`, txErr);
        continue;
      }

      const payments = transactions?.filter(t => t.type === 'payment') || [];
      const commissions = transactions?.filter(t => t.type === 'commission') || [];

      const totalSales = payments.reduce((sum, t) => sum + Number(t.amount), 0);
      const totalFees = payments.reduce((sum, t) => sum + Number(t.fee_amount || 0), 0);
      const totalCommission = commissions.reduce((sum, t) => sum + Number(t.amount), 0);
      const txCount = payments.length;

      // Get branch owner's email
      const { data: { users }, error: userErr } = await supabase.auth.admin.listUsers({ perPage: 1000 });
      if (userErr) {
        console.error('Error listing users:', userErr);
        continue;
      }
      const ownerUser = users?.find((u: any) => u.id === branch.owner_user_id);
      if (!ownerUser?.email) {
        console.log(`No email for branch owner ${branch.owner_user_id}`);
        continue;
      }

      const dateStr = now.toLocaleDateString('en-MY', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        timeZone: 'Asia/Kuala_Lumpur'
      });

      const formatRM = (val: number) => `RM ${val.toFixed(2)}`;

      // Send email
      const sgResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SENDGRID_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: ownerUser.email }] }],
          from: { email: SENDGRID_FROM_EMAIL, name: 'NOcap' },
          subject: `Daily Sales Summary — ${branch.branch_name} — ${dateStr}`,
          content: [{
            type: 'text/html',
            value: `
              <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
                <h2 style="color: #2dac76; margin-bottom: 4px;">NOcap</h2>
                <p style="color: #666; font-size: 13px; margin-bottom: 20px;">Daily Sales Summary</p>
                
                <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                  <h3 style="margin: 0 0 4px 0; color: #222;">${branch.branch_name}</h3>
                  <p style="margin: 0; color: #888; font-size: 13px;">${dateStr}</p>
                </div>

                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                  <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 12px 0; color: #555;">Total Transactions</td>
                    <td style="padding: 12px 0; text-align: right; font-weight: 600; color: #222;">${txCount}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 12px 0; color: #555;">Gross Sales</td>
                    <td style="padding: 12px 0; text-align: right; font-weight: 600; color: #222;">${formatRM(totalSales)}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 12px 0; color: #555;">Platform Fees</td>
                    <td style="padding: 12px 0; text-align: right; color: #e74c3c;">${formatRM(totalFees)}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 12px 0; color: #555;">Commission Earned</td>
                    <td style="padding: 12px 0; text-align: right; color: #2dac76; font-weight: 600;">${formatRM(totalCommission)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0; color: #222; font-weight: 700;">Net Sales</td>
                    <td style="padding: 12px 0; text-align: right; font-weight: 700; font-size: 18px; color: #2dac76;">${formatRM(totalSales - totalFees)}</td>
                  </tr>
                </table>

                ${txCount === 0 
                  ? '<p style="color: #888; font-size: 13px; text-align: center;">No transactions recorded today.</p>' 
                  : ''}

                <p style="color: #aaa; font-size: 11px; text-align: center; margin-top: 24px;">
                  This is an automated daily summary from NOcap. Do not reply to this email.
                </p>
              </div>
            `,
          }],
        }),
      });

      if (!sgResponse.ok) {
        const sgError = await sgResponse.text();
        console.error(`SendGrid error for ${ownerUser.email}:`, sgError);
        continue;
      }

      console.log(`Daily sales email sent to ${ownerUser.email} for branch ${branch.branch_name}`);
      sentCount++;
    }

    return new Response(JSON.stringify({ success: true, sent: sentCount }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Daily sales email error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
