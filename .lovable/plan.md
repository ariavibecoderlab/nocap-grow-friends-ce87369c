

## Member Wallet Withdrawal

### Overview
Add a dedicated withdrawal feature for members, separate from the merchant withdrawal flow. Members will be able to request cashouts from their member wallet to their bank account, subject to admin approval -- following the same approval pipeline merchants use but with a distinct UI entry point.

### How It Works
1. A new "Withdraw" button appears on the member Dashboard wallet card (next to "Top Up")
2. Tapping it opens a new dedicated page `/withdraw` with the withdrawal form and request history
3. Members enter amount + bank details and submit a withdrawal request
4. The request goes into the same `withdrawal_requests` table with `wallet_type = 'member'`
5. Admin reviews and approves/rejects it from the existing Admin Withdrawals tab (already supports member wallet type)

### No Database Changes Needed
The existing `withdrawal_requests` table already supports `wallet_type = 'member'` and `bank_name`, `bank_account_no`, `bank_account_holder` fields. The admin approval flow (`WithdrawalApprovals` component and `admin-actions` edge function) already handles member wallet withdrawals. No schema migration is required.

---

### Technical Plan

**1. Create `src/pages/Withdraw.tsx`**
- New page similar to `MerchantWithdrawals` but tailored for members
- Fetches member wallet balance from `wallets` table where `wallet_type = 'member'`
- Fetches member's withdrawal history from `withdrawal_requests` where `wallet_type = 'member'`
- Reads global `min_withdrawal_amount` from `system_settings`
- Shows balance card, withdrawal form dialog, and history list
- Inserts into `withdrawal_requests` with `wallet_type: 'member'`
- Realtime subscription for status updates on the member's requests

**2. Update `src/App.tsx`**
- Import the new `Withdraw` page
- Add route: `<Route path="/withdraw" element={<Withdraw />} />`

**3. Update `src/pages/Dashboard.tsx`**
- Add a "Withdraw" quick action button alongside "Top Up" in the wallet card area, navigating to `/withdraw`

**4. Verify admin-actions edge function**
- The existing `approve_withdrawal` action in `admin-actions` already deducts from the correct wallet using `wallet_type`, so member withdrawals will be processed correctly with no backend changes needed.

### UI Design
- The `/withdraw` page follows the same dark theme as the rest of the app
- Shows available member wallet balance at the top
- "Request Withdrawal" button opens a dialog with amount + bank detail fields
- Below: scrollable list of past withdrawal requests with status badges (pending/approved/rejected)
- Pending request blocks new submissions (same logic as merchant flow)

