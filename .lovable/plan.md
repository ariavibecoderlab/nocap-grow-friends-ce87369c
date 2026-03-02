

# Transaction Audit System -- Impact Analysis and Implementation Plan

## Current Vulnerability Assessment

After analyzing all 8 edge functions that handle wallet balance changes, here is a detailed breakdown of the race condition risks and implications of the proposed audit system.

---

## Vulnerable Edge Functions (Read-Then-Write Pattern)

Every edge function currently uses the same dangerous pattern:

```text
1. SELECT balance FROM wallets WHERE ...
2. newBalance = balance - amount        (in JavaScript)
3. UPDATE wallets SET balance = newBalance WHERE ...
```

Between steps 1 and 3, another request can read the same stale balance, causing double-spending or lost credits.

### Functions Affected

| Function | Wallet Operations | Race Condition Risk |
|---|---|---|
| `process-payment` | Debit member, credit branch, credit admin, cashback, 5x tier commissions | **CRITICAL** -- up to 9 separate read-then-write cycles per payment |
| `process-transfer` | Debit sender member, credit recipient member | **HIGH** -- 2 wallets modified |
| `api-charge` | Debit member, credit branch, credit admin, cashback, 5x tier commissions | **CRITICAL** -- mirrors process-payment |
| `api-refund` | Debit branch, credit member | **HIGH** -- 2 wallets modified |
| `raudhahpay-webhook` | Credit member wallet on top-up | **MEDIUM** -- single wallet credit |
| `admin-actions` (approve_withdrawal) | Debit member/branch wallet | **MEDIUM** -- admin-initiated, lower concurrency |
| `admin-actions` (approve_branch_withdrawal) | Debit branch, credit member | **HIGH** -- 2 wallets modified |
| `process-marketplace-order` | Debit buyer, credit branch, credit admin, cashback, 5x tier commissions | **CRITICAL** -- mirrors process-payment |

---

## Implications on Current Features

### 1. QR Payments (process-payment)
- **Risk**: Two simultaneous QR scans from the same member could both pass the balance check and double-spend.
- **Change**: Replace 3 lines (select, compute, update) with 1 RPC call `debit_wallet()`. The balance trigger will auto-log every change.
- **Impact on UX**: None visible. Payments that would fail due to insufficient balance will now return a clearer error ("Insufficient balance or wallet not found") instead of silently succeeding with a negative balance.

### 2. P2P Transfers (process-transfer)
- **Risk**: Rapid repeated transfers could overdraw the sender wallet.
- **Change**: Same atomic replacement. No UI changes needed.
- **Impact on UX**: None visible.

### 3. API Charges (api-charge)
- **Risk**: Third-party apps making rapid sequential charges could exploit the race window.
- **Change**: Same atomic replacement. Webhook payloads and response format remain identical.
- **Impact on 3rd-party integrations**: None -- API contract unchanged.

### 4. API Refunds (api-refund)
- **Risk**: Concurrent refund requests for the same charge could over-refund.
- **Change**: Use `debit_wallet()` for branch, `credit_wallet()` for member.
- **Impact on 3rd-party integrations**: None -- API contract unchanged.

### 5. Top-Up via RaudhahPay (raudhahpay-webhook)
- **Risk**: Duplicate webhook deliveries (which RaudhahPay may send) could double-credit.
- **Current mitigation**: Already checks `transaction.status === 'completed'` before crediting. This is partially safe but the balance update itself is still non-atomic.
- **Change**: Use `credit_wallet()` RPC.
- **Impact on UX**: None visible.

### 6. Marketplace Orders (process-marketplace-order)
- **Risk**: Same as QR payments -- concurrent purchases can double-spend.
- **Change**: Same atomic replacement.
- **Impact on UX**: None visible.

### 7. Admin Withdrawal Approvals (admin-actions)
- **Risk**: Lower risk (admin-initiated, low concurrency) but still theoretically vulnerable if two admins approve the same withdrawal simultaneously.
- **Change**: Use `debit_wallet()` RPC.
- **Impact on Admin Panel**: None visible.

### 8. Cashback and Commission Distribution
- **Risk**: All commission distribution loops (in process-payment, api-charge, process-marketplace-order) update up to 7 wallets sequentially with read-then-write. If the same ancestor receives commissions from two simultaneous payments, one credit could be lost.
- **Change**: Each `credit_wallet()` call is independently atomic, so overlapping commissions will both succeed correctly.
- **Impact**: Commission amounts will be accurate; no more "lost" commissions.

---

## Implications on the Audit Trigger

### `wallet_balance_audit` Trigger Considerations

- The trigger fires on `AFTER UPDATE` of the `wallets` table. Since the new `debit_wallet()` and `credit_wallet()` RPCs use `SECURITY DEFINER`, `auth.uid()` inside the trigger will return NULL for service-role calls. The `changed_by` column will be NULL for backend operations -- this is acceptable since the transaction record provides the actor context.
- The trigger adds minimal overhead (a single INSERT per wallet UPDATE). Given that a complex payment already does 9+ database round-trips, one additional INSERT per wallet change is negligible.
- **No existing feature is affected** by the trigger -- it is purely additive.

### `reconcile_wallet_balances()` Implications

- The reconciliation function compares `wallets.balance` against `SUM(transactions)`. For this to be accurate, every wallet change **must** have a corresponding transaction record. Current code already creates transaction records for all flows -- but there are edge cases:
  - **Unclaimed commissions returned to branch**: No transaction record is created when unclaimed tier commissions are credited back to the branch wallet. This will cause drift in reconciliation.
  - **Admin wallet fee credits**: These do have transaction records, so they are fine.
  - **Branch wallet creation** (insert, not update): The trigger only fires on UPDATE, not INSERT. First-time branch wallet creation with a non-zero balance won't be logged by the audit trigger.

- **Fix needed**: The reconciliation function must account for these edge cases, or we should add transaction records for unclaimed commission returns and handle INSERT in the trigger.

---

## Implementation Plan (Updated with Impact Mitigations)

### Phase 1: Database Migration
Create a single migration with:
1. `wallet_balance_audit` table + RLS (admin-only SELECT)
2. `log_wallet_balance_change()` trigger on `wallets` (fires on UPDATE and INSERT)
3. `debit_wallet(p_user_id, p_wallet_type, p_amount, p_branch_id)` RPC
4. `credit_wallet(p_user_id, p_wallet_type, p_amount, p_branch_id)` RPC
5. `reconcile_wallet_balances()` RPC

### Phase 2: Update Edge Functions (8 files)
Replace all `select-compute-update` wallet patterns with `supabase.rpc('debit_wallet', ...)` and `supabase.rpc('credit_wallet', ...)`. No changes to request/response contracts.

Files to modify:
- `supabase/functions/process-payment/index.ts`
- `supabase/functions/process-transfer/index.ts`
- `supabase/functions/api-charge/index.ts`
- `supabase/functions/api-refund/index.ts`
- `supabase/functions/api-topup/index.ts`
- `supabase/functions/raudhahpay-webhook/index.ts`
- `supabase/functions/admin-actions/index.ts`
- `supabase/functions/process-marketplace-order/index.ts`

### Phase 3: Admin Reconciliation UI
- New component: `src/components/admin/WalletReconciliation.tsx`
- Add "Audit" tab to Admin panel in `src/pages/Admin.tsx`
- Shows: drift detection table, audit log with date/user filters, summary stats

### Phase 4: Idempotency Keys (Future)
- Add `idempotency_key` column to `transactions` table
- Edge functions generate deterministic keys to prevent duplicate processing

---

## Risk Summary

| Concern | Risk Level | Mitigation |
|---|---|---|
| Breaking existing API contracts | None | Response formats unchanged |
| Breaking existing UI flows | None | Same success/error responses |
| Data loss during migration | None | Trigger is additive; no existing data modified |
| Performance degradation | Negligible | RPC calls replace 2 queries with 1 atomic query |
| Reconciliation false positives | Low | Address unclaimed commission edge case in function design |

