// process-link-payment — pay a hosted payment link from the buyer's NOcap wallet
// POST { link_id, pin }
// Returns { success, new_balance, transaction_id }
//
// Flow:
//   1. Verify JWT (buyer auth)
//   2. Rate-limit (5 req/min per user)
//   3. Load & validate payment link (active, not expired, not self-pay)
//   4. Verify buyer PIN with lockout
//   5. Idempotency guard (prevent double-charge)
//   6. debit_wallet  → buyer member wallet
//   7. credit_wallet → merchant member wallet (or branch wallet if branch_id set)
//   8. Insert transaction rows (debit + credit)
//   9. Mark link paid + store transaction_id
//  10. Dispatch webhook payment_link.paid

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";

const MAX_PIN_ATTEMPTS = 5;
const PIN_LOCKOUT_MINUTES = 15;
const PLATFORM_FEE_RATE = 0.015; // 1.5%

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function hashPin(pin: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(pin + salt);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return encodeBase64(buf);
}

async function verifyPin(pin: string, stored: string): Promise<boolean> {
  if (!stored.includes(":")) return pin === stored;
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  return (await hashPin(pin, salt)) === hash;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Not authenticated" }, 401);

  // 1. Identify buyer
  const anonClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
    error: userErr,
  } = await anonClient.auth.getUser();
  if (userErr || !user) return json({ error: "Invalid token" }, 401);
  const buyerId = user.id;

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    // 2. Rate limit
    const { data: allowed } = await supabase.rpc("check_rate_limit", {
      p_identifier: buyerId,
      p_endpoint: "process-link-payment",
      p_max_requests: 5,
      p_window_seconds: 60,
    });
    if (!allowed)
      return json({ error: "Too many requests. Wait a moment." }, 429);

    const { link_id, pin } = await req.json();
    if (!link_id || !pin)
      return json({ error: "link_id and pin are required" }, 400);

    // 3. Load + validate payment link
    const { data: link, error: linkErr } = await supabase
      .from("payment_links")
      .select(
        "id, amount, currency, status, expires_at, merchant_user_id, branch_id, description, app_id, metadata"
      )
      .eq("id", link_id)
      .maybeSingle();

    if (linkErr || !link) return json({ error: "Payment link not found" }, 404);
    if (link.status !== "active")
      return json({ error: `Payment link is ${link.status}` }, 400);
    if (new Date(link.expires_at) < new Date()) {
      await supabase
        .from("payment_links")
        .update({ status: "expired" })
        .eq("id", link_id);
      return json({ error: "Payment link has expired" }, 400);
    }
    if (link.merchant_user_id === buyerId) {
      return json({ error: "Cannot pay your own payment link" }, 400);
    }

    const amount = Number(link.amount);
    if (isNaN(amount) || amount <= 0)
      return json({ error: "Invalid link amount" }, 400);

    // 4. Verify PIN + lockout
    const { data: profile } = await supabase
      .from("profiles")
      .select("pin_hash, pin_attempts, pin_locked_until, has_pin")
      .eq("user_id", buyerId)
      .single();

    if (!profile?.has_pin || !profile.pin_hash) {
      return json({ error: "Please set a PIN before making payments" }, 400);
    }
    if (
      profile.pin_locked_until &&
      new Date(profile.pin_locked_until) > new Date()
    ) {
      return json(
        {
          error: `PIN locked. Try again after ${new Date(
            profile.pin_locked_until
          ).toLocaleTimeString()}`,
        },
        403
      );
    }

    const pinOk = await verifyPin(pin, profile.pin_hash);
    if (!pinOk) {
      const attempts = (profile.pin_attempts ?? 0) + 1;
      const locked = attempts >= MAX_PIN_ATTEMPTS;
      await supabase
        .from("profiles")
        .update({
          pin_attempts: attempts,
          pin_locked_until: locked
            ? new Date(Date.now() + PIN_LOCKOUT_MINUTES * 60_000).toISOString()
            : null,
        })
        .eq("user_id", buyerId);
      return json(
        {
          error: locked
            ? `Too many wrong PINs. Account locked for ${PIN_LOCKOUT_MINUTES} minutes.`
            : `Wrong PIN. ${MAX_PIN_ATTEMPTS - attempts} attempt(s) remaining.`,
        },
        403
      );
    }

    // Reset PIN attempts on success
    await supabase
      .from("profiles")
      .update({ pin_attempts: 0, pin_locked_until: null })
      .eq("user_id", buyerId);

    // 5. Idempotency — prevent concurrent duplicate payments
    const idempKey = `link:${link_id}:buyer:${buyerId}`;
    const { data: existing } = await supabase
      .from("transactions")
      .select("id")
      .eq("idempotency_key", idempKey)
      .maybeSingle();
    if (existing) return json({ error: "Payment already processed" }, 409);

    // 6. Debit buyer wallet
    const { data: newBalance, error: debitErr } = await supabase.rpc(
      "debit_wallet",
      {
        p_user_id: buyerId,
        p_wallet_type: "member",
        p_amount: amount,
      }
    );
    if (debitErr) {
      const msg = debitErr.message ?? "";
      if (msg.includes("Insufficient"))
        return json({ error: "Insufficient balance" }, 400);
      throw debitErr;
    }

    // 7. Credit merchant wallet
    const feeAmount = Math.round(amount * PLATFORM_FEE_RATE * 100) / 100;
    const merchantCredit = Math.round((amount - feeAmount) * 100) / 100;

    if (link.branch_id) {
      // Branch-tied link: credit branch wallet
      const { error: bCreditErr } = await supabase.rpc("credit_wallet", {
        p_user_id: link.merchant_user_id,
        p_wallet_type: "branch",
        p_amount: merchantCredit,
        p_branch_id: link.branch_id,
      });
      if (bCreditErr) {
        // Rollback buyer debit
        await supabase.rpc("credit_wallet", {
          p_user_id: buyerId,
          p_wallet_type: "member",
          p_amount: amount,
        });
        throw bCreditErr;
      }
      await supabase.rpc("increment_branch_balance", {
        p_branch_id: link.branch_id,
        p_amount: merchantCredit,
      });
    } else {
      // Standalone link: credit merchant member wallet
      const { error: mCreditErr } = await supabase.rpc("credit_wallet", {
        p_user_id: link.merchant_user_id,
        p_wallet_type: "member",
        p_amount: merchantCredit,
      });
      if (mCreditErr) {
        await supabase.rpc("credit_wallet", {
          p_user_id: buyerId,
          p_wallet_type: "member",
          p_amount: amount,
        });
        throw mCreditErr;
      }
    }

    // Credit platform fee to admin wallet
    const { data: adminRole } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin")
      .limit(1)
      .maybeSingle();
    if (adminRole) {
      await supabase
        .rpc("credit_wallet", {
          p_user_id: adminRole.user_id,
          p_wallet_type: "admin",
          p_amount: feeAmount,
        })
        .catch(() => {
          /* best-effort */
        });
    }

    // 8. Insert transactions
    const txRef = crypto.randomUUID();
    const now = new Date().toISOString();

    const { data: debitTx } = await supabase
      .from("transactions")
      .insert({
        user_id: buyerId,
        type: "payment",
        amount: -amount,
        status: "completed",
        reference_id: link_id,
        reference_type: "payment_link",
        description: link.description ?? "Payment link",
        idempotency_key: idempKey,
        metadata: {
          link_id,
          merchant_user_id: link.merchant_user_id,
          ref: txRef,
        },
        created_at: now,
      })
      .select("id")
      .single();

    await supabase.from("transactions").insert({
      user_id: link.merchant_user_id,
      type: "payment_received",
      amount: merchantCredit,
      status: "completed",
      reference_id: link_id,
      reference_type: "payment_link",
      description: link.description ?? "Payment received",
      metadata: { link_id, buyer_id: buyerId, fee: feeAmount, ref: txRef },
      created_at: now,
    });

    // 9. Mark link paid
    await supabase
      .from("payment_links")
      .update({
        status: "paid",
        paid_at: now,
        transaction_id: debitTx?.id ?? null,
      })
      .eq("id", link_id);

    // 10. Webhook
    try {
      const { data: appRow } = await supabase
        .from("api_applications")
        .select("id, api_secret_hash, webhook_url, webhook_subscriptions")
        .eq("id", link.app_id)
        .eq("is_active", true)
        .maybeSingle();

      if (appRow?.webhook_url) {
        const payload = {
          event: "payment_link.paid",
          data: {
            link_id,
            amount,
            currency: link.currency,
            buyer_id: buyerId,
            merchant_credit: merchantCredit,
            fee: feeAmount,
            transaction_id: debitTx?.id,
            paid_at: now,
          },
        };
        const body = JSON.stringify(payload);
        const key = await crypto.subtle.importKey(
          "raw",
          new TextEncoder().encode(appRow.api_secret_hash),
          { name: "HMAC", hash: "SHA-256" },
          false,
          ["sign"]
        );
        const sig = await crypto.subtle.sign(
          "HMAC",
          key,
          new TextEncoder().encode(body)
        );
        const sigHex = Array.from(new Uint8Array(sig))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        await fetch(appRow.webhook_url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Webhook-Signature": sigHex,
            "X-Webhook-Event": "payment_link.paid",
          },
          body,
        }).catch(() => {
          /* best-effort */
        });
      }
    } catch (_) {
      /* webhook failure must not block the response */
    }

    return json({
      success: true,
      new_balance: Number(newBalance),
      transaction_id: debitTx?.id,
      merchant_credit: merchantCredit,
      fee: feeAmount,
    });
  } catch (e) {
    console.error("process-link-payment error:", e);
    return json({ error: "Payment failed. Please try again." }, 500);
  }
});
