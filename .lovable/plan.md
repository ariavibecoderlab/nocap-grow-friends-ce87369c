

## Plan: Clean Up Test Data (Before Feb 23, 2026 00:00 MYT)

### Summary of What Will Be Cleaned

**Cutoff**: `2026-02-23 00:00:00 MYT` (= `2026-02-22 16:00:00 UTC`)

| | Count |
|---|---|
| Test transactions (to delete) | **293** |
| Real transactions (to keep) | **32** |

**Current wallet balances are inflated by test data.** Many wallets show RM 2,000 from test top-ups. After cleanup, balances will be recalculated from the 32 real transactions only.

---

### Step-by-Step Plan

#### Step 1: Create a Backup Table
- Create a new `transactions_backup` table with the same structure as `transactions`
- This preserves all test data in case you ever need to reference it

#### Step 2: Copy Test Transactions to Backup
- Insert all 293 transactions with `created_at < '2026-02-22T16:00:00Z'` into the backup table

#### Step 3: Delete Test Transactions
- Delete the 293 test records from the `transactions` table

#### Step 4: Recalculate All Wallet Balances
- For each wallet (member, merchant, branch, admin), recalculate the balance by summing only remaining completed transactions:
  - **Credits** (add): `top_up`, `transfer_in`, `refund`, `cashback`, `commission`
  - **Debits** (subtract): `transfer_out`, `payment`, `withdrawal`
- Wallets with no remaining transactions will be set to RM 0.00

#### Step 5: Verify
- Query wallets and transactions to confirm correct state

---

### Technical Details

- The backup table will be created via a database migration (schema change)
- Data copy, deletion, and balance recalculation will use the data insert tool (data operations)
- The cutoff in UTC is `2026-02-22T16:00:00+00:00` (MYT is UTC+8)
- Branch wallets with balances (e.g. RM 902, RM 771, RM 271) will also be recalculated to reflect only real payment activity after the cutoff

