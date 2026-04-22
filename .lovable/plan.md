

## Plan: Fix Merchant "Available Balance" calculation

**Problem:** On the Merchant page, the **Available Balance** card in the Withdraw section currently reads directly from the merchant wallet (showing RM 0.00 in the screenshot), even though Total Sales is RM 182. This creates a mismatch and prevents withdrawal requests.

**New rule:**
```
Available Balance = Total Sales − Σ Withdrawals (status = 'approved' OR 'settled')
```
- `pending` and `rejected` withdrawals are **excluded** from the deduction.
- `approved` = admin approved but not yet paid out; `settled` = paid out and marked complete. Both reduce available balance (since the funds are committed/gone).

### Changes

**1. `src/components/merchant/MerchantWithdrawals.tsx`**
- Replace the wallet-balance lookup with a computed value:
  - Fetch `Σ amount` from `transactions` where `user_id = userId`, `type = 'top_up'`, `status = 'completed'` → **Total Sales**
  - Fetch `Σ amount` from `withdrawal_requests` where `user_id = userId`, `status IN ('approved','settled')` → **Committed Withdrawals**
  - `availableBalance = totalSales − committedWithdrawals`
- Use this value for:
  - The "Available Balance" display
  - The submit-validation check (`amt > availableBalance`)
  - The helper text under the amount input
- Keep the existing realtime subscription on `withdrawal_requests` so the balance refreshes after admin approves/settles a request.

**2. (Optional consistency)** `src/pages/MerchantDashboard.tsx`
- Leave the top-row "Branch Balance" card untouched (it represents the live wallet, useful for ops).
- No change needed to "Total Sales" calculation — same source.

### Math example (matches your screenshot)
- Total Sales: RM 182
- Approved/Settled withdrawals: RM 0
- → Available Balance: **RM 182.00** (instead of RM 0.00 from the empty wallet)

Once a withdrawal of RM 50 is approved by admin:
- → Available Balance: **RM 132.00**

### Notes
- No database migration needed — `withdrawal_requests.status` already supports `pending / approved / rejected / settled`.
- No edge function changes.
- Affects only the merchant-facing UI; admin views unchanged.

