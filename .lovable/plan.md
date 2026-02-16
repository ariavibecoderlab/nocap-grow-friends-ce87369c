

# Third-Party Wallet API Integration

## Overview
Build a secure API that allows third-party applications to integrate with your wallet system. Each third-party app is linked to a specific registered merchant in your platform, so payments made by members through the third-party app flow to that merchant's branch -- using the same payment logic already in place.

## How It Works

### Registration and Connection Flow
1. A merchant registers a third-party application via the Merchant Dashboard (or Admin does it on their behalf)
2. The app is linked to one of the merchant's branches
3. API credentials (API key + secret) are generated for the third-party app
4. The third-party app uses these credentials to call your API

### Member Authorization Flow
1. Member opens the third-party app and chooses "Pay with NoCap Wallet"
2. Third-party app redirects or prompts the member to authorize via your platform
3. Member logs in and grants access -- a scoped access token is generated
4. Third-party app stores the token and can now check balance and request payments

### Payment Flow
1. Third-party app calls `api-charge` with the member's access token and the payment amount
2. Your backend validates the API key (identifies the merchant/branch), validates the access token (identifies the member), and runs the same payment logic as `process-payment` (fee calculation, commission distribution, cashback, referral tiers)
3. Payment is credited to the merchant's linked branch wallet
4. Both the member and merchant see the transaction in their histories

## New Database Tables

**`api_applications`** -- Registered third-party apps, each linked to a merchant and branch
- `id`, `name`, `description`
- `api_key` (unique, public identifier)
- `api_secret_hash` (hashed secret for authentication)
- `merchant_user_id` (the merchant who owns this app integration)
- `branch_id` (the branch that receives payments from this app)
- `webhook_url` (optional, for payment notifications)
- `is_active`, `created_at`, `updated_at`

**`api_access_tokens`** -- Member authorizations for specific apps
- `id`, `app_id` (FK to api_applications), `user_id` (the member)
- `access_token_hash` (hashed token)
- `scopes` (jsonb, e.g. `["balance", "charge"]`)
- `is_active`, `expires_at`, `created_at`, `last_used_at`

**`api_charges`** -- Payment requests from third-party apps
- `id`, `app_id`, `user_id`, `amount`, `description`
- `reference` (third-party's own reference ID)
- `status` (pending / completed / failed / expired)
- `transaction_id` (FK to transactions, once completed)
- `created_at`, `completed_at`

## New Backend Functions

| Function | Auth | Purpose |
|---|---|---|
| `api-register-app` | Merchant session | Merchant registers a third-party app linked to their branch; returns API key + secret |
| `api-authorize` | Member session | Member authorizes a third-party app; returns an access token |
| `api-revoke` | Member session | Member revokes access for a third-party app |
| `api-balance` | API key + access token | Third-party app checks member's real-time wallet balance |
| `api-charge` | API key + access token | Third-party app initiates payment; runs same logic as process-payment (fees, commissions, cashback, referral tiers) |
| `api-charge-status` | API key | Third-party app checks a charge's status |

### Third-Party Authentication Headers
```
X-Api-Key: <app_api_key>
X-Api-Secret: <app_api_secret>
Authorization: Bearer <member_access_token>
```

The backend validates:
1. API key + secret -- identifies the third-party app and its linked merchant/branch
2. Access token -- identifies the member and confirms they authorized this app

## Frontend Changes

### Merchant Dashboard -- New "API Apps" Tab
- Register a new third-party application (name, description, select branch, webhook URL)
- View generated API key and secret (shown once)
- Enable/disable apps
- View list of connected members and recent charges

### Member Profile -- New "Connected Apps" Section
- View list of third-party apps the member has authorized
- Revoke access for any app
- View recent charges from each app

### Admin Panel -- New "API Apps" Column in Transactions Tab
- View all API-originated transactions
- Ability to deactivate any third-party app

## Security Model
- API secrets are hashed (SHA-256) before storage; shown only once at creation
- Member access tokens are hashed before storage
- Tokens have configurable expiry (default 90 days)
- Members can revoke access at any time
- Merchants can deactivate their apps
- Admin can deactivate any app
- PIN verification applies for charges above the configured threshold
- RLS policies ensure merchants only see their own apps, members only see their own tokens

## Implementation Order
1. Database migration: create `api_applications`, `api_access_tokens`, `api_charges` tables with RLS
2. `api-register-app` backend function + Merchant Dashboard "API Apps" tab
3. `api-authorize` and `api-revoke` backend functions + Member Profile "Connected Apps" section
4. `api-balance` backend function
5. `api-charge` backend function (reusing process-payment logic)
6. `api-charge-status` backend function
7. Admin Panel enhancements for API app oversight

