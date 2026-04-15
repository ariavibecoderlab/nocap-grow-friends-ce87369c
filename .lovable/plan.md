

# Admin Withdrawal Page Redesign

## Current State
- Single flat list showing only **pending** withdrawals
- No separation between member and merchant withdrawals
- No visibility into approved/completed history
- `withdrawal_requests` table has `wallet_type` (member/merchant/branch) and `status` (pending/approved/rejected)

## Proposed Changes

### 1. Two Main Tabs: Members | Merchants
- **Members** tab: filters `wallet_type = 'member'`
- **Merchants** tab: filters `wallet_type IN ('merchant', 'branch')` — branch withdrawals grouped under merchant since branches belong to merchants

### 2. Three Sub-Tabs per Main Tab: Pending | Approved | Settled
- **Pending** — current approval/reject workflow (bulk actions, checkboxes)
- **Approved** — withdrawals approved but not yet bank-transferred; admin can mark as "Settled"
- **Settled** — completed withdrawals (read-only history with search/date filters)

Requires a **database migration** to add `settled` as a valid status and a `settled_at` timestamp column.

### 3. Suggested Operational Improvements

| Feature | Description |
|---------|-------------|
| **Mark as Settled** button | On Approved tab, admin confirms bank transfer is done — moves to Settled |
| **Bulk Settle** | Select multiple approved items and mark all as settled at once |
| **Summary Cards** | Top-of-page stats: total pending amount, total approved (awaiting transfer), today's settled |
| **Search & Date Filter** | Filter by name, bank, amount, or date range across all sub-tabs |
| **Export CSV** | Download filtered list as CSV for bank batch upload |
| **Settlement Reference** | Text field when marking settled to record bank reference/batch number |
| **Withdrawal Count Badges** | Show count on each sub-tab (e.g., "Pending (5)") |

### Technical Plan

| Step | File | Detail |
|------|------|--------|
| Migration | SQL | Add `settled_at` timestamp column; allow `settled` status |
| Rewrite component | `WithdrawalApprovals.tsx` | Add Tabs (Members/Merchants), sub-tabs (Pending/Approved/Settled), summary cards, search, date filter, CSV export, settle action |
| Edge function update | `admin-actions/index.ts` | Add `settle_withdrawal` action that sets status to `settled` and `settled_at` |

No new pages or routes needed — this is a full rewrite of the existing `WithdrawalApprovals` component within the admin portal.

