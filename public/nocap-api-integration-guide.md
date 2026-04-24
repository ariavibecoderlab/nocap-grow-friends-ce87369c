# NoCap API — Integration Guide

> **Version:** 1.4 — additive Commerce API extension (v1.3 endpoints unchanged)  
> **Base URL:** `https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1`  
> **Authorization URL:** `https://nocap.life/authorize`

## v1.4 — Commerce API Extension (additive)

The v1.4 release adds endpoints required by AI sales-assistant integrations (e.g. WhatsApp / Telegram bots like OpenClaw) **without changing any v1.3 behavior**.

- **Authentication (new endpoints only):** server-to-server merchant credentials via the `X-Api-Key` and `X-Api-Secret` headers — no user Bearer token required for v1.4 catalog/order reads.
- **All v1.3 endpoints, request shapes, response envelopes, webhook payloads, and the OAuth Authorization Code flow remain unchanged.**

### New endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api-products` | List/search products; `?id=<uuid>` returns detail with variants |
| GET | `/api-orders` | List orders with filters; `?id=<uuid>` returns detail with items + history |
| POST | `/api-orders` | Create draft order; optional `create_payment_link: true` returns hosted link |
| PATCH | `/api-orders?id=<uuid>` | Update fulfillment status / tracking number |
| POST | `/api-payment-links` | Create hosted checkout link (`/pay/<link_id>` on nocap.life) |
| GET | `/api-payment-links` | List payment links; `?id=<uuid>` returns single link |
| GET | `/api-customers` | Merchant-scoped customer directory; `?phone=` / `?email=` lookup; `?id=<uuid>&orders=true` returns history |
| POST | `/api-inventory/reserve` | Soft TTL hold on stock; idempotent per `(api_key, reference)` |
| POST | `/api-inventory/release` | Release a hold by `reservation_id` or `reference` |
| GET | `/api-webhooks/subscriptions` | View webhook URL, current event opt-ins, full event catalog |
| POST | `/api-webhooks/subscriptions` | Update webhook URL and per-event subscriptions |

### New webhook events (additive — `charge.*` unchanged)

- **Orders:** `order.created`, `order.paid`, `order.shipped`, `order.delivered`, `order.cancelled`, `order.refunded`
- **Payment links:** `payment_link.paid`, `payment_link.expired`
- **Products:** `product.created`, `product.updated`, `product.stock_changed`

Envelope adds `merchant_id` + `branch_id` next to the existing `event`/`data` fields. Same HMAC-SHA256 signing scheme via `X-Webhook-Signature`. See the [Webhooks v1.4](#webhooks-v14) chapter for verification samples and retry policy.



### Example — create order with hosted payment link

```bash
curl -X POST "https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1/api-orders" \
  -H "X-Api-Key: your_api_key" \
  -H "X-Api-Secret: your_api_secret" \
  -H "Content-Type: application/json" \
  -d '{
    "store_id": "uuid",
    "buyer_name": "Ali",
    "buyer_phone": "+60123456789",
    "buyer_email": "ali@example.com",
    "shipping_address": "12 Jalan ABC, KL",
    "items": [{ "product_id": "uuid", "quantity": 2 }],
    "create_payment_link": true
  }'
```

---

> **Last Updated:** February 2026

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication (OAuth 2.0)](#authentication-oauth-20)
3. [API Endpoints — Wallet & Payments](#api-endpoints--wallet--payments)
4. [API Endpoints — Wallet Top-Up](#api-endpoints--wallet-top-up)
5. [API Endpoints — Referral / Affiliate](#api-endpoints--referral--affiliate)
6. [Webhooks](#webhooks)
7. [Rate Limits](#rate-limits)
8. [Error Codes](#error-codes)
9. [Sandbox Mode](#sandbox-mode)
10. [3rd Party Integration Roadmap](#3rd-party-integration-roadmap)

---

## Overview

NoCap provides a REST API that allows third-party applications to:

- **Check user wallet balance** (`balance` scope)
- **Create charges / payments** from a user's wallet (`charge` scope)
- **Refund** completed charges (full or partial)
- **List and query** charge history
- **Initiate wallet top-ups** via FPX bank transfer (`topup` scope)
- **Access referral info, network, and cashback history** (`referral` scope)
- **Register new users via referral** (API key auth only)

All API access is secured via **OAuth 2.0 Authorization Code** flow. Users explicitly consent to granting your application access.

### Credentials You'll Need

| Credential | Where to Find | Purpose |
|---|---|---|
| `app_id` | Merchant Dashboard → API Apps | Identifies your application |
| `api_key` | Merchant Dashboard → API Apps | Authenticates API requests |
| `api_secret` | Shown once at app creation | Signs requests & verifies webhooks |

---

## Authentication (OAuth 2.0)

NoCap uses the **Authorization Code** flow. The user is redirected to NoCap, logs in, approves your app, and is redirected back with a one-time code you exchange for an access token.

### Flow Diagram

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│  Your App    │         │  User Browser │         │   NoCap API  │
└──────┬───────┘         └──────┬───────┘         └──────┬───────┘
       │  1. Redirect user ──────►│                       │
       │                          │  2. Login + Consent ──►│
       │                          │◄── 3. Redirect back    │
       │◄── 4. Receive ?code=XXX  │   with ?code=XXX      │
       │                          │                       │
       │  5. POST /api-token-exchange ────────────────────►│
       │◄── 6. { access_token }  ─────────────────────────│
       │                          │                       │
       │  7. Use API with token  ─────────────────────────►│
       └──────────────────────────┘                       └─
```

### Step 1 — Redirect User to Consent Screen

Redirect the user's browser to:

```
https://nocap.life/authorize?app_id=YOUR_APP_ID&redirect_uri=YOUR_CALLBACK_URL&scope=balance,charge,referral&state=RANDOM_STATE
```

| Parameter | Required | Description |
|---|---|---|
| `app_id` | ✅ | Your application UUID |
| `redirect_uri` | ✅ | Where the user is sent after approval |
| `scope` | Optional | Comma-separated: `balance`, `charge`, `referral`, `topup` (defaults to `balance,charge`) |
| `state` | Recommended | Random string for CSRF protection — verify on callback |

**Alternative parameter names** (also supported):
- `client_id` → same as `app_id`
- `callback_url` → same as `redirect_uri`
- `scopes` → same as `scope`

### Step 2 — User Authenticates & Approves

The user sees a consent screen showing your app name and requested permissions. They authenticate via email OTP, then approve or deny.

### Step 3 — Receive Authorization Code

**On approval**, NoCap redirects to:

```
YOUR_CALLBACK_URL?code=AUTHORIZATION_CODE&state=YOUR_STATE
```

**On denial**:

```
YOUR_CALLBACK_URL?error=access_denied&error_description=User+denied+the+request&state=YOUR_STATE
```

> ⚠️ The authorization code **expires in 10 minutes** and can only be used **once**.

### Step 4 — Exchange Code for Access Token

Make a **server-to-server** POST request (never expose `app_secret` in client-side code):

```bash
curl -X POST https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1/api-token-exchange \
  -H "Content-Type: application/json" \
  -d '{
    "code": "AUTHORIZATION_CODE",
    "app_id": "YOUR_APP_ID",
    "app_secret": "YOUR_APP_SECRET"
  }'
```

**Success Response (200):**

```json
{
  "success": true,
  "access_token": "64-character-hex-string",
  "token_type": "Bearer",
  "scopes": ["balance", "charge", "referral"],
  "expires_in": 7776000
}
```

| Field | Description |
|---|---|
| `access_token` | 64-char hex token — store securely server-side |
| `token_type` | Always `"Bearer"` |
| `scopes` | Granted permissions |
| `expires_in` | Token lifetime in seconds (90 days = 7,776,000s) |

> If the user already has an active token for your app, the old token is automatically revoked and a new one is issued with the updated scopes. This allows seamless **scope upgrades** (e.g., adding `referral` or `topup` to an existing `balance,charge` token).

---

## API Endpoints — Wallet & Payments

All API calls require **3 credentials** in headers:

| Header | Value |
|---|---|
| `x-api-key` | Your app's API key |
| `x-api-secret` | Your app's API secret |
| `Authorization` | `Bearer ACCESS_TOKEN` |

### 1. Check Balance

**`GET /api-balance`**

Requires scope: `balance`

```bash
curl https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1/api-balance \
  -H "x-api-key: YOUR_API_KEY" \
  -H "x-api-secret: YOUR_API_SECRET" \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

**Response (200):**

```json
{
  "balance": 150.00,
  "currency": "MYR"
}
```

---

### 2. Create a Charge

**`POST /api-charge`**

Requires scope: `charge`

```bash
curl -X POST https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1/api-charge \
  -H "x-api-key: YOUR_API_KEY" \
  -H "x-api-secret: YOUR_API_SECRET" \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 10.00,
    "description": "Order #123",
    "reference": "order-123",
    "branch_id": "uuid-of-branch",
    "pin": "1234567",
    "metadata": {
      "order_id": "abc-123",
      "customer_name": "John"
    }
  }'
```

**Request Body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `amount` | number | ✅ | Amount in MYR (0.01 – 50,000) |
| `description` | string | Optional | Payment description |
| `reference` | string | Optional | Your internal reference ID |
| `branch_id` | string | Conditional | Target branch UUID. **Required** for merchant-level apps (no default branch). Optional for branch-level apps (defaults to app's branch). Use `GET /api-branches` to list available branches. |
| `pin` | string | Conditional | User's 7-digit PIN (required when amount ≥ threshold, default RM100) |
| `metadata` | object | Optional | Custom key-value data (max 4KB JSON object) |

**Success Response (200):**

```json
{
  "success": true,
  "charge_id": "uuid",
  "transaction_id": "uuid",
  "amount": 10.00,
  "new_balance": 140.50,
  "cashback": 0.50,
  "branch_name": "My Store"
}
```

**Error Responses:**

| Status | Code | Meaning |
|---|---|---|
| 400 | `PIN_REQUIRED` | Amount exceeds threshold — include `pin` field |
| 400 | `PIN_NOT_SET` | User hasn't configured a PIN yet |
| 400 | `INSUFFICIENT_BALANCE` | User's wallet balance is too low |
| 403 | `INVALID_PIN` | Wrong PIN provided |

---

### 3. Check Charge Status

**`GET /api-charge-status?charge_id=CHARGE_ID`**

Requires: `x-api-key` + `x-api-secret` (no Bearer token needed)

```bash
curl "https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1/api-charge-status?charge_id=CHARGE_UUID" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "x-api-secret: YOUR_API_SECRET"
```

**Response (200):**

```json
{
  "id": "uuid",
  "amount": 10.00,
  "description": "Order #123",
  "reference": "order-123",
  "status": "completed",
  "transaction_id": "uuid",
  "created_at": "2026-02-17T10:00:00Z",
  "completed_at": "2026-02-17T10:00:01Z"
}
```

**Possible statuses:** `pending`, `completed`, `failed`, `refunded`, `partial_refund`

---

### 4. List Charges

**`GET /api-charges-list`**

Requires: `x-api-key` + `x-api-secret` (no Bearer token needed)

```bash
curl "https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1/api-charges-list?page=1&limit=20&status=completed" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "x-api-secret: YOUR_API_SECRET"
```

**Query Parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | integer | 1 | Page number |
| `limit` | integer | 20 | Results per page (max 100) |
| `status` | string | — | Filter by status |
| `from` | ISO date | — | Start date filter |
| `to` | ISO date | — | End date filter |
| `reference` | string | — | Filter by your reference ID |
| `user_id` | UUID | — | Filter by user |

**Response (200):**

```json
{
  "data": [
    {
      "id": "uuid",
      "amount": 10.00,
      "description": "Order #123",
      "reference": "order-123",
      "status": "completed",
      "is_sandbox": false,
      "transaction_id": "uuid",
      "user_id": "uuid",
      "created_at": "2026-02-17T10:00:00Z",
      "completed_at": "2026-02-17T10:00:01Z",
      "metadata": {}
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "total_pages": 3,
    "has_more": true
  }
}
```

---

### 5. Refund a Charge

**`POST /api-refund`**

Requires: `x-api-key` + `x-api-secret` (no Bearer token needed)

```bash
curl -X POST https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1/api-refund \
  -H "x-api-key: YOUR_API_KEY" \
  -H "x-api-secret: YOUR_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "charge_id": "CHARGE_UUID",
    "amount": 5.00,
    "reason": "Customer requested refund"
  }'
```

**Request Body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `charge_id` | UUID | ✅ | The charge to refund |
| `amount` | number | Optional | Partial refund amount (defaults to full remaining) |
| `reason` | string | Optional | Reason for refund |

**Response (200):**

```json
{
  "success": true,
  "refund_amount": 5.00,
  "total_refunded": 5.00,
  "charge_amount": 10.00,
  "status": "partial_refund",
  "transaction_id": "uuid"
}
```

> Only `completed` charges can be refunded. The refund is deducted from the branch wallet and credited to the user's wallet. For merchant-level apps, the branch is resolved from the charge metadata automatically.

---

### 6a. List Branches

**`GET /api-branches`**

Requires: `x-api-key` + `x-api-secret` (no Bearer token needed)

Returns all active branches for the merchant who owns the API app. Use this to populate your branch selector or map internal outlet IDs to NoCap branch IDs.

```bash
curl https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1/api-branches \
  -H "x-api-key: YOUR_API_KEY" \
  -H "x-api-secret: YOUR_API_SECRET"
```

**Response (200):**

```json
{
  "branches": [
    {
      "id": "uuid",
      "branch_name": "KL Sentral Outlet",
      "qr_code_id": "abc123",
      "is_active": true
    }
  ]
}
```

> **Merchant-Level Apps:** When registering an API app without selecting a specific branch, you create a "merchant-level" app. These apps must include `branch_id` in every `POST /api-charge` request. Use this endpoint to discover available branches.

---

### 6a-2. App Metadata (Public)

**`GET /api-app-info`**

Public endpoint — **no authentication required**. Resolves an app's display name from its `app_id` (UUID) or `api_key`. Useful for rendering app branding on custom OAuth consent screens.

**Query Parameters:**

| Field    | Type   | Required | Description                                            |
|----------|--------|----------|--------------------------------------------------------|
| `app_id` | string | Yes      | The app's UUID, or its `api_key` as a fallback lookup. |

```bash
curl "https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1/api-app-info?app_id=YOUR_APP_ID"
```

**Response (200):**

```json
{
  "id": "11111111-2222-3333-4444-555555555555",
  "name": "Acme POS"
}
```

**Errors:**

- `400` — Missing `app_id` query parameter.
- `404` — App not found or inactive.

> 🔓 Only the `id` and `name` fields are returned — no secrets, webhook URLs, or merchant identifiers are ever exposed.

---

### 6. Revoke Access Token

Users can revoke access from their **Connected Apps** settings in the NoCap app, or your app can call:

**`POST /api-revoke`**

Requires: User's `Authorization: Bearer SUPABASE_SESSION_TOKEN`

```bash
curl -X POST https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1/api-revoke \
  -H "Authorization: Bearer USER_SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "token_id": "TOKEN_UUID" }'
```

---

## API Endpoints — Wallet Top-Up

These endpoints allow your application to initiate wallet top-ups for users via FPX bank transfer. Requires the `topup` OAuth scope.

### 6b. Initiate Top-Up

**`POST /api-topup`**

Requires scope: `topup`

```bash
curl -X POST https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1/api-topup \
  -H "x-api-key: YOUR_API_KEY" \
  -H "x-api-secret: YOUR_API_SECRET" \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 50.00,
    "description": "Wallet reload",
    "reference": "topup_001"
  }'
```

**Request Body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `amount` | number | ✅ | Top-up amount in MYR (10.00 – 500.00) |
| `description` | string | Optional | Description for the top-up |
| `reference` | string | Optional | Your internal reference ID. Must be unique — duplicate references are rejected for idempotency. |

**Success Response (200):**

```json
{
  "success": true,
  "payment_url": "https://cloud.raudhahpay.com/payment/...",
  "transaction_id": "uuid",
  "bill_code": "BILL-123",
  "amount": 50.00
}
```

| Field | Description |
|---|---|
| `payment_url` | URL to open in the user's browser for FPX payment |
| `transaction_id` | NoCap transaction UUID for tracking |
| `bill_code` | RaudhahPay bill code |
| `amount` | Confirmed top-up amount |

> Open the `payment_url` in the user's browser or webview. After successful FPX payment, the wallet is credited automatically. Your app will receive a `topup.completed` or `topup.failed` webhook event.

**Error Responses:**

| Status | Code | Meaning |
|---|---|---|
| 400 | `INVALID_AMOUNT` | Amount outside RM10–RM500 range |
| 401 | — | Missing or invalid API key / access token |
| 403 | `SCOPE_REQUIRED` | Access token missing `topup` scope |
| 409 | `DUPLICATE_REFERENCE` | A top-up with this reference already exists |

**Error Response Examples:**

```json
// 400 Bad Request — Invalid amount
{ "error": "Amount must be between RM 10.00 and RM 500.00" }

// 401 Unauthorized — Missing or invalid credentials
{ "error": "Missing or invalid API key" }

// 403 Forbidden — Token lacks topup scope
{ "error": "Access token does not have the required scope: topup" }

// 409 Conflict — Duplicate reference
{
  "error": "A top-up with this reference already exists",
  "code": "DUPLICATE_REFERENCE",
  "existing_transaction_id": "uuid"
}
```

> **Sandbox Mode:** In sandbox mode, the top-up completes immediately without creating a real payment bill. The wallet is credited instantly and a mock `payment_url` is returned.

---

## API Endpoints — Referral / Affiliate

These endpoints allow your application to access NoCap's multi-tier referral system. All require the `referral` scope unless noted.

### 7. Get Referral Info

**`GET /api-referral-info`**

Requires scope: `referral`

```bash
curl https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1/api-referral-info \
  -H "x-api-key: YOUR_API_KEY" \
  -H "x-api-secret: YOUR_API_SECRET" \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

**Response (200):**

```json
{
  "referral_code": "A1B2C3D4",
  "referral_link": "https://nocap.life/auth?ref=A1B2C3D4",
  "stats": {
    "direct_referrals": 12,
    "network_size": 45,
    "total_cashback": 230.50,
    "total_commission": 85.00
  }
}
```

---

### 8. Register User via Referral

**`POST /api-referral-register`**

Requires: `x-api-key` + `x-api-secret` only (**no Bearer token needed**)

This endpoint allows your system to programmatically create NoCap accounts for your customers, linking them under a referral code.

```bash
curl -X POST https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1/api-referral-register \
  -H "x-api-key: YOUR_API_KEY" \
  -H "x-api-secret: YOUR_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "customer@example.com",
    "referral_code": "A1B2C3D4",
    "full_name": "John Doe"
  }'
```

**Request Body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `email` | string | ✅ | Customer's email address |
| `referral_code` | string | ✅ | Existing referral code to link under |
| `full_name` | string | Optional | Customer's full name |

**Response (200):**

```json
{
  "success": true,
  "user_id": "uuid",
  "referral_code": "X9Y8Z7W6",
  "access_token": "64-character-hex-string"
}
```

> The returned `access_token` has `balance`, `charge`, and `referral` scopes. Store it securely to make API calls on behalf of this user.

---

### 9. Get Referral Network

**`GET /api-referral-network`**

Requires scope: `referral`

Returns the user's multi-tier referral network (up to 5 tiers).

```bash
curl https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1/api-referral-network \
  -H "x-api-key: YOUR_API_KEY" \
  -H "x-api-secret: YOUR_API_SECRET" \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

**Response (200):**

```json
{
  "tiers": [
    {
      "tier": 1,
      "members": [
        {
          "user_id": "uuid",
          "full_name": "Jane Doe",
          "email": "jane@example.com",
          "joined_at": "2026-02-01T00:00:00Z"
        }
      ]
    },
    {
      "tier": 2,
      "members": [...]
    }
  ],
  "total_network_size": 45
}
```

---

### 10. Get Cashback / Commission History

**`GET /api-cashback-history`**

Requires scope: `referral`

Returns paginated cashback and commission transaction history.

```bash
curl "https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1/api-cashback-history?page=1&limit=20&type=cashback" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "x-api-secret: YOUR_API_SECRET" \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

**Query Parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | integer | 1 | Page number |
| `limit` | integer | 20 | Results per page (max 100) |
| `type` | string | — | Filter: `cashback` or `commission` |
| `from` | ISO date | — | Start date filter |
| `to` | ISO date | — | End date filter |

**Response (200):**

```json
{
  "transactions": [
    {
      "id": "uuid",
      "type": "cashback",
      "amount": 2.50,
      "description": "Cashback from payment",
      "created_at": "2026-02-17T10:00:00Z"
    }
  ],
  "totals": {
    "total_cashback": 230.50,
    "total_commission": 85.00
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "total_pages": 8,
    "has_more": true
  }
}
```

---

## Webhooks

If your application has a `webhook_url` configured, NoCap sends real-time POST notifications for charge events.

### Configuration

Set your webhook URL in the Merchant Dashboard → API Apps → Edit Webhook URL.

> ⚠️ **Your webhook endpoint must respond within 10 seconds.** Use a queue or background job for slow processing.

### Security — Signature Verification

Every webhook includes an **HMAC-SHA256 signature** in the `X-Webhook-Signature` header, computed using your app's `api_secret_hash` (the SHA-256 hash of your `api_secret`) as the HMAC key and the raw JSON payload body as the message.

**You MUST verify this signature** on every webhook to ensure:
1. The request is genuinely from NoCap (not forged)
2. The payload has not been tampered with in transit

#### How Signing Works

```
HMAC-SHA256(
  key   = SHA256(your_api_secret),   ← this is api_secret_hash
  msg   = raw_json_payload_string
) → hex_signature
```

NoCap stores only the **hash** of your API secret (`api_secret_hash`). This hash is used as the HMAC signing key. Your server must also compute `SHA256(api_secret)` once and store it for verification.

#### Verification — Node.js / TypeScript

```javascript
const crypto = require('crypto');

// Compute once at startup and cache:
const API_SECRET = process.env.NOCAP_API_SECRET;
const API_SECRET_HASH = crypto
  .createHash('sha256')
  .update(API_SECRET)
  .digest('hex');

function verifyWebhook(rawBody, signatureHeader) {
  const expected = crypto
    .createHmac('sha256', API_SECRET_HASH)
    .update(rawBody)
    .digest('hex');

  // Use timing-safe comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(expected, 'hex'),
    Buffer.from(signatureHeader, 'hex')
  );
}

// Express.js example
app.post('/webhooks/nocap', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const rawBody = req.body.toString();

  if (!verifyWebhook(rawBody, signature)) {
    console.error('Invalid webhook signature — rejecting');
    return res.status(401).send('Invalid signature');
  }

  const event = JSON.parse(rawBody);
  console.log(`Received ${event.event} for charge ${event.charge_id}`);

  // Process the event (use a queue for slow operations)
  switch (event.event) {
    case 'charge.completed':
      // Mark order as paid
      break;
    case 'charge.failed':
      // Handle failure (show reason: event.reason)
      break;
    case 'charge.refunded':
    case 'charge.partial_refund':
      // Process refund
      break;
  }

  res.status(200).send('OK');
});
```

#### Verification — Python

```python
import hmac
import hashlib
import json

# Compute once at startup:
API_SECRET = os.environ['NOCAP_API_SECRET']
API_SECRET_HASH = hashlib.sha256(API_SECRET.encode()).hexdigest()

def verify_webhook(raw_body: str, signature_header: str) -> bool:
    expected = hmac.new(
        API_SECRET_HASH.encode(),
        raw_body.encode(),
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature_header)

# Flask example
@app.route('/webhooks/nocap', methods=['POST'])
def handle_webhook():
    signature = request.headers.get('X-Webhook-Signature')
    raw_body = request.get_data(as_text=True)

    if not verify_webhook(raw_body, signature):
        return 'Invalid signature', 401

    event = json.loads(raw_body)
    # Process event...
    return 'OK', 200
```

#### Verification — PHP

```php
$apiSecret = getenv('NOCAP_API_SECRET');
$apiSecretHash = hash('sha256', $apiSecret);

$rawBody = file_get_contents('php://input');
$signature = $_SERVER['HTTP_X_WEBHOOK_SIGNATURE'] ?? '';

$expected = hash_hmac('sha256', $rawBody, $apiSecretHash);

if (!hash_equals($expected, $signature)) {
    http_response_code(401);
    die('Invalid signature');
}

$event = json_decode($rawBody, true);
// Process event...
http_response_code(200);
echo 'OK';
```

#### Verification — Go

```go
func verifyWebhook(rawBody []byte, signature, apiSecretHash string) bool {
    mac := hmac.New(sha256.New, []byte(apiSecretHash))
    mac.Write(rawBody)
    expected := hex.EncodeToString(mac.Sum(nil))
    return hmac.Equal([]byte(expected), []byte(signature))
}
```

### Important Security Notes

1. **Always use the raw request body** for verification — do not re-serialize parsed JSON, as whitespace or key ordering may differ.
2. **Use constant-time comparison** (`timingSafeEqual`, `compare_digest`, `hash_equals`) to prevent timing attacks.
3. **Reject requests with missing or invalid signatures** immediately with `401`.
4. **Log rejected webhooks** for monitoring but do not expose internal details in the response.
5. **Store `api_secret_hash`** (not the raw secret) — compute `SHA256(api_secret)` once and cache it.

### Headers

| Header | Description |
|---|---|
| `Content-Type` | `application/json` |
| `X-Webhook-Signature` | HMAC-SHA256 hex signature (64 characters) |
| `X-Webhook-Attempt` | Retry attempt number (1–3) |

### Events

#### `charge.completed`

Fired when a charge is successfully processed and funds have moved.

```json
{
  "event": "charge.completed",
  "charge_id": "uuid",
  "transaction_id": "uuid",
  "amount": 10.00,
  "description": "Order #123",
  "reference": "order-123",
  "status": "completed",
  "metadata": { "order_id": "abc-123" },
  "timestamp": "2026-02-17T10:00:01Z"
}
```

#### `charge.failed`

Fired when a charge cannot be completed. Check `reason` for the specific failure code.

```json
{
  "event": "charge.failed",
  "charge_id": "uuid",
  "amount": 10.00,
  "description": "Order #123",
  "reference": "order-123",
  "status": "failed",
  "reason": "INSUFFICIENT_BALANCE",
  "metadata": {},
  "timestamp": "2026-02-17T10:00:01Z"
}
```

**Failure reason codes:** `PIN_REQUIRED`, `PIN_NOT_SET`, `INVALID_PIN`, `PIN_LOCKED`, `INSUFFICIENT_BALANCE`

#### `charge.refunded` / `charge.partial_refund`

Fired when a refund is processed. `charge.refunded` means the full amount was returned; `charge.partial_refund` means only part was refunded.

```json
{
  "event": "charge.refunded",
  "charge_id": "uuid",
  "transaction_id": "uuid",
  "refund_amount": 10.00,
  "total_refunded": 10.00,
  "charge_amount": 10.00,
  "reason": "Customer requested",
  "status": "refunded",
  "timestamp": "2026-02-17T10:00:01Z"
}
```

#### `topup.completed`

Fired when an API-initiated wallet top-up is successfully paid via FPX.

```json
{
  "event": "topup.completed",
  "transaction_id": "uuid",
  "amount": 50.00,
  "reference": "topup_001",
  "status": "completed",
  "timestamp": "2026-03-01T10:00:00Z"
}
```

#### `topup.failed`

Fired when an API-initiated wallet top-up payment fails or is cancelled.

```json
{
  "event": "topup.failed",
  "transaction_id": "uuid",
  "amount": 50.00,
  "reference": "topup_001",
  "status": "failed",
  "timestamp": "2026-03-01T10:05:00Z"
}
```

### Retry Policy

NoCap retries failed webhook deliveries up to **3 times** with exponential backoff:

| Attempt | Delay |
|---|---|
| 1 | Immediate |
| 2 | 1 second |
| 3 | 2 seconds |

Respond with any `2xx` status code to acknowledge receipt. Non-2xx responses or network errors trigger a retry. After 3 failed attempts, the webhook is marked as undelivered (logged in `api_request_logs`).

### Testing Webhooks

1. **Sandbox mode**: Webhooks fire normally with `is_sandbox: true` — use this for development.
2. **Use a tunnel**: Tools like ngrok or Cloudflare Tunnel expose your local server for webhook testing.
3. **Check delivery logs**: All webhook attempts (including failures) are logged in the API request logs visible in the Merchant Dashboard.

---

## Rate Limits

| Endpoint | Limit | Window |
|---|---|---|
| `/authorize` | 10 requests | per minute per user |
| `/api-token-exchange` | 10 requests | per minute per app |
| `/api-balance` | 60 requests | per minute per API key |
| `/api-charge` | 30 requests | per minute per API key |
| `/api-charge-status` | 60 requests | per minute per API key |
| `/api-charges-list` | 60 requests | per minute per API key |
| `/api-refund` | 20 requests | per minute per API key |
| `/api-branches` | 60 requests | per minute per API key |
| `/api-referral-info` | 60 requests | per minute per API key |
| `/api-referral-register` | 10 requests | per minute per API key |
| `/api-referral-network` | 30 requests | per minute per API key |
| `/api-cashback-history` | 60 requests | per minute per API key |
| `/api-topup` | 30 requests | per minute per API key |

When rate-limited, you'll receive a `429` response with a `Retry-After: 60` header.

---

## Error Codes

All error responses follow this format:

```json
{
  "error": "Human-readable error message",
  "code": "MACHINE_READABLE_CODE",
  "charge_id": "uuid (if applicable)"
}
```

### Common HTTP Status Codes

| Status | Meaning |
|---|---|
| 200 | Success |
| 400 | Bad request (invalid parameters) |
| 401 | Authentication failed (invalid credentials or token) |
| 403 | Forbidden (insufficient scope or invalid PIN) |
| 404 | Resource not found |
| 405 | Method not allowed |
| 409 | Conflict (deprecated — scope upgrades now replace old tokens) |
| 429 | Rate limit exceeded |
| 500 | Internal server error |

### Charge-Specific Error Codes

| Code | Description | Action |
|---|---|---|
| `PIN_REQUIRED` | Amount exceeds threshold | Re-submit with `pin` field |
| `PIN_NOT_SET` | User has no PIN configured | Prompt user to set PIN in NoCap app |
| `INVALID_PIN` | Wrong PIN provided | Ask user to retry |
| `INSUFFICIENT_BALANCE` | Wallet balance too low | Prompt user to top up |

---

## Sandbox Mode

Apps created in **Sandbox mode** skip all balance checks, PIN verification, and real money movement. Use sandbox for development and testing.

### Sandbox Behavior

- Charges complete instantly without deducting real balances
- Webhooks fire normally (with `is_sandbox: true`)
- Refunds process without checking branch wallet balance
- Response includes `is_sandbox: true`

### Quick Test Token

For rapid sandbox testing without the full OAuth flow, use the **Generate Test Token** feature in the NoCap API documentation page (`/api-docs`).

---

## Quick Start Checklist

- [ ] Register an API app in the NoCap Merchant Dashboard
- [ ] Save your `app_id`, `api_key`, and `api_secret` securely
- [ ] Create a sandbox app for development
- [ ] Implement the OAuth flow (Steps 1–4)
- [ ] Set up your webhook endpoint and verify signatures
- [ ] Test with sandbox mode
- [ ] Switch to your live app for production
- [ ] Request `referral` scope if you need affiliate features

---

## 3rd Party Integration Roadmap

This section provides a complete step-by-step guide for integrating NoCap into your system. Two paths are available:

- **Path A** (Prompts 1–9): New to NoCap — full integration from scratch
- **Path B** (Prompts 6–9 only): Already have NoCap wallet — upgrade only
- **Path C** (Prompts 10–12): Add wallet top-up to existing integration

> **Important:** Existing users do NOT need to disconnect. Wallet and payment features continue working throughout the upgrade. Users only re-authorize once to unlock referral features.

### Quick Reference

| Prompt | New Integration | Existing (Upgrade) | Top-Up |
|--------|:-:|:-:|:-:|
| 1 — Credentials & DB | ✅ | Skip | Skip |
| 2 — API Service Layer | ✅ | Skip | Skip |
| 3 — OAuth Connection | ✅ | Skip | Skip |
| 4 — Registration with Referral | ✅ | Skip | Skip |
| 5 — Wallet Payment Checkout | ✅ | Skip | Skip |
| 6 — Upgrade DB + New API Functions | ✅ | **Start here** | Skip |
| 7 — Re-authorize for Referral Scope | ✅ | ✅ | Skip |
| 8 — Multi-Branch Charge Routing | ✅ | ✅ | Skip |
| 9 — Referral Dashboard & Admin | ✅ | ✅ | Skip |
| 10 — Top-Up API Service Function | Skip | Skip | **Start here** |
| 11 — Re-authorize for Top-Up Scope | Skip | Skip | ✅ |
| 12 — Top-Up UI & Webhook Handling | Skip | Skip | ✅ |

---

### Pre-Integration: NoCap Merchant Setup

Before handing prompts to your developer, the **NoCap merchant** must complete these steps in the NoCap Merchant Dashboard:

#### Fresh Integration (New to NoCap API)

1. **Register as a Merchant** — Complete the merchant application at `/merchant-register` and wait for admin approval.
2. **Create Branches** — Add all outlet locations under Branch Management. Each branch gets a unique QR code.
3. **Create a Merchant-Level API App** — Go to API Apps → Create App. Select **"All Branches"** so the app covers every outlet with a single set of credentials.
4. **Save Credentials** — Securely copy and share `app_id`, `api_key`, and `api_secret` with your developer. The `api_secret` is shown only once.
5. **Set Webhook URL** — Enter your server's webhook endpoint in the app settings.
6. **Enable Sandbox** — Toggle sandbox mode for development/testing.

#### Upgrade Integration (Already Using NoCap Wallet)

1. **Create a NEW Merchant-Level API App** — Select "All Branches". Keep the old branch-level app active during transition.
2. **Share New Credentials** — Provide `app_id`, `api_key`, and `api_secret` to your 3rd party developer.
3. **Set Webhook URL** — Configure the webhook endpoint on the new app.
4. **Transition Period** — Once the 3rd party completes Prompts 6–9, existing members re-authorize and the old branch-level app can be deactivated.

---

### 3rd Party System Enhancements Required

Summary of all changes needed on the 3rd party system:

| Enhancement | Fresh Integration | Upgrade |
|---|---|---|
| `nocap_connections` table | New table | Add `referral_code` + `scopes` columns |
| `nocap_branch_mappings` table | New table | New table |
| API service layer | Build full (10 functions) | Add referral + branch functions |
| OAuth flow | Build with all 3 scopes | Update to include `referral` scope |
| Charge routing | Include `branch_id` | Update `createCharge` for `branch_id` |
| Re-authorization banner | Build | Build |
| Referral dashboard UI | Build | Build |
| Webhook verification | Build HMAC-SHA256 | No change (already implemented) |

---

### Member Action Required

Existing connected members do **NOT** need to disconnect or create new accounts:

1. **Current State** — Members already connected via OAuth have `balance` and `charge` scopes. Wallet and payments continue working normally.
2. **Re-authorization** — The 3rd party system shows a banner: **"Unlock Referral Rewards!"** for members missing the `referral` scope.
3. **One-Click Upgrade** — Member clicks the banner → redirected to NoCap `/authorize` with `scope=balance,charge,referral` → approves → redirected back.
4. **Token Swap** — NoCap automatically revokes the old token and issues a new one with all 3 scopes. No conflict errors.
5. **No Disruption** — Wallet balance, payment history, and all existing features remain intact throughout.

---

### Prompt 1 — Store NoCap API Credentials (New integrators only)

> **NoCap Merchant Action:** Must have created a merchant-level API app and shared credentials before this step.

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

> **Member Impact:** None — this is backend setup only.

---

### Prompt 2 — Build NoCap API Service Layer (New integrators only)

> **NoCap Merchant Action:** None — credentials already shared in Prompt 1.

```
Create an API service file for NoCap endpoints.
Use stored secrets. Base URL: https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1

WALLET & PAYMENTS:
1. checkBalance(accessToken) -> GET /api-balance
2. createCharge(accessToken, amount, description, reference, pin?,
   branch_id?, metadata?) -> POST /api-charge
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

> **Member Impact:** None — this is backend code only.

---

### Prompt 3 — OAuth Wallet Connection Flow (New integrators only)

> **NoCap Merchant Action:** Ensure the redirect URI matches the 3rd party callback URL.

```
Add "Connect NoCap Wallet" button. Redirect to:
https://nocap.life/authorize?app_id=NOCAP_APP_ID
  &redirect_uri=OUR_CALLBACK
  &scope=balance,charge,referral
  &state=RANDOM

Request ALL three scopes upfront.

Callback page:
1. Receive ?code=XXX&state=YYY
2. Verify state (CSRF protection)
3. Call POST /api-token-exchange with { code, app_id, app_secret }
4. Store access_token, scopes, user info in nocap_connections
5. Show success and redirect to dashboard

Handle ?error=access_denied case.
```

> **Member Impact:** Members see a consent screen and approve access. Their NoCap wallet is linked to the 3rd party system.

---

### Prompt 4 — New Customer Registration with Referral (New integrators only)

> **NoCap Merchant Action:** None — the API handles registration automatically.

```
When new customer signs up with a referral code:
1. Add optional "Referral Code" field to signup form
2. After our account creation, call POST /api-referral-register
3. Store returned access_token, nocap_user_id, referral_code
4. Customer is auto-connected — no OAuth needed
5. Show their own referral code

If no referral code, skip NoCap auto-registration.
If NoCap registration fails, don't block our signup.
```

> **Member Impact:** New members get a NoCap wallet automatically if they enter a referral code. No separate NoCap signup required.

---

### Prompt 5 — Wallet Payment in Checkout (New integrators only)

> **NoCap Merchant Action:** Ensure sandbox mode is enabled for testing, then switch to live when ready.

```
Add NoCap as payment option in checkout:
1. Show NoCap balance (GET /api-balance)
2. Call POST /api-charge with { amount, description, reference,
   branch_id, metadata }
3. Handle PIN_REQUIRED: show PIN input, retry with PIN
4. Handle INSUFFICIENT_BALANCE: show top-up message
5. On success, mark order as paid

Webhook handling:
- Verify X-Webhook-Signature (HMAC-SHA256)
- Handle charge.completed, charge.failed, charge.refunded
```

> **Member Impact:** Members can now pay with their NoCap wallet at checkout.

---

### Start Here If Already Integrated

### Prompt 6 — Upgrade for Affiliate and Multi-Branch (All integrators)

> **NoCap Merchant Action:** Must have created a NEW merchant-level API app ("All Branches") and shared the new credentials.

```
Upgrading existing NoCap integration. DO NOT remove existing wallet features.

1. Add to nocap_connections table:
   - referral_code (text)
   - scopes (text array)

2. Create "nocap_branch_mappings" table:
   - id, our_outlet_id, nocap_branch_id, nocap_branch_name,
     created_at, updated_at

3. Add new functions to existing NoCap API service:
   REFERRAL: getReferralInfo, registerViaReferral,
             getReferralNetwork, getCashbackHistory
   BRANCH:   listBranches() -> GET /api-branches

4. Update existing createCharge to accept optional branch_id parameter.
   Required for merchant-level apps.

Base URL: https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1
```

> **Member Impact:** None — this is backend preparation. Existing wallet features are untouched.

---

### Prompt 7 — Re-authorize Existing Users for Referral Scope (All integrators)

> **NoCap Merchant Action:** None — the OAuth upgrade is handled automatically by NoCap.

```
Existing customers have only "balance" and "charge" scopes.
DO NOT break existing wallet functionality.

1. Check stored scopes for each connected customer
2. If missing "referral", show banner: "Unlock Referral Rewards!"
3. On click, redirect to NoCap authorize with
   scope=balance,charge,referral
4. NoCap auto-revokes old token and issues new one
5. Exchange code via POST /api-token-exchange (same existing flow)
6. Update stored access_token and scopes
7. Hide banner once referral scope granted

Also: when new customers sign up with referral code,
call POST /api-referral-register to auto-create their NoCap account.
```

> **Member Impact:** Members see a one-time banner prompting them to unlock referral rewards. One click → approve → done. Wallet continues working throughout.

---

### Prompt 8 — Multi-Branch Charge Routing (All integrators)

> **NoCap Merchant Action:** Ensure all branches are created in the NoCap Merchant Dashboard before this step. New branches can be added later (see "When a New Branch Opens" below).

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

> **Member Impact:** None — branch routing is transparent to members. Payments work the same way.

---

### Prompt 9 — Referral Dashboard and Admin Panel (All integrators)

> **NoCap Merchant Action:** None — all data comes from NoCap API endpoints.

```
DO NOT modify existing wallet/payment UI. Add new sections:

CUSTOMER DASHBOARD (only if referral scope granted):
1. Referral code with copy/share buttons (GET /api-referral-info)
2. Stats cards: direct referrals, network size, cashback, commission
3. Network tree Tiers 1-5 (GET /api-referral-network)
4. Earnings history with cashback/commission tabs
   (GET /api-cashback-history)
5. Share feature: "Join us! Use my code: XXXX"

ADMIN SECTION:
- Branch mapping management
- Connected customers overview
- Top referrers by network size
```

> **Member Impact:** Members with referral scope see a new Referral Dashboard with their stats, network tree, and earnings history.

---

### Prompt 10 — Add Top-Up API Service Function (Top-Up upgrade)

> **NoCap Merchant Action:** None — existing API credentials support the top-up endpoint.

```
Add a createTopUp service function to your existing NoCap API service.

Endpoint: POST /api-topup
Headers: x-api-key, x-api-secret (server-to-server), Authorization: Bearer <access_token>
Body: { amount, description, reference }
- amount: RM10–RM500
- reference: unique per request for idempotency

Response: { payment_url, transaction_id, bill_code, amount }

Handle errors:
- 400: amount out of range or duplicate reference
- 401: invalid/expired token
- 403: missing topup scope
```

> **Member Impact:** None — backend code only.

---

### Prompt 11 — Re-authorize for Top-Up Scope (Top-Up upgrade)

> **NoCap Merchant Action:** None — the OAuth upgrade is handled automatically by NoCap.

```
Check stored scopes in nocap_connections for each connected customer.
If missing "topup" scope, show banner: "Enable Wallet Top-Up!"

On click, redirect to NoCap authorize with:
  scope=balance,charge,referral,topup
  (same state/redirect_uri pattern as existing OAuth flow)

NoCap auto-revokes old token and issues new one with all four scopes.
Exchange code via POST /api-token-exchange (same existing flow).
Update stored access_token and scopes in nocap_connections.
Hide banner once topup scope is granted.

DO NOT break existing wallet, payment, or referral functionality.
```

> **Member Impact:** Members see a one-time banner. One click → approve → done. Existing wallet, payment, and referral features continue working throughout.

---

### Prompt 12 — Top-Up UI & Webhook Handling (Top-Up upgrade)

> **NoCap Merchant Action:** Ensure webhook URL is configured to receive `topup.completed` and `topup.failed` events.

```
Build a "Top Up NoCap Wallet" button or page.
DO NOT modify existing wallet/payment/referral UI.

1. Show current balance via GET /api-balance
2. Let user enter amount (RM10–RM500)
3. On submit, call POST /api-topup with:
   { amount, description: "Wallet top-up", reference: <unique> }
4. Open returned payment_url in new tab/window for FPX payment
5. After redirect back, poll GET /api-balance to refresh balance

Webhook handling (same HMAC-SHA256 pattern as charge webhooks):
- topup.completed: update UI to reflect new balance
- topup.failed: show error to user
- Verify X-Webhook-Signature using constant-time comparison
```

> **Member Impact:** Members can top up their NoCap wallet directly from the 3rd party app via FPX bank transfer.

---

### When a New Branch Opens in Future

When a merchant expands and opens a new branch/outlet, here's what needs to happen on each side:

#### NoCap Merchant Actions

1. **Create the branch** in the NoCap Merchant Dashboard → Branch Management.
2. The new branch is **automatically available** via `GET /api-branches` — no API app changes needed.
3. **No credential rotation required** — merchant-level apps ("All Branches") automatically cover new branches.
4. No need to contact NoCap support or modify any API settings.

#### 3rd Party System Actions

1. **Refresh branch list** — Call `GET /api-branches` or click the "Refresh Branches" button (implemented in Prompt 8).
2. **Add mapping** — Insert a new row in `nocap_branch_mappings` linking the internal outlet ID to the new NoCap `branch_id`.
3. **Update branch selector** — The new branch appears in the admin mapping page. Map it to the correct internal outlet.
4. **Unmapped warning** — If Prompt 8's warning system is implemented, the new outlet surfaces as unmapped until configured.

#### Member Impact

- **No action required** from members — existing tokens and connections are completely unaffected.
- Payments at the new branch work **immediately** once the mapping is configured.
- No re-authorization, no new consent, no disruption.

> **Key Point:** Because merchant-level API apps cover all branches, no API credential changes or member re-authorization is ever needed when new branches are added. The only action is to refresh the branch list and update the mapping.

---

### FAQ — Common Integration Questions

**Q: Do existing users need to disconnect and reconnect?**
A: No. Existing wallet and payment features continue working with their current token. They only re-authorize once (Prompt 7) to unlock referral features.

**Q: What happens to old tokens during scope upgrade?**
A: The NoCap authorize endpoint automatically revokes the old token and issues a new one with updated scopes. No conflict errors.

**Q: Is `branch_id` required for all API charge requests?**
A: Only for merchant-level apps (registered without a specific branch). Branch-level apps default to their assigned branch.

**Q: Can I use both branch-level and merchant-level apps?**
A: Yes. Merchant-level apps offer flexibility for multi-outlet systems with a single set of credentials. Branch-level apps are simpler for single-location setups.

**Q: What do I do when a new branch opens?**
A: The NoCap merchant creates the branch in the dashboard. The 3rd party system refreshes the branch list via `GET /api-branches` and maps the new branch. No credential changes or member re-authorization needed.

**Q: Do I need a new API app for each branch?**
A: No. A single merchant-level API app ("All Branches") covers all current and future branches. Use `branch_id` in the charge request to route payments.

**Q: What if the merchant upgrades from branch-level to merchant-level app?**
A: Create a new merchant-level app, share credentials with the developer, and complete Prompts 6–9. Keep the old app active during transition. Deactivate it once all members have re-authorized.

**Q: How do I add wallet top-up to my existing integration?**
A: Follow Path C (Prompts 10–12). Add the `createTopUp` service function, re-authorize users for the `topup` scope, and build the top-up UI with webhook handling. No changes to existing wallet, payment, or referral features.

**Q: What scopes should I request for a full integration?**
A: Request `scope=balance,charge,referral,topup` to enable all features: balance checking, payments, referral tracking, and wallet top-ups.

---

## Support

For integration support, contact us at the NoCap Help & Support page.

---

*© 2026 NoCap. All rights reserved.*
