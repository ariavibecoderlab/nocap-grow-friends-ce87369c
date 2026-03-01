

## API Top-Up: Allow 3rd Party Apps to Initiate Wallet Top-Ups

### How It Works (No NOcap Login Required)

The member authorizes the 3rd party app once via your existing OAuth flow (requesting the new `topup` scope). After that, the 3rd party app uses the member's access token to generate a RaudhahPay payment link. The member pays via FPX in the 3rd party app, and the wallet is credited automatically via webhook.

```text
Member in 3rd Party App
        |
   [Taps "Top Up Wallet"]
        |
3rd Party Server --> POST /api-topup
  (x-api-key, x-api-secret, Bearer token, amount)
        |
NOcap validates credentials + 'topup' scope
        |
Creates pending transaction + RaudhahPay bill
        |
Returns { payment_url, transaction_id }
        |
3rd Party opens payment_url for member
        |
Member pays via FPX (bank transfer)
        |
RaudhahPay webhook --> wallet credited
        |
(Optional) topup.completed webhook to 3rd party
```

### Security Analysis

| Concern | Mitigation |
|---|---|
| Token theft | Tokens expire in 90 days, revocable from Connected Apps |
| Unauthorized top-ups | Requires explicit `topup` scope grant from member |
| Duplicate payments | Optional `reference` field for idempotency |
| Amount abuse | Server-side RM10-RM500 limits |
| Fake webhooks | Existing RaudhahPay HMAC signature verification |
| Rate limiting | 30 req/min per API key via `check_rate_limit` |
| No wallet manipulation | Funds only credited after real bank payment confirmed by RaudhahPay |

Risk level: Low -- same security model as major e-wallet platforms.

---

### Changes Required

**1. New Edge Function: `supabase/functions/api-topup/index.ts`**

Follows the exact same authentication pattern as `api-charge`:
- Validates `x-api-key` + `x-api-secret` (headers or body)
- Validates Bearer access token, checks `topup` scope
- Rate limits at 30 req/min per API key
- Request body: `{ amount, description?, reference? }`
- Validates amount: RM10 - RM500
- Checks for duplicate `reference` (idempotency)
- Looks up member profile for RaudhahPay bill creation (name, phone, email)
- Creates pending `top_up` transaction in `transactions` table
- Calls RaudhahPay API to create bill (same logic as `create-topup-bill`)
- Stores `app_id` in transaction metadata (so webhook knows which app to notify)
- Returns `{ payment_url, transaction_id, bill_code }`
- Logs to `api_request_logs`
- Sandbox mode: returns mock payment_url and immediately marks completed (no real bill)

**2. Update `supabase/functions/api-authorize/index.ts`**

One-line change: add `'topup'` to the `allowedScopes` array (line ~97):
```
const allowedScopes = ['balance', 'charge', 'referral', 'topup'];
```

**3. Update `supabase/functions/raudhahpay-webhook/index.ts`**

After a successful top-up, check if the transaction metadata contains `app_id`. If so:
- Look up the app's `webhook_url` and `api_secret_hash`
- Send HMAC-signed `topup.completed` webhook to the 3rd party with `transaction_id`, `amount`, `reference`, and `timestamp`
- On failure, send `topup.failed` webhook
- Log webhook delivery to `api_request_logs`

**4. Update `supabase/config.toml`**

Add entry for the new function (auto-managed):
```toml
[functions.api-topup]
verify_jwt = false
```

**5. Update API Documentation (`src/pages/ApiDocs.tsx`)**

- Add `POST /api-topup` endpoint documentation in the Endpoints tab
- Add `topup` scope to Auth Flow documentation
- Add rate limit entry (30 req/min) in the rate limits table
- Add `topup.completed` / `topup.failed` webhook events to Webhooks tab

**6. No Database Changes Required**

All existing tables support this flow:
- `transactions` table already has `top_up` type
- `wallets` table updated via service role in webhook
- `api_request_logs` logs the new endpoint
- `api_access_tokens.scopes` JSONB supports arbitrary scope strings

