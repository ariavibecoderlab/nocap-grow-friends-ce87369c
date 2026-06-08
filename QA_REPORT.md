# NOcap QA Report
**Scope:** Last 20 days of commits (6 commits)
**Date:** 2026-06-06
**Reviewed by:** Claude (Cowork)

---

## Summary

| Area | Status | Severity |
|---|---|---|
| Withdrawal Disbursement | ⚠️ Issues found | HIGH |
| Payment Links (process-link-payment) | ✅ Solid | LOW |
| Live Shopping (SellerLive / LiveViewer) | ✅ Minor only | LOW |
| Marketplace / Frontend (Phase 1–6) | ⚠️ Issues found | MEDIUM |
| TypeScript type safety | ⚠️ Issues found | MEDIUM |
| ESLint / Code quality | ❌ Failing | MEDIUM |

---

## 🔴 HIGH — Security: Withdrawal Disbursement Auth Check is Bypassable

**File:** `supabase/functions/process-withdrawal-disbursement/index.ts` (lines 88–91)

```ts
const callerKey = req.headers.get("x-service-key");
if (callerKey && callerKey !== SERVICE_KEY) {   // ← BUG: only blocks WRONG keys
  return json({ error: "Forbidden" }, 403);
}
```

**Problem:** The `if (callerKey && ...)` condition only rejects requests that send a *wrong* key. A request that sends **no `x-service-key` header at all** passes straight through. This endpoint triggers real bank transfers — any anonymous caller on the internet can hit it and trigger a disbursement for any `withdrawal_id`.

**Fix:**
```ts
const callerKey = req.headers.get("x-service-key");
if (!callerKey || callerKey !== SERVICE_KEY) {   // reject missing OR wrong
  return json({ error: "Forbidden" }, 403);
}
```

---

## 🔴 HIGH — Financial: Withdrawal Debit Not Reversed on Disbursement Failure

**File:** `supabase/functions/process-withdrawal-disbursement/index.ts` (lines 214–228)

When the RaudhahPay API call fails, the function rolls status back to `failed` but does **not re-credit the user's wallet**. The wallet was debited when the withdrawal was originally requested (via `request_withdrawal` RPC), so this may be acceptable depending on that RPC's design — but it needs explicit verification.

**Action required:** Confirm `request_withdrawal` debits the wallet at request time vs. at approval time. If debited at approval time in `admin-actions`, verify the admin approve path also handles rollback on failure.

---

## 🟡 MEDIUM — Logic Bug: Ternary Used as Statement in Bulk Actions

**File:** `src/components/admin/WithdrawalApprovals.tsx` (lines 349, 486, 504, 524, 581)

```ts
// ESLint: no-unused-expressions
error ? failed++ : success++;          // line 486, 504, 524
next.has(id) ? next.delete(id) : next.add(id);   // line 349
selected.size === filtered.length
  ? setSelected(new Set())
  : setSelected(new Set(filtered.map((r) => r.id)));   // line 581
```

The first three are valid but ESLint flags ternaries-as-statements by default. The last two are fine semantically but ESLint still flags them. These should be converted to `if/else` to be explicit and pass the linter.

**Fix (example):**
```ts
// Instead of:
error ? failed++ : success++;
// Use:
if (error) { failed++; } else { success++; }
```

---

## 🟡 MEDIUM — Race Condition: Payment Link Idempotency Window

**File:** `supabase/functions/process-link-payment/index.ts` (lines 169–176)

```ts
const { data: existing } = await supabase
  .from("transactions")
  .select("id")
  .eq("idempotency_key", idempKey)
  .maybeSingle();
if (existing) return json({ error: "Payment already processed" }, 409);

// ← GAP: another request can slip through here before debit_wallet runs
const { data: newBalance, error: debitErr } = await supabase.rpc("debit_wallet", ...);
```

There's a TOCTOU (time-of-check/time-of-use) gap between the idempotency check and the wallet debit. Two simultaneous requests with the same `link_id + buyer_id` can both pass the check before either inserts the transaction row.

**Fix:** Add a `UNIQUE` constraint on `transactions.idempotency_key` in the DB. The insert at step 8 will then fail with a unique violation for the second concurrent request, and you catch that error before returning 500.

---

## 🟡 MEDIUM — Missing: Webhook HMAC Uses Hash of Secret, Not Secret Itself

**File:** `supabase/functions/process-link-payment/index.ts` (lines 326–333)

```ts
const key = await crypto.subtle.importKey(
  "raw",
  new TextEncoder().encode(appRow.api_secret_hash),  // ← using the HASH as the key
  ...
```

The webhook is signed using `api_secret_hash` (which is presumably already a hashed value) rather than the raw secret. If the stored column is indeed a hash of the API secret (not the secret itself), webhook recipients won't be able to verify the signature correctly. Verify that `api_secret_hash` stores the raw secret (or rename the column to avoid confusion).

---

## 🟡 MEDIUM — ESLint: 233 Errors, 71 Warnings in src/

Running `eslint src/` reports **304 problems** (233 errors, 71 warnings). While most are `no-explicit-any` (expected given the 10 known `as any` casts), there are real issues in the mix:

| Error type | Count | Risk |
|---|---|---|
| `no-explicit-any` | ~200 | Low — mostly intentional casts |
| `no-unused-expressions` | 11 | Medium — logic may not execute as intended |
| `no-empty` (empty catch blocks) | 5 | Medium — silent failures |
| `prefer-const` | 4 | Low |
| `no-empty-object-type` | 2 | Low |

**Files with empty catch blocks (silent failures):**
- `src/pages/TopUp.tsx` line 111
- `src/components/...` — 4 other locations

Empty `catch {}` blocks swallow errors silently. At minimum add `console.error` so failures surface in logs.

---

## 🟡 MEDIUM — TypeScript: Vitest Cannot Run (native module issue)

Running `npm run test` fails with a Rollup native module error:

```
Error: Cannot find module @rollup/rollup-linux-arm64-musl
```

This is a platform mismatch — `node_modules` was installed on a different architecture. **Tests cannot currently be run in the sandbox.** Run `npm install` fresh on your Mac and confirm `npm run test` passes locally before each deploy.

---

## 🟢 LOW — Withdrawal: `settled_at` Column Missing from Migration

**File:** `supabase/migrations/..._withdrawal_disbursement_tracking.sql`

The `process-withdrawal-disbursement-webhook` sets `settled_at` on success, but the migration does not `ADD COLUMN settled_at`. Check whether this column already exists from an earlier migration — if not, the webhook will silently fail to write `settled_at`.

**Action:** Run `\d withdrawal_requests` in Supabase SQL editor and confirm `settled_at` exists.

---

## 🟢 LOW — Live Shopping: `as any` Casts on Pinned Products

**Files:** `src/pages/SellerLive.tsx` (lines 132, 149), `src/pages/LiveViewer.tsx` (line 337)

```ts
setPinnedProducts(data as any);
(data as any[]).map((p) => ({ ... }))
```

The `marketplace_products` type from Supabase types should cover this. Replace with the proper generated type to get compile-time safety on the live product data shown to viewers.

---

## 🟢 LOW — Referral: `catch (err: any)` Pattern (Phase 5–6 rewrite)

**File:** `src/pages/Referral.tsx` (lines 417, 684)

```ts
} catch (err: any) {
```

Use `catch (err: unknown)` with a type guard instead. `err: any` bypasses type checking on the error object.

---

## ✅ What's Working Well

**Withdrawal disbursement flow (logic):**
- Correct state machine: `approved → processing → settled | failed`
- Max 3 auto-retry attempts with admin notification
- Graceful fallback to `manual_required` when credentials are missing
- IBG bank code lookup table is complete for all major Malaysian banks

**Payment links (process-link-payment):**
- Full 10-step flow is well-documented and correctly ordered
- PIN lockout (5 attempts, 15-min lockout) implemented correctly
- Rate limiting (5 req/min) in place
- Platform fee calculation uses integer math (no float errors)
- Buyer debit rolls back correctly on merchant credit failure
- Webhook failure does not block payment response

**Phase 1–6 Marketplace:**
- TypeScript compiles clean (`tsc --noEmit` exits 0)
- Route guards (`RequireAuth`, `RequireMember`) are in place
- Supabase RLS is enforced at DB level as a safety net

---

## Action Items (Priority Order)

| # | Action | File | Priority |
|---|---|---|---|
| 1 | Fix auth check: `!callerKey \|\| callerKey !== SERVICE_KEY` | `process-withdrawal-disbursement/index.ts:89` | 🔴 Do immediately |
| 2 | Confirm wallet debit timing and rollback on disbursement failure | `admin-actions/index.ts` + `process-withdrawal-disbursement` | 🔴 Verify before going live |
| 3 | Add `UNIQUE` constraint on `transactions.idempotency_key` | DB migration | 🟡 Before production |
| 4 | Verify `api_secret_hash` column stores raw secret, not a hash | DB schema | 🟡 Before production |
| 5 | Fix `no-unused-expressions` in WithdrawalApprovals.tsx | `WithdrawalApprovals.tsx` | 🟡 Next PR |
| 6 | Replace empty `catch {}` blocks with at minimum `console.error` | TopUp.tsx + others | 🟡 Next PR |
| 7 | Confirm `settled_at` column exists on `withdrawal_requests` | Supabase SQL editor | 🟡 Verify now |
| 8 | Run `npm run test` locally after fresh install, confirm all pass | Local dev | 🟡 Before deploy |
| 9 | Replace `as any` on pinned products with proper Supabase type | SellerLive.tsx, LiveViewer.tsx | 🟢 Low priority |
