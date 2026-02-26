

## Plan: Merchant-Level API + Complete 3rd Party Integration Guide

### Changes in NoCap (This Project)

| File | Change |
|------|--------|
| Database migration | Make `branch_id` nullable on `api_applications` |
| `supabase/functions/api-register-app/index.ts` | Make `branch_id` optional for merchant-level apps |
| `supabase/functions/api-charge/index.ts` | Accept `branch_id` in request body; resolve dynamically for merchant-level apps |
| `supabase/functions/api-refund/index.ts` | Resolve branch from charge metadata instead of `app.branch_id` |
| `supabase/functions/api-branches/index.ts` | **New** -- list merchant branches via API key/secret |
| `src/components/merchant/MerchantApiApps.tsx` | Add "All Branches (Merchant-Level)" option in branch selector |
| `public/nocap-api-integration-guide.md` | Document new endpoint and merchant-level apps |
| `src/lib/generateApiGuidePdf.ts` | Update PDF with new content |
| `src/pages/ApiDocs.tsx` | Add api-branches to interactive docs |
| `supabase/config.toml` | Register new edge function |

### How It Works

```text
BEFORE:                              AFTER:
30 branches = 30 API apps            30 branches = 1 API app
30 sets of credentials               1 set of credentials
New branch = new integration         New branch = call GET /api-branches
```

### Database Migration

```sql
ALTER TABLE api_applications ALTER COLUMN branch_id DROP NOT NULL;
```

### New Endpoint: GET /api-branches

Returns all active branches for the merchant who owns the API app. Auth via `x-api-key` + `x-api-secret` only (no Bearer token needed). Returns: `{ branches: [{ id, branch_name, qr_code_id, is_active }] }`

### Key Logic Changes

- **api-charge**: Accept optional `branch_id` in body. Required for merchant-level apps (no default branch), optional for branch-level apps (defaults to app's branch). Validate branch belongs to same merchant.
- **api-refund**: Read branch from charge metadata instead of `app.branch_id` so refunds work for merchant-level apps.
- **api-register-app**: Skip branch validation when `branch_id` is omitted, creating a merchant-level app.

---

### Complete 3rd Party Integration Prompts

Two paths available:
- **Path A** (Prompts 1-9): New to NoCap -- full integration from scratch
- **Path B** (Prompts 6-9 only): Already have NoCap wallet -- upgrade only

Existing users do NOT need to disconnect. Their wallet and payment features continue working. They only re-authorize once to unlock referral features.

---

**Prompt 1 -- Store NoCap API Credentials** (New integrators only)
```
We are integrating with NoCap wallet and affiliate system.
Store these as backend secrets:
- NOCAP_APP_ID, NOCAP_API_KEY, NOCAP_API_SECRET

Base URL: https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1

Create a "nocap_connections" table:
- id (uuid, primary key)
- customer_id (uuid, references our user table)
- nocap_user_id (uuid)
- access_token (text)
- scopes (text array, e.g. ['balance','charge','referral'])
- referral_code (text)
- connected_at, updated_at (timestamps)

Add RLS so customers can only read their own connection.
```

**Prompt 2 -- Build NoCap API Service Layer** (New integrators only)
```
Create an API service file for NoCap endpoints.
Use stored secrets. Base URL: https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1

WALLET & PAYMENTS:
1. checkBalance(accessToken) -> GET /api-balance
2. createCharge(accessToken, amount, description, reference, pin?, branch_id?, metadata?) -> POST /api-charge
   Note: branch_id required if merchant-level app
3. getChargeStatus(chargeId) -> GET /api-charge-status?charge_id={chargeId}
4. listCharges(filters?) -> GET /api-charges-list
5. refundCharge(chargeId, amount?, reason?) -> POST /api-refund
6. listBranches() -> GET /api-branches

REFERRAL / AFFILIATE:
7. getReferralInfo(accessToken) -> GET /api-referral-info
8. registerViaReferral(email, referralCode, fullName?) -> POST /api-referral-register
9. getReferralNetwork(accessToken) -> GET /api-referral-network
10. getCashbackHistory(accessToken, filters?) -> GET /api-cashback-history

All use x-api-key + x-api-secret headers. Bearer token endpoints noted above.
```

**Prompt 3 -- OAuth Wallet Connection Flow** (New integrators only)
```
Add "Connect NoCap Wallet" button. Redirect to:
https://nocap.life/authorize?app_id=NOCAP_APP_ID&redirect_uri=OUR_CALLBACK&scope=balance,charge,referral&state=RANDOM

Request ALL three scopes upfront.

Callback page:
1. Receive ?code=XXX&state=YYY
2. Verify state (CSRF protection)
3. Call POST /api-token-exchange with { code, app_id, app_secret }
4. Store access_token, scopes, user info in nocap_connections
5. Show success and redirect to dashboard

Handle ?error=access_denied case.
```

**Prompt 4 -- New Customer Registration with Referral** (New integrators only)
```
When new customer signs up with a referral code:
1. Add optional "Referral Code" field to signup form
2. After our account creation, call POST /api-referral-register
3. Store returned access_token, nocap_user_id, referral_code
4. Customer is auto-connected -- no OAuth needed
5. Show their own referral code

If no referral code, skip NoCap auto-registration.
If NoCap registration fails, don't block our signup.
```

**Prompt 5 -- Wallet Payment in Checkout** (New integrators only)
```
Add NoCap as payment option in checkout:
1. Show NoCap balance (GET /api-balance)
2. Call POST /api-charge with { amount, description, reference, branch_id, metadata }
3. Handle PIN_REQUIRED: show PIN input, retry with PIN
4. Handle INSUFFICIENT_BALANCE: show top-up message
5. On success, mark order as paid

Webhook handling:
- Verify X-Webhook-Signature (HMAC-SHA256)
- Handle charge.completed, charge.failed, charge.refunded
```

---

### Start Here If Already Integrated

**Prompt 6 -- Upgrade for Affiliate and Multi-Branch** (All integrators)
```
Upgrading existing NoCap integration. DO NOT remove existing wallet features.

1. Add to nocap_connections table:
   - referral_code (text)
   - scopes (text array)

2. Create "nocap_branch_mappings" table:
   - id, our_outlet_id, nocap_branch_id, nocap_branch_name, created_at, updated_at

3. Add new functions to existing NoCap API service:
   REFERRAL: getReferralInfo, registerViaReferral, getReferralNetwork, getCashbackHistory
   BRANCH: listBranches() -> GET /api-branches

4. Update existing createCharge to accept optional branch_id parameter.
   Required for merchant-level apps.

Base URL: https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1
```

**Prompt 7 -- Re-authorize Existing Users for Referral Scope** (All integrators)
```
Existing customers have only "balance" and "charge" scopes.
DO NOT break existing wallet functionality.

1. Check stored scopes for each connected customer
2. If missing "referral", show banner: "Unlock Referral Rewards!"
3. On click, redirect to NoCap authorize with scope=balance,charge,referral
4. NoCap auto-revokes old token and issues new one
5. Exchange code via POST /api-token-exchange (same existing flow)
6. Update stored access_token and scopes
7. Hide banner once referral scope granted

Also: when new customers sign up with referral code,
call POST /api-referral-register to auto-create their NoCap account.
```

**Prompt 8 -- Multi-Branch Charge Routing** (All integrators)
```
DO NOT change existing payment logic. Just add branch routing:

1. Call GET /api-branches to fetch active NoCap branches
2. Store in nocap_branch_mappings table
3. Admin settings page to map our outlets to NoCap branch IDs
4. Include branch_id in POST /api-charge body
5. Show unmapped outlets as warnings
6. Add "Refresh Branches" button

Example: POST /api-charge { amount: 25.00, description: "Order #456",
reference: "order-456", branch_id: "uuid-of-branch" }
```

**Prompt 9 -- Referral Dashboard and Admin Panel** (All integrators)
```
DO NOT modify existing wallet/payment UI. Add new sections:

CUSTOMER DASHBOARD (only if referral scope granted):
1. Referral code with copy/share buttons (GET /api-referral-info)
2. Stats cards: direct referrals, network size, cashback, commission
3. Network tree Tiers 1-5 (GET /api-referral-network)
4. Earnings history with cashback/commission tabs (GET /api-cashback-history)
5. Share feature: "Join us! Use my code: XXXX"

ADMIN SECTION:
- Branch mapping management
- Connected customers overview
- Top referrers by network size
```

---

### Quick Reference

| Prompt | New Integration | Existing (Upgrade) |
|--------|:-:|:-:|
| 1 -- Credentials and DB | Yes | Skip |
| 2 -- API service layer | Yes | Skip |
| 3 -- OAuth connection | Yes | Skip |
| 4 -- Registration with referral | Yes | Skip |
| 5 -- Wallet payment checkout | Yes | Skip |
| 6 -- Upgrade DB + new API functions | Yes | **Start here** |
| 7 -- Re-authorize for referral scope | Yes | Yes |
| 8 -- Multi-branch charge routing | Yes | Yes |
| 9 -- Referral dashboard + admin | Yes | Yes |

Existing users do NOT need to disconnect. Wallet and payments continue working throughout the upgrade.

