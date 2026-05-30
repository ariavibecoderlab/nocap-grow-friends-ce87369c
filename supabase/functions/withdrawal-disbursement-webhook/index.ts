// withdrawal-disbursement-webhook
// RaudhahPay callback when a disbursement succeeds or fails.
// POST { reference, status, message? }
//
// Verifies the HMAC-SHA256 signature from X-Signature header,
// then marks the withdrawal as settled or failed.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-signature",
};

async function verifyHmac(
  body: string,
  secret: string,
  signature: string,
): Promise<boolean> {
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const sigBuf = new Uint8Array(
      signature.match(/.{2}/g)!.map((b) => parseInt(b, 16)),
    );
    return await crypto.subtle.verify(
      "HMAC",
      key,
      sigBuf,
      new TextEncoder().encode(body),
    );
  } catch {
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const WEBHOOK_SECRET = Deno.env.get("RAUDHAHPAY_DISBURSEMENT_SECRET");

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const rawBody = await req.text();

    // Verify signature if secret is configured
    if (WEBHOOK_SECRET) {
      const sig =
        req.headers.get("x-signature") ??
        req.headers.get("x-raudhahpay-signature") ??
        "";
      const valid = await verifyHmac(rawBody, WEBHOOK_SECRET, sig);
      if (!valid) {
        console.warn("withdrawal-disbursement-webhook: invalid signature");
        return new Response("Unauthorized", { status: 401 });
      }
    }

    const payload = JSON.parse(rawBody);
    // RaudhahPay callback shape: { reference, status, message, transaction_id? }
    const reference: string = payload.reference ?? payload.ref;
    const status: string = (payload.status ?? "").toLowerCase();
    const providerTxId: string | null =
      payload.transaction_id ?? payload.id ?? null;
    const errorMsg: string | null = payload.message ?? payload.reason ?? null;

    if (!reference) {
      console.error(
        "withdrawal-disbursement-webhook: missing reference in payload",
        payload,
      );
      return new Response("Bad Request", { status: 400 });
    }

    // Find the withdrawal by disbursement_ref
    const { data: wr, error: wrErr } = await supabase
      .from("withdrawal_requests")
      .select(
        "id, user_id, amount, bank_name, bank_account_no, wallet_type, branch_id",
      )
      .eq("disbursement_ref", reference)
      .maybeSingle();

    if (wrErr || !wr) {
      console.error(
        "withdrawal-disbursement-webhook: no withdrawal for ref",
        reference,
      );
      return new Response("Not Found", { status: 404 });
    }

    const now = new Date().toISOString();

    // RaudhahPay success statuses: "success", "completed", "transferred"
    const isSuccess = [
      "success",
      "completed",
      "transferred",
      "settled",
    ].includes(status);
    // RaudhahPay failure statuses: "failed", "rejected", "error", "cancelled"
    const isFailure = ["failed", "rejected", "error", "cancelled"].includes(
      status,
    );

    if (isSuccess) {
      // Mark settled
      await supabase
        .from("withdrawal_requests")
        .update({
          status: "settled",
          disbursement_status: "completed",
          settled_at: now,
          settlement_ref: providerTxId ?? reference,
        })
        .eq("id", wr.id);

      // Notify user
      await supabase.from("notifications").insert({
        user_id: wr.user_id,
        title: "Withdrawal Settled ✅",
        message: `RM ${Number(wr.amount).toFixed(2)} has been transferred to your ${wr.bank_name} account (${wr.bank_account_no}).`,
        type: "success",
        branch_id: wr.wallet_type === "branch" ? wr.branch_id : null,
      });

      console.log(
        `withdrawal-disbursement-webhook: settled ${wr.id} ref=${reference}`,
      );
    } else if (isFailure) {
      // Mark failed — retriable by admin
      await supabase
        .from("withdrawal_requests")
        .update({
          status: "failed",
          disbursement_status: "failed",
          disbursement_error: errorMsg ?? `Provider status: ${status}`,
        })
        .eq("id", wr.id);

      // Notify admin
      const { data: admin } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin")
        .limit(1)
        .maybeSingle();
      if (admin) {
        await supabase.from("notifications").insert({
          user_id: admin.user_id,
          title: "Disbursement failed",
          message: `Withdrawal RM ${Number(wr.amount).toFixed(2)} to ${wr.bank_name} (${wr.bank_account_no}) failed: ${errorMsg ?? status}. Ref: ${reference}`,
          type: "error",
        });
      }

      // Notify user too
      await supabase.from("notifications").insert({
        user_id: wr.user_id,
        title: "Withdrawal Transfer Failed",
        message: `Your withdrawal of RM ${Number(wr.amount).toFixed(2)} could not be transferred. Our team has been notified and will process it manually.`,
        type: "error",
        branch_id: wr.wallet_type === "branch" ? wr.branch_id : null,
      });

      console.log(
        `withdrawal-disbursement-webhook: failed ${wr.id} ref=${reference} reason=${errorMsg}`,
      );
    } else {
      // Pending/processing status update — just sync disbursement_status
      await supabase
        .from("withdrawal_requests")
        .update({
          disbursement_status: status,
        })
        .eq("id", wr.id);
      console.log(
        `withdrawal-disbursement-webhook: status update ${wr.id} → ${status}`,
      );
    }

    return new Response("OK", { status: 200 });
  } catch (e) {
    console.error("withdrawal-disbursement-webhook error:", e);
    return new Response("Internal Error", { status: 500 });
  }
});
