

# Fix Demo Store Checkout Errors

## Issues Found

### 1. Wrong `merchant_user_id` on Demo Store (Critical)
The demo store was created with `merchant_user_id = '59dfea5c-f9d7-4da3-973e-a0078480930f'` — a UUID that **does not exist** in the system. The correct merchant (azarul@brainybunch.com) has user ID `59dfea5c-75c7-42a7-90ed-d4b511c87474`. This causes failures when the edge function tries to send notifications or credit wallets for the non-existent merchant.

### 2. "Cannot buy from your own store" Block
If testing as azarul (the merchant), the self-purchase check would block checkout — but only once the `merchant_user_id` is corrected. The current wrong ID accidentally bypasses this check.

### 3. Low Test Wallet Balance
The test member wallet (azarul) has only RM 51.63. Many products plus RM 5 shipping exceed this. Orders >= RM 100 also require a PIN.

## Plan

### Step 1: Fix Demo Store `merchant_user_id` (SQL Migration)
Update the store record to use the correct merchant user ID:
```sql
UPDATE marketplace_stores 
SET merchant_user_id = '59dfea5c-75c7-42a7-90ed-d4b511c87474'
WHERE id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
```

### Step 2: Top Up Test Wallet
Credit the test member wallet with enough balance for testing:
```sql
SELECT credit_wallet(
  '59dfea5c-75c7-42a7-90ed-d4b511c87474'::uuid, 
  'member', 
  500.00
);
INSERT INTO transactions (user_id, type, amount, status, description)
VALUES ('59dfea5c-75c7-42a7-90ed-d4b511c87474', 'top_up', 500.00, 'completed', 'Test balance top-up');
```

### Step 3: Allow Merchant Self-Purchase for Testing (Optional)
If you want to test checkout as azarul on the demo store, we'd need a different test account. Alternatively, we can skip the self-purchase check for now during testing.

## Files Changed
- **Database migration only** — no code file changes needed

## Technical Notes
- The edge function logic itself is correct; the issue is data-level
- Once `merchant_user_id` is fixed, merchant notifications and wallet credits will work properly
- The nightly test reset may overwrite the wallet balance — this is expected

