import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function sendMerchantEmail(
  to: string,
  subject: string,
  htmlBody: string
) {
  const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
  const SENDGRID_FROM_EMAIL = Deno.env.get("SENDGRID_FROM_EMAIL");
  if (!SENDGRID_API_KEY || !SENDGRID_FROM_EMAIL) {
    console.warn("SendGrid not configured, skipping email");
    return;
  }

  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: SENDGRID_FROM_EMAIL, name: "NOcap" },
      subject,
      content: [{ type: "text/html", value: htmlBody }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("SendGrid error:", err);
  } else {
    console.log(`Email sent to ${to}: ${subject}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify user with anon client
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = user.id;

    // Service role client for admin operations
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Verify admin role
    const { data: isAdmin } = await adminClient.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action } = body;

    let result;

    switch (action) {
      case "approve_merchant": {
        const { applicationId, applicationUserId } = body;
        const { error: updateErr } = await adminClient
          .from("merchant_applications")
          .update({
            status: "approved",
            reviewed_by: userId,
            reviewed_at: new Date().toISOString(),
          })
          .eq("id", applicationId);
        if (updateErr) throw updateErr;

        // Assign merchant role
        await adminClient
          .from("user_roles")
          .upsert(
            { user_id: applicationUserId, role: "merchant" },
            { onConflict: "user_id,role" }
          );

        // Create merchant wallet for the user
        await adminClient
          .from("wallets")
          .upsert(
            { user_id: applicationUserId, wallet_type: "merchant", balance: 0 },
            { onConflict: "user_id,wallet_type,branch_id" }
          );

        // Send approval email
        const { data: appUser } = await adminClient.auth.admin.getUserById(applicationUserId);
        if (appUser?.user?.email) {
          await sendMerchantEmail(
            appUser.user.email,
            "Your NOcap Merchant Application is Approved! 🎉",
            `<div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
              <h2 style="color: #2dac76; margin-bottom: 8px;">NOcap</h2>
              <p style="color: #333;">Great news! Your merchant application has been <strong style="color: #2dac76;">approved</strong>.</p>
              <p style="color: #333;">You can now access your Merchant Dashboard to set up branches, generate QR codes, and start accepting payments.</p>
              <p style="color: #888; font-size: 13px;">Thank you for joining NOcap as a merchant!</p>
            </div>`
          );
        }

        await adminClient.from("notifications").insert({
          user_id: applicationUserId,
          title: "Application Approved! 🎉",
          message: "Your merchant application has been approved. You can now set up branches and start accepting payments.",
          type: "success",
          link: "/merchant",
        });

        result = { success: true };
        break;
      }

      case "reject_merchant": {
        const { applicationId: rejId, reason } = body;
        const { error: rejErr } = await adminClient
          .from("merchant_applications")
          .update({
            status: "rejected",
            rejection_reason: reason,
            reviewed_by: userId,
            reviewed_at: new Date().toISOString(),
          })
          .eq("id", rejId);
        if (rejErr) throw rejErr;

        const { data: rejApp } = await adminClient
          .from("merchant_applications")
          .select("user_id")
          .eq("id", rejId)
          .single();

        if (rejApp) {
          const { data: rejUser } = await adminClient.auth.admin.getUserById(rejApp.user_id);
          if (rejUser?.user?.email) {
            await sendMerchantEmail(
              rejUser.user.email,
              "Update on Your NOcap Merchant Application",
              `<div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
                <h2 style="color: #2dac76; margin-bottom: 8px;">NOcap</h2>
                <p style="color: #333;">We've reviewed your merchant application and unfortunately it was <strong style="color: #e53e3e;">not approved</strong> at this time.</p>
                ${reason ? `<div style="background: #fff5f5; border-left: 3px solid #e53e3e; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
                  <p style="color: #333; margin: 0; font-size: 14px;"><strong>Reason:</strong> ${reason}</p>
                </div>` : ""}
                <p style="color: #333;">You can update your application and re-submit it for review.</p>
                <p style="color: #888; font-size: 13px;">If you have questions, please contact our support team.</p>
              </div>`
            );
          }

          await adminClient.from("notifications").insert({
            user_id: rejApp.user_id,
            title: "Application Not Approved",
            message: reason ? `Reason: ${reason}. You can update and re-submit your application.` : "Your merchant application was not approved. You can update and re-submit.",
            type: "error",
            link: "/merchant/register",
          });
        }

        result = { success: true };
        break;
      }

      case "update_role": {
        const { targetUserId, role, remove } = body;
        if (remove) {
          const { error } = await adminClient
            .from("user_roles")
            .delete()
            .eq("user_id", targetUserId)
            .eq("role", role);
          if (error) throw error;
        } else {
          const { error } = await adminClient
            .from("user_roles")
            .upsert(
              { user_id: targetUserId, role },
              { onConflict: "user_id,role" }
            );
          if (error) throw error;
        }
        result = { success: true };
        break;
      }

      case "update_setting": {
        const { settingId, value } = body;
        const { error } = await adminClient
          .from("system_settings")
          .update({ value, updated_by: userId })
          .eq("id", settingId);
        if (error) throw error;
        result = { success: true };
        break;
      }

      case "create_setting": {
        const { key, value: val, description } = body;
        const { error } = await adminClient
          .from("system_settings")
          .insert({ key, value: val, description, updated_by: userId });
        if (error) throw error;
        result = { success: true };
        break;
      }

      case "approve_withdrawal": {
        const { withdrawalId, withdrawalUserId, amount: wdAmount, walletType } = body;
        const wType = walletType || 'member';

        // Check the correct wallet based on wallet_type
        const walletQuery = adminClient
          .from("wallets")
          .select("balance")
          .eq("user_id", withdrawalUserId)
          .eq("wallet_type", wType);
        
        // For branch wallets we also need branch_id from the withdrawal request
        let branchId: string | null = null;
        if (wType === 'branch') {
          const { data: wdReq } = await adminClient
            .from("withdrawal_requests")
            .select("branch_id")
            .eq("id", withdrawalId)
            .single();
          branchId = wdReq?.branch_id || null;
          if (branchId) walletQuery.eq("branch_id", branchId);
        }

        const { data: walletData, error: walletErr } = await walletQuery.single();
        if (walletErr || !walletData) throw new Error("Wallet not found");
        if (Number(walletData.balance) < Number(wdAmount)) throw new Error("Insufficient balance");

        // Deduct balance from the specific wallet
        const deductQuery = adminClient
          .from("wallets")
          .update({ balance: Number(walletData.balance) - Number(wdAmount) })
          .eq("user_id", withdrawalUserId)
          .eq("wallet_type", wType);
        if (wType === 'branch' && branchId) deductQuery.eq("branch_id", branchId);
        const { error: deductErr } = await deductQuery;
        if (deductErr) throw deductErr;

        // Also update merchant_branches.balance for branch withdrawals
        if (wType === 'branch' && branchId) {
          const { data: branchRow } = await adminClient
            .from("merchant_branches")
            .select("balance")
            .eq("id", branchId)
            .single();
          if (branchRow) {
            await adminClient
              .from("merchant_branches")
              .update({ balance: Number(branchRow.balance) - Number(wdAmount) })
              .eq("id", branchId);
          }
        }

        // Update request status
        const { error: wdUpdateErr } = await adminClient
          .from("withdrawal_requests")
          .update({ status: "approved", reviewed_by: userId, reviewed_at: new Date().toISOString() })
          .eq("id", withdrawalId);
        if (wdUpdateErr) throw wdUpdateErr;

        // Create transaction record
        const walletLabel = wType === 'member' ? 'Member' : wType === 'merchant' ? 'Merchant' : 'Branch';
        await adminClient.from("transactions").insert({
          user_id: withdrawalUserId,
          type: "withdrawal",
          amount: Number(wdAmount),
          net_amount: Number(wdAmount),
          status: "completed",
          description: `${walletLabel} wallet withdrawal to bank account`,
        });

        // Notify user
        await adminClient.from("notifications").insert({
          user_id: withdrawalUserId,
          title: "Withdrawal Approved ✅",
          message: `Your ${walletLabel.toLowerCase()} withdrawal of RM ${Number(wdAmount).toFixed(2)} has been approved and will be transferred to your bank account.`,
          type: "success",
          branch_id: wType === 'branch' ? branchId : null,
        });

        // Send email
        const { data: wdUser } = await adminClient.auth.admin.getUserById(withdrawalUserId);
        if (wdUser?.user?.email) {
          await sendMerchantEmail(
            wdUser.user.email,
            "Your NOcap Withdrawal Has Been Approved ✅",
            `<div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
              <h2 style="color: #2dac76;">NOcap</h2>
              <p>Your ${walletLabel.toLowerCase()} withdrawal of <strong>RM ${Number(wdAmount).toFixed(2)}</strong> has been approved and will be transferred to your bank account.</p>
              <p style="color: #888; font-size: 13px;">Thank you for using NOcap!</p>
            </div>`
          );
        }

        result = { success: true };
        break;
      }

      case "reject_withdrawal": {
        const { withdrawalId: rejWdId, reason: wdReason } = body;
        const { error: rejWdErr } = await adminClient
          .from("withdrawal_requests")
          .update({ status: "rejected", rejection_reason: wdReason || null, reviewed_by: userId, reviewed_at: new Date().toISOString() })
          .eq("id", rejWdId);
        if (rejWdErr) throw rejWdErr;

        const { data: rejWdReq } = await adminClient
          .from("withdrawal_requests")
          .select("user_id, amount")
          .eq("id", rejWdId)
          .single();

        if (rejWdReq) {
          // Get branch_id for the rejection notification
          const { data: rejWdFull } = await adminClient
            .from("withdrawal_requests")
            .select("branch_id, wallet_type")
            .eq("id", rejWdId)
            .single();

          await adminClient.from("notifications").insert({
            user_id: rejWdReq.user_id,
            title: "Withdrawal Rejected",
            message: wdReason ? `Reason: ${wdReason}` : "Your withdrawal request was not approved.",
            type: "error",
            branch_id: rejWdFull?.wallet_type === 'branch' ? rejWdFull.branch_id : null,
          });
        }

        result = { success: true };
        break;
      }

      case "update_merchant_min_withdrawal": {
        const { applicationId: mwAppId, minAmount } = body;
        const { error: mwErr } = await adminClient
          .from("merchant_applications")
          .update({ min_withdrawal_amount: minAmount })
          .eq("id", mwAppId);
        if (mwErr) throw mwErr;
        result = { success: true };
        break;
      }

      case "assign_branch_owner": {
        break;
      }

      // Legacy: approve_branch_withdrawal now handled by approve_withdrawal with wallet_type
      case "approve_branch_withdrawal": {
        const { withdrawalId: bwId, branchId: bwBranchId, withdrawalUserId: bwUserId, amount: bwAmount } = body;

        // Deduct from branch wallet in wallets table
        const { data: branchWallet, error: bwErr } = await adminClient
          .from("wallets")
          .select("balance")
          .eq("wallet_type", "branch")
          .eq("branch_id", bwBranchId)
          .single();
        if (bwErr || !branchWallet) throw new Error("Branch wallet not found");
        if (Number(branchWallet.balance) < Number(bwAmount)) throw new Error("Insufficient branch balance");

        await adminClient
          .from("wallets")
          .update({ balance: Number(branchWallet.balance) - Number(bwAmount) })
          .eq("wallet_type", "branch")
          .eq("branch_id", bwBranchId);

        // Also update merchant_branches.balance
        const { data: branchData } = await adminClient
          .from("merchant_branches")
          .select("balance")
          .eq("id", bwBranchId)
          .single();
        if (branchData) {
          await adminClient
            .from("merchant_branches")
            .update({ balance: Number(branchData.balance) - Number(bwAmount) })
            .eq("id", bwBranchId);
        }

        // Credit branch owner's MEMBER wallet
        const { data: ownerWallet } = await adminClient
          .from("wallets")
          .select("balance")
          .eq("user_id", bwUserId)
          .eq("wallet_type", "member")
          .single();
        if (ownerWallet) {
          await adminClient
            .from("wallets")
            .update({ balance: Number(ownerWallet.balance) + Number(bwAmount) })
            .eq("user_id", bwUserId)
            .eq("wallet_type", "member");
        }

        // Update request status
        await adminClient
          .from("withdrawal_requests")
          .update({ status: "approved", reviewed_by: userId, reviewed_at: new Date().toISOString() })
          .eq("id", bwId);

        // Create transaction record
        await adminClient.from("transactions").insert({
          user_id: bwUserId,
          type: "withdrawal",
          amount: Number(bwAmount),
          net_amount: Number(bwAmount),
          status: "completed",
          description: "Branch withdrawal to member wallet",
        });

        // Notify branch owner
        await adminClient.from("notifications").insert({
          user_id: bwUserId,
          title: "Branch Withdrawal Approved ✅",
          message: `Your branch withdrawal of RM ${Number(bwAmount).toFixed(2)} has been approved and credited to your member wallet.`,
          type: "success",
          branch_id: bwBranchId,
        });

        result = { success: true };
        break;
      }

      case "update_branch_commission": {
        const { branchId: bcId, commissionPercent } = body;
        const { error: bcErr } = await adminClient
          .from("merchant_branches")
          .update({ commission_percent: Number(commissionPercent) })
          .eq("id", bcId);
        if (bcErr) throw bcErr;
        result = { success: true };
        break;
      }

      default:
        return new Response(JSON.stringify({ error: "Unknown action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
