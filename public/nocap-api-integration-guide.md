# NoCap API — Integration Guide

> **Version:** 1.1  
> **Base URL:** `https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1`  
> **Authorization URL:** `https://nocap.life/authorize`  
> **Last Updated:** February 2026

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication (OAuth 2.0)](#authentication-oauth-20)
3. [API Endpoints — Wallet & Payments](#api-endpoints--wallet--payments)
4. [API Endpoints — Referral / Affiliate](#api-endpoints--referral--affiliate)
5. [Webhooks](#webhooks)
6. [Rate Limits](#rate-limits)
7. [Error Codes](#error-codes)
8. [Sandbox Mode](#sandbox-mode)
9. [3rd Party Integration Roadmap](#3rd-party-integration-roadmap)

---

## Overview

NoCap provides a REST API that allows third-party applications to:

- **Check user wallet balance** (`balance` scope)
- **Create charges / payments** from a user's wallet (`charge` scope)
- **Refund** completed charges (full or partial)
- **List and query** charge history
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
| `scope` | Optional | Comma-separated: `balance`, `charge`, `referral` (defaults to `balance,charge`) |
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

> If the user already has an active token for your app, the old token is automatically revoked and a new one is issued with the updated scopes. This allows seamless **scope upgrades** (e.g., adding `referral` to an existing `balance,charge` token).

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

If your application has a `webhook_url` configured, NoCap sends real-time notifications for charge events.

### Configuration

Set your webhook URL in the Merchant Dashboard → API Apps → Edit Webhook URL.

### Security — Signature Verification

Every webhook includes an HMAC-SHA256 signature in the `X-Webhook-Signature` header. **Always verify this** to ensure the request is from NoCap.

**Verification pseudocode:**

```python
import hmac, hashlib

def verify_webhook(payload_body, signature_header, api_secret_hash):
    expected = hmac.new(
        api_secret_hash.encode(),
        payload_body.encode(),
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature_header)
```

```javascript
// Node.js
const crypto = require('crypto');

function verifyWebhook(payloadBody, signatureHeader, apiSecretHash) {
  const expected = crypto
    .createHmac('sha256', apiSecretHash)
    .update(payloadBody)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signatureHeader)
  );
}
```

### Headers

| Header | Description |
|---|---|
| `Content-Type` | `application/json` |
| `X-Webhook-Signature` | HMAC-SHA256 hex signature |
| `X-Webhook-Attempt` | Retry attempt number (1–3) |

### Events

#### `charge.completed`

```json
{
  "event": "charge.completed",
  "charge_id": "uuid",
  "transaction_id": "uuid",
  "amount": 10.00,
  "description": "Order #123",
  "reference": "order-123",
  "status": "completed",
  "metadata": {},
  "timestamp": "2026-02-17T10:00:01Z"
}
```

#### `charge.failed`

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

**Failure reason codes:** `PIN_REQUIRED`, `PIN_NOT_SET`, `INVALID_PIN`, `INSUFFICIENT_BALANCE`

#### `charge.refunded` / `charge.partial_refund`

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

### Retry Policy

NoCap retries failed webhook deliveries up to **3 times** with exponential backoff:

| Attempt | Delay |
|---|---|
| 1 | Immediate |
| 2 | 1 second |
| 3 | 2 seconds |

Respond with any `2xx` status code to acknowledge receipt. Non-2xx responses or network errors trigger a retry.

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

> **Important:** Existing users do NOT need to disconnect. Wallet and payment features continue working throughout the upgrade. Users only re-authorize once to unlock referral features.

### Quick Reference

| Prompt | New Integration | Existing (Upgrade) |
|--------|:-:|:-:|
| 1 — Credentials & DB | ✅ | Skip |
| 2 — API Service Layer | ✅ | Skip |
| 3 — OAuth Connection | ✅ | Skip |
| 4 — Registration with Referral | ✅ | Skip |
| 5 — Wallet Payment Checkout | ✅ | Skip |
| 6 — Upgrade DB + New API Functions | ✅ | **Start here** |
| 7 — Re-authorize for Referral Scope | ✅ | ✅ |
| 8 — Multi-Branch Charge Routing | ✅ | ✅ |
| 9 — Referral Dashboard & Admin | ✅ | ✅ |

---

### Prompt 1 — Store NoCap API Credentials (New integrators only)

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

---

### Prompt 2 — Build NoCap API Service Layer (New integrators only)

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

---

### Prompt 3 — OAuth Wallet Connection Flow (New integrators only)

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

---

### Prompt 4 — New Customer Registration with Referral (New integrators only)

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

---

### Prompt 5 — Wallet Payment in Checkout (New integrators only)

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

---

### Start Here If Already Integrated

### Prompt 6 — Upgrade for Affiliate and Multi-Branch (All integrators)

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

---

### Prompt 7 — Re-authorize Existing Users for Referral Scope (All integrators)

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

---

### Prompt 8 — Multi-Branch Charge Routing (All integrators)

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

---

### Prompt 9 — Referral Dashboard and Admin Panel (All integrators)

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

---

### FAQ — Common Upgrade Questions

**Q: Do existing users need to disconnect and reconnect?**
A: No. Existing wallet and payment features continue working with their current token. They only re-authorize once (Prompt 7) to unlock referral features.

**Q: What happens to old tokens during scope upgrade?**
A: The NoCap authorize endpoint automatically revokes the old token and issues a new one with updated scopes. No conflict errors.

**Q: Is branch_id required for all API charge requests?**
A: Only for merchant-level apps (registered without a specific branch). Branch-level apps default to their assigned branch.

**Q: Can I use both branch-level and merchant-level apps?**
A: Yes. Merchant-level apps offer flexibility for multi-outlet systems with a single set of credentials. Branch-level apps are simpler for single-location setups.

---

## Support

For integration support, contact us at the NoCap Help & Support page.

---

*© 2026 NoCap. All rights reserved.*
