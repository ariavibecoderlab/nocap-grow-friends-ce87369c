

# Phase 4: Idempotency Keys for Transaction Deduplication

## Problem

Currently, if a user double-taps a "Pay" button, or a webhook fires twice, or a network retry occurs, duplicate transactions can be created. While the atomic `debit_wallet`/`credit_wallet` RPCs prevent balance corruption, they don't prevent duplicate transaction records and double wallet movements.

## Solution

Add an `idempotency_key` column to the `transactions` table with a unique constraint. Each edge function generates a deterministic key before inserting a transaction. If the same key is inserted twice, the database rejects the duplicate, and the edge function returns the original transaction instead of creating a new one.

---

## Database Migration

1. Add `idempotency_key` column (nullable `text`, default `NULL`) to `transactions` table
2. Create a unique index on `idempotency_key` (partial -- only where it's not null, so legacy rows without keys are fine)

```sql
ALTER TABLE public.transactions ADD COLUMN idempotency_key text;
CREATE UNIQUE INDEX idx_transactions_idempotency_key 
  ON public.transactions (idempotency_key) 
  WHERE idempotency_key IS NOT NULL;
```

## Key Generation Strategy

Each function generates a deterministic key from its unique inputs. The key format is `{function}:{user_id}:{distinguishing_fields}:{timestamp_bucket}` where `timestamp_bucket` is a 10-second window to allow natural retries while preventing stale replays.

| Function | Key Format |
|---|---|
| `process-payment` | `pay:{payer_id}:{branch_id}:{amount}:{10s_bucket}` |
| `process-transfer` | `xfer:{sender_id}:{recipient_id}:{amount}:{10s_bucket}` |
| `process-marketplace-order` | `mkt:{buyer_id}:{store_id}:{total}:{10s_bucket}` |
| `api-charge` | `apichg:{app_id}:{user_id}:{amount}:{reference}` (reference is already unique per app) |
| `api-topup` | `apitop:{app_id}:{user_id}:{amount}:{reference}` |
| `api-refund` | `apiref:{charge_id}` (one refund per charge) |
| `raudhahpay-webhook` | `rpwh:{transaction_id}` (already checks status, but this adds belt-and-suspenders) |
| `admin-actions` (withdrawal approval) | `wdappr:{withdrawal_id}` |

## Edge Function Changes (8 files)

For each function, add a helper to generate the key and wrap the transaction insert in a try/catch that handles the unique constraint violation:

```typescript
// Helper added to each function
function idempotencyKey(...parts: string[]): string {
  return parts.join(':');
}

function timeBucket(windowSec = 10): string {
  return Math.floor(Date.now() / (windowSec * 1000)).toString(36);
}

// Usage in transaction insert
const ikey = idempotencyKey('pay', payerId, branch_id, amount.toString(), timeBucket());
const { data: paymentTx, error: txErr } = await supabase
  .from('transactions')
  .insert({ ..., idempotency_key: ikey })
  .select('id')
  .single();

if (txErr?.code === '23505') { // unique_violation
  // Duplicate -- return existing transaction
  const { data: existing } = await supabase
    .from('transactions')
    .select('id')
    .eq('idempotency_key', ikey)
    .single();
  return jsonRes({ error: 'Duplicate request', transaction_id: existing?.id }, 409);
}
```

## Frontend Changes

No frontend changes required. The idempotency is handled entirely server-side. The existing `disabled={submitting}` button states in `QrPay.tsx`, `Transfer.tsx`, `Checkout.tsx` remain as UX-level guards, with the database constraint as the definitive backend guard.

## Files to Modify

| File | Change |
|---|---|
| New migration SQL | Add `idempotency_key` column + unique index |
| `supabase/functions/process-payment/index.ts` | Add key generation + duplicate handling |
| `supabase/functions/process-transfer/index.ts` | Add key generation + duplicate handling |
| `supabase/functions/process-marketplace-order/index.ts` | Add key generation + duplicate handling |
| `supabase/functions/api-charge/index.ts` | Add key generation + duplicate handling |
| `supabase/functions/api-topup/index.ts` | Add key generation + duplicate handling |
| `supabase/functions/api-refund/index.ts` | Add key generation + duplicate handling |
| `supabase/functions/raudhahpay-webhook/index.ts` | Add key generation + duplicate handling |
| `supabase/functions/admin-actions/index.ts` | Add key generation + duplicate handling |

## Risk Analysis

| Concern | Risk Level | Details |
|---|---|---|
| **Breaking existing transactions** | **NONE** | Column is nullable, so all existing rows remain valid. The unique index is partial (WHERE NOT NULL). |
| **API contract changes** | **NONE** | No new required fields. Idempotency is auto-generated server-side. |
| **False duplicate rejection** | **LOW** | The 10-second time bucket means two genuinely different payments within 10 seconds to the same branch for the same amount would be rejected. This is an acceptable trade-off -- legitimate same-amount payments seconds apart are extremely rare. API functions using `reference` have no time bucket and are fully deterministic. |
| **Performance impact** | **NEGLIGIBLE** | One additional B-tree index lookup per insert. |
| **Commission/cashback transactions** | **NONE** | Only the primary transaction (payment, transfer) gets an idempotency key. Downstream commission/cashback inserts are child operations tied to `reference_id` and will only execute if the parent insert succeeds. |

