

## Plan: 3rd Party Cashback & Commission Distribution API

### Overview

Create a new API endpoint that allows 3rd party systems (authenticated via existing merchant API credentials) to trigger cashback and commission pool distribution. The funds are **deducted from the branch's balance**, allowing negative balances.

### How It Works

```text
3rd Party System                         NoCap Platform
─────────────────                        ──────────────
POST /api-distribute                 →   Validate API credentials
{                                        Look up branch & member
  branch_id,                             Calculate commission pool
  member_referral_code or user_id,         (branch.commission_percent)
  amount (sale amount),                  Debit branch wallet (allow negative)
  reference (idempotency)                Credit cashback → member
}                                        Credit tier commissions → ancestors
                                         Record transactions
                                    ←    Return distribution breakdown
```

### Key Differences from QR Payment Flow

| Aspect | QR Payment (unchanged) | 3rd Party Distribution |
|--------|----------------------|----------------------|
| Source of funds | Member wallet | Branch wallet |
| Negative balance | Not allowed | Allowed |
| Platform fee | Yes (1%) | No (already collected at point of sale) |
| Trigger | Customer scans QR | API call from 3rd party |
| Net to branch | Credited | Debited |

### Changes

**1. New Edge Function: `supabase/functions/api-distribute/index.ts`**

- Authenticate via `x-api-key` / `x-api-secret` (same pattern as `api-charge`, `api-branches`)
- Accept: `branch_id`, `member_referral_code` (or `user_id`), `amount`, `reference` (idempotency key)
- Validate branch belongs to the merchant's API app
- Calculate commission pool using `branch.commission_percent`
- Modify `debit_wallet` call to allow negative balance (new DB function)
- Distribute: cashback (1/6) to member, tier commissions (1/6 × 5) to ancestors
- Unclaimed tiers returned to branch (re-credited)
- Record all transactions with type `cashback` and `commission`
- Record a parent `distribution` transaction for audit
- Fire webhook `distribution.completed` to merchant's webhook URL
- Rate limit: 60 req/min

**2. New DB Function: `debit_wallet_allow_negative`**

A variant of `debit_wallet` that removes the `balance >= p_amount` check, allowing branches to go negative.

```sql
CREATE OR REPLACE FUNCTION public.debit_wallet_allow_negative(
  p_user_id uuid, p_wallet_type text, p_amount numeric, p_branch_id uuid DEFAULT NULL
) RETURNS numeric ...
-- Same as debit_wallet but without the balance >= p_amount guard
```

**3. Add `distribution` transaction type**

Add `'distribution'` to the `transaction_type` enum if not already present, for the parent transaction record.

**4. Register in `supabase/config.toml`**

```toml
[functions.api-distribute]
verify_jwt = false
```

**5. API Documentation**

Update the API docs page to include the new endpoint with request/response examples.

### Request / Response Example

**Request:**
```json
POST /api-distribute
Headers: x-api-key, x-api-secret

{
  "branch_id": "uuid",
  "member_referral_code": "D3123F95",
  "amount": 100.00,
  "reference": "sale-12345"
}
```

**Response:**
```json
{
  "success": true,
  "distribution_id": "uuid",
  "breakdown": {
    "total_pool": 5.00,
    "cashback": 0.83,
    "tier_commissions": [
      { "tier": 1, "amount": 0.83, "user_id": "..." },
      { "tier": 2, "amount": 0.83, "user_id": "..." }
    ],
    "unclaimed_returned": 2.49,
    "branch_debited": 2.51
  }
}
```

### Security

- Existing merchant API app authentication (same as all other API endpoints)
- Branch ownership validation (branch must belong to the authenticated merchant)
- Idempotency via `reference` field to prevent duplicate distributions
- Rate limiting (60 req/min)

### Files Changed

| File | Action |
|------|--------|
| `supabase/functions/api-distribute/index.ts` | Create |
| `supabase/config.toml` | Add function config |
| Database migration | Add `debit_wallet_allow_negative` function + `distribution` enum value |
| `src/pages/ApiDocs.tsx` | Add endpoint documentation |

