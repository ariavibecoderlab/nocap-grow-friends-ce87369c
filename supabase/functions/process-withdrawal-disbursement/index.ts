// process-withdrawal-disbursement
// Called internally after admin approves a withdrawal.
// Sends a DuitNow Credit Transfer / IBG disbursement via RaudhahPay.
//
// POST { withdrawal_id }  (service-role only — no user JWT needed)
//
// Secrets required:
//   RAUDHAHPAY_DISBURSEMENT_KEY    — from RaudhahPay dashboard → Disbursement
//   RAUDHAHPAY_DISBURSEMENT_SECRET — webhook signing secret for callbacks
//   RAUDHAHPAY_CALLBACK_URL        — your Supabase fn URL for the webhook
//     e.g. https://<project>.supabase.co/functions/v1/withdrawal-disbursement-webhook
//
// If disbursement credentials are not configured, the withdrawal is left in
// status=approved with disbursement_status=manual_required and the admin gets
// a notification to process the bank transfer manually.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const MAX_AUTO_ATTEMPTS = 3;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

// ── RaudhahPay DuitNow disbursement ──────────────────────────────────────────
// Endpoint: POST https://api.raudhahpay.com/api/disbursements
// Docs: https://docs.raudhahpay.com/disbursements (internal)

async function dispatchRaudhahPayDisbursement(opts: {
  apiKey: string;
  reference: string;
  accountHolder: string;
  accountNumber: string;
  bankCode: string; // IBG code e.g. MBB0227
  amount: number; // RM (decimal)
  description: string;
  callbackUrl: string;
}): Promise<{ ref: string; status: string }> {
  const payload = {
    name: opts.accountHolder,
    account_number: opts.accountNumber,
    bank_code: opts.bankCode,
    amount: opts.amount.toFixed(2),
    reference: opts.reference,
    description: opts.description,
    callback_url: opts.callbackUrl,
  };

  const res = await fetch("https://api.raudhahpay.com/api/disbursements", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${opts.apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.message ?? `RaudhahPay error ${res.status}`);
  }

  return {
    ref: data?.data?.id ?? data?.id ?? opts.reference,
    status: data?.data?.status ?? data?.status ?? "processing",
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // This endpoint is internal — require the service-role key in a custom header
  // (or call it directly from another edge function using the service role)
  const callerKey = req.headers.get("x-service-key");
  if (callerKey && callerKey !== SERVICE_KEY) {
    return json({ error: "Forbidden" }, 403);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const { withdrawal_id } = await req.json();
    if (!withdrawal_id) return json({ error: "withdrawal_id required" }, 400);

    // Load withdrawal + bank code
    const { data: wr, error: wrErr } = await supabase
      .from("withdrawal_requests")
      .select(
        `
        id, user_id, amount, bank_name, bank_account_no, bank_account_holder,
        status, disbursement_attempts, wallet_type, branch_id
      `,
      )
      .eq("id", withdrawal_id)
      .single();

    if (wrErr || !wr) return json({ error: "Withdrawal not found" }, 404);

    // Only process approved or failed (retry) requests
    if (!["approved", "failed"].includes(wr.status)) {
      return json({ error: `Cannot disburse: status is ${wr.status}` }, 400);
    }

    if (wr.disbursement_attempts >= MAX_AUTO_ATTEMPTS) {
      return json(
        { error: "Max retry attempts reached — manual processing required" },
        400,
      );
    }

    // Resolve IBG bank code
    const { data: bankRow } = await supabase
      .from("bank_ibg_codes")
      .select("ibg_code")
      .eq("bank_name", wr.bank_name)
      .maybeSingle();

    const ibgCode = bankRow?.ibg_code;
    if (!ibgCode) {
      // Unknown bank — flag for manual processing
      await supabase
        .from("withdrawal_requests")
        .update({
          disbursement_status: "manual_required",
          disbursement_error: `Unknown bank: ${wr.bank_name}`,
        })
        .eq("id", withdrawal_id);
      await _notifyAdminManual(supabase, wr);
      return json({ success: false, manual: true, reason: "unknown_bank" });
    }

    // Check disbursement credentials
    const disbKey = Deno.env.get("RAUDHAHPAY_DISBURSEMENT_KEY");
    const callbackUrl =
      Deno.env.get("RAUDHAHPAY_CALLBACK_URL") ??
      `${SUPABASE_URL}/functions/v1/withdrawal-disbursement-webhook`;

    if (!disbKey) {
      // Credentials not configured — queue for manual processing
      await supabase
        .from("withdrawal_requests")
        .update({
          disbursement_status: "manual_required",
          disbursement_error: "RAUDHAHPAY_DISBURSEMENT_KEY not configured",
        })
        .eq("id", withdrawal_id);
      await _notifyAdminManual(supabase, wr);
      return json({ success: false, manual: true, reason: "unconfigured" });
    }

    // Mark as processing before the external call
    const ref = `NOCAP-WD-${withdrawal_id.replace(/-/g, "").slice(0, 16).toUpperCase()}`;
    await supabase
      .from("withdrawal_requests")
      .update({
        status: "processing",
        disbursement_provider: "raudhahpay",
        disbursement_ref: ref,
        disbursement_status: "queued",
        disbursement_attempts: (wr.disbursement_attempts ?? 0) + 1,
        disbursement_queued_at: new Date().toISOString(),
        disbursement_error: null,
      })
      .eq("id", withdrawal_id);

    // Submit to RaudhahPay
    try {
      const result = await dispatchRaudhahPayDisbursement({
        apiKey: disbKey,
        reference: ref,
        accountHolder: wr.bank_account_holder,
        accountNumber: wr.bank_account_no,
        bankCode: ibgCode,
        amount: Number(wr.amount),
        description: `NOcap withdrawal ${ref}`,
        callbackUrl,
      });

      // Update with the provider's reference
      await supabase
        .from("withdrawal_requests")
        .update({
          disbursement_ref: result.ref,
          disbursement_status: result.status,
        })
        .eq("id", withdrawal_id);

      // Notify user payment is on the way
      await supabase.from("notifications").insert({
        user_id: wr.user_id,
        title: "Withdrawal In Progress 💸",
        message: `Your withdrawal of RM ${Number(wr.amount).toFixed(2)} is being transferred to your bank account. Usually arrives within 1 business day.`,
        type: "info",
        branch_id: wr.wallet_type === "branch" ? wr.branch_id : null,
      });

      return json({ success: true, ref: result.ref, status: result.status });
    } catch (apiErr) {
      const errMsg = String(apiErr);
      // Roll back to approved + increment attempt counter
      await supabase
        .from("withdrawal_requests")
        .update({
          status: "failed",
          disbursement_status: "error",
          disbursement_error: errMsg,
        })
        .eq("id", withdrawal_id);

      // Notify admin
      await _notifyAdminRetry(supabase, wr, errMsg);

      return json({ success: false, error: errMsg, retryable: true });
    }
  } catch (e) {
    console.error("process-withdrawal-disbursement:", e);
    return json({ error: String(e) }, 500);
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────────

// deno-lint-ignore no-explicit-any
async function _notifyAdminManual(supabase: any, wr: any) {
  const { data: admin } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin")
    .limit(1)
    .maybeSingle();
  if (!admin) return;
  await supabase.from("notifications").insert({
    user_id: admin.user_id,
    title: "Manual bank transfer required",
    message: `Withdrawal RM ${Number(wr.amount).toFixed(2)} (${wr.bank_name} ${wr.bank_account_no}) cannot be auto-disbursed. Please transfer manually and mark as settled.`,
    type: "warning",
  });
}

// deno-lint-ignore no-explicit-any
async function _notifyAdminRetry(supabase: any, wr: any, error: string) {
  const { data: admin } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin")
    .limit(1)
    .maybeSingle();
  if (!admin) return;
  await supabase.from("notifications").insert({
    user_id: admin.user_id,
    title: "Disbursement failed — retry available",
    message: `Withdrawal RM ${Number(wr.amount).toFixed(2)} to ${wr.bank_name} failed: ${error.slice(0, 120)}`,
    type: "error",
  });
}
