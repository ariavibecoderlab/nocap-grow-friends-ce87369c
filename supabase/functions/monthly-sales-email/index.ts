import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
    const SENDGRID_FROM_EMAIL = Deno.env.get("SENDGRID_FROM_EMAIL");

    if (!SENDGRID_API_KEY) throw new Error("SENDGRID_API_KEY not configured");
    if (!SENDGRID_FROM_EMAIL) throw new Error("SENDGRID_FROM_EMAIL not configured");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: branches, error: branchErr } = await supabase
      .from("merchant_branches")
      .select("id, branch_name, owner_user_id, merchant_user_id, report_frequency")
      .eq("is_active", true)
      .not("owner_user_id", "is", null);

    if (branchErr) throw branchErr;
    if (!branches || branches.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Current month = previous calendar month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const monthEnd = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // Previous month for comparison
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString();
    const prevMonthEnd = monthStart;

    const reportMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const monthLabel = reportMonth.toLocaleDateString("en-MY", {
      month: "long",
      year: "numeric",
      timeZone: "Asia/Kuala_Lumpur",
    });

    // Pre-fetch users
    const { data: usersData, error: userErr } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (userErr) throw userErr;
    const allUsers = usersData?.users || [];

    let sentCount = 0;
    const formatRM = (val: number) => `RM ${val.toFixed(2)}`;

    const changeIndicator = (val: number) =>
      val > 0
        ? `<span style="color: #2dac76;">▲ ${val}%</span>`
        : val < 0
        ? `<span style="color: #e74c3c;">▼ ${Math.abs(val)}%</span>`
        : `<span style="color: #888;">— 0%</span>`;

    for (const branch of branches) {
      // Skip if monthly reports disabled for this branch
      const freq: string[] = (branch as any).report_frequency || ["daily", "weekly", "monthly"];
      if (!freq.includes("monthly")) {
        console.log(`Monthly report disabled for branch ${branch.branch_name}, skipping`);
        continue;
      }

      const ownerUser = allUsers.find((u: any) => u.id === branch.owner_user_id);
      if (!ownerUser?.email) continue;

      const userFilter = `user_id.eq.${branch.owner_user_id},user_id.eq.${branch.merchant_user_id}`;

      // Current month transactions
      const { data: txCurrent, error: txErr } = await supabase
        .from("transactions")
        .select("amount, fee_amount, commission_amount, net_amount, created_at, type")
        .eq("status", "completed")
        .gte("created_at", monthStart)
        .lt("created_at", monthEnd)
        .in("type", ["payment", "commission"])
        .or(userFilter);

      if (txErr) {
        console.error(`Error fetching tx for branch ${branch.id}:`, txErr);
        continue;
      }

      // Previous month for comparison
      const { data: txPrev } = await supabase
        .from("transactions")
        .select("amount, fee_amount, type")
        .eq("status", "completed")
        .gte("created_at", prevMonthStart)
        .lt("created_at", prevMonthEnd)
        .in("type", ["payment", "commission"])
        .or(userFilter);

      const payments = txCurrent?.filter((t) => t.type === "payment") || [];
      const commissions = txCurrent?.filter((t) => t.type === "commission") || [];
      const prevPayments = txPrev?.filter((t) => t.type === "payment") || [];

      const totalSales = payments.reduce((s, t) => s + Number(t.amount), 0);
      const totalFees = payments.reduce((s, t) => s + Number(t.fee_amount || 0), 0);
      const totalCommission = commissions.reduce((s, t) => s + Number(t.amount), 0);
      const netSales = totalSales - totalFees;
      const txCount = payments.length;
      const avgTxValue = txCount > 0 ? totalSales / txCount : 0;

      const prevTotalSales = prevPayments.reduce((s, t) => s + Number(t.amount), 0);
      const prevTxCount = prevPayments.length;

      const salesChangeNum = prevTotalSales > 0
        ? Number(((totalSales - prevTotalSales) / prevTotalSales * 100).toFixed(1))
        : totalSales > 0 ? 100 : 0;
      const txChangeNum = prevTxCount > 0
        ? Number(((txCount - prevTxCount) / prevTxCount * 100).toFixed(1))
        : txCount > 0 ? 100 : 0;

      // Weekly breakdown (up to 5 weeks within the month)
      const mStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const mEnd = new Date(now.getFullYear(), now.getMonth(), 1);
      const daysInMonth = Math.round((mEnd.getTime() - mStart.getTime()) / 86400000);
      const weeks: { label: string; sales: number; count: number }[] = [];

      for (let w = 0; w < Math.ceil(daysInMonth / 7); w++) {
        const wStart = new Date(mStart.getTime() + w * 7 * 86400000);
        const wEnd = new Date(Math.min(wStart.getTime() + 7 * 86400000, mEnd.getTime()));
        const wStartISO = wStart.toISOString();
        const wEndISO = wEnd.toISOString();
        const wPayments = payments.filter(
          (t) => t.created_at >= wStartISO && t.created_at < wEndISO
        );
        const wStartLabel = wStart.toLocaleDateString("en-MY", { day: "numeric", month: "short", timeZone: "Asia/Kuala_Lumpur" });
        const wEndLabel = new Date(wEnd.getTime() - 86400000).toLocaleDateString("en-MY", { day: "numeric", month: "short", timeZone: "Asia/Kuala_Lumpur" });
        weeks.push({
          label: `${wStartLabel} – ${wEndLabel}`,
          sales: wPayments.reduce((s, t) => s + Number(t.amount), 0),
          count: wPayments.length,
        });
      }

      const maxWeekSales = Math.max(...weeks.map((w) => w.sales), 1);

      const weeklyRows = weeks
        .map(
          (w) => `
          <tr>
            <td style="padding: 6px 0; color: #555; font-size: 12px; white-space: nowrap;">${w.label}</td>
            <td style="padding: 6px 8px; width: 40%;">
              <div style="background: #e8f5e9; border-radius: 4px; height: 18px; width: ${Math.max((w.sales / maxWeekSales) * 100, 2)}%;">
                <div style="background: #2dac76; border-radius: 4px; height: 100%; width: 100%;"></div>
              </div>
            </td>
            <td style="padding: 6px 0; text-align: right; font-size: 13px; color: #222; font-weight: 500;">${formatRM(w.sales)}</td>
            <td style="padding: 6px 0; text-align: right; font-size: 12px; color: #888; padding-left: 8px;">${w.count} tx</td>
          </tr>`
        )
        .join("");

      const sgResponse = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SENDGRID_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: ownerUser.email }] }],
          from: { email: SENDGRID_FROM_EMAIL, name: "NOcap" },
          subject: `Monthly Sales Summary — ${branch.branch_name} — ${monthLabel}`,
          content: [
            {
              type: "text/html",
              value: `
              <div style="font-family: sans-serif; max-width: 540px; margin: 0 auto; padding: 24px;">
                <h2 style="color: #2dac76; margin-bottom: 4px;">NOcap</h2>
                <p style="color: #666; font-size: 13px; margin-bottom: 20px;">Monthly Sales Summary</p>

                <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                  <h3 style="margin: 0 0 4px 0; color: #222;">${branch.branch_name}</h3>
                  <p style="margin: 0; color: #888; font-size: 13px;">${monthLabel}</p>
                </div>

                <!-- KPI Cards -->
                <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                  <div style="flex: 1; background: #f0faf4; border-radius: 10px; padding: 14px; text-align: center;">
                    <p style="margin: 0; color: #888; font-size: 10px; text-transform: uppercase;">Gross Sales</p>
                    <p style="margin: 4px 0 2px; font-size: 18px; font-weight: 700; color: #222;">${formatRM(totalSales)}</p>
                    <p style="margin: 0; font-size: 11px;">${changeIndicator(salesChangeNum)} MoM</p>
                  </div>
                  <div style="flex: 1; background: #f0faf4; border-radius: 10px; padding: 14px; text-align: center;">
                    <p style="margin: 0; color: #888; font-size: 10px; text-transform: uppercase;">Transactions</p>
                    <p style="margin: 4px 0 2px; font-size: 18px; font-weight: 700; color: #222;">${txCount}</p>
                    <p style="margin: 0; font-size: 11px;">${changeIndicator(txChangeNum)} MoM</p>
                  </div>
                  <div style="flex: 1; background: #f0faf4; border-radius: 10px; padding: 14px; text-align: center;">
                    <p style="margin: 0; color: #888; font-size: 10px; text-transform: uppercase;">Avg. Value</p>
                    <p style="margin: 4px 0 2px; font-size: 18px; font-weight: 700; color: #222;">${formatRM(avgTxValue)}</p>
                    <p style="margin: 0; font-size: 11px; color: #888;">per transaction</p>
                  </div>
                </div>

                <!-- Summary Table -->
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
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
                    <td style="padding: 12px 0; text-align: right; font-weight: 700; font-size: 18px; color: #2dac76;">${formatRM(netSales)}</td>
                  </tr>
                </table>

                <!-- Weekly Breakdown -->
                <h4 style="margin: 0 0 12px 0; color: #222; font-size: 14px;">Weekly Breakdown</h4>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                  ${weeklyRows}
                </table>

                ${txCount === 0
                  ? '<p style="color: #888; font-size: 13px; text-align: center;">No transactions recorded this month.</p>'
                  : ""}

                <p style="color: #aaa; font-size: 11px; text-align: center; margin-top: 24px;">
                  This is an automated monthly summary from NOcap. Do not reply to this email.
                </p>
              </div>
            `,
            },
          ],
        }),
      });

      if (!sgResponse.ok) {
        const sgError = await sgResponse.text();
        console.error(`SendGrid error for ${ownerUser.email}:`, sgError);
        continue;
      }

      console.log(`Monthly sales email sent to ${ownerUser.email} for branch ${branch.branch_name}`);
      sentCount++;
    }

    return new Response(JSON.stringify({ success: true, sent: sentCount }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Monthly sales email error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
