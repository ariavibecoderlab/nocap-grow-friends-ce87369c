# NoCap API — Integration Guide

> **Version:** 1.0  
> **Base URL:** `https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1`  
> **Authorization URL:** `https://nocap.life/authorize`  
> **Last Updated:** February 2026

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication (OAuth 2.0)](#authentication-oauth-20)
3. [API Endpoints](#api-endpoints)
4. [Webhooks](#webhooks)
5. [Rate Limits](#rate-limits)
6. [Error Codes](#error-codes)
7. [Sandbox Mode](#sandbox-mode)

---

## Overview

NoCap provides a REST API that allows third-party applications to:

- **Check user wallet balance** (`balance` scope)
- **Create charges / payments** from a user's wallet (`charge` scope)
- **Refund** completed charges (full or partial)
- **List and query** charge history

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
https://nocap.life/authorize?app_id=YOUR_APP_ID&redirect_uri=YOUR_CALLBACK_URL&scope=balance,charge&state=RANDOM_STATE
```

| Parameter | Required | Description |
|---|---|---|
| `app_id` | ✅ | Your application UUID |
| `redirect_uri` | ✅ | Where the user is sent after approval |
| `scope` | Optional | Comma-separated: `balance`, `charge` (defaults to both) |
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
  "scopes": ["balance", "charge"],
  "expires_in": 7776000
}
```

| Field | Description |
|---|---|
| `access_token` | 64-char hex token — store securely server-side |
| `token_type` | Always `"Bearer"` |
| `scopes` | Granted permissions |
| `expires_in` | Token lifetime in seconds (90 days = 7,776,000s) |

> If the user already has an active token for your app, the old token is automatically revoked.

---

## API Endpoints

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

> Only `completed` charges can be refunded. The refund is deducted from the branch wallet and credited to the user's wallet.

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
| 409 | Conflict (e.g., already authorized) |
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

---

## Support

For integration support, contact us at the NoCap Help & Support page.

---

*© 2026 NoCap. All rights reserved.*
