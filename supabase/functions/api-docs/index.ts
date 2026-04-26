const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BASE_URL = "https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1";

const API_DOCS_MARKDOWN = `# NoCap Wallet — Developer API Documentation

Full documentation: https://nocap.life/api-docs

---

## Getting Started

### 1. Register your App
Merchants can register third-party applications through the Merchant Dashboard under the "API" tab.
You will receive an **API Key** and an **API Secret**. Store the secret securely; it will only be shown once.

### 2. User Authorization (OAuth 2.0 Authorization Code Flow)
To access a user's wallet, redirect the user to our hosted authorization page. The user will log in (if not already), review the requested permissions, and approve or deny your app. Upon approval, we redirect the user back to your \`redirect_uri\` with a temporary authorization \`code\`. You then exchange this code for an access token via a server-to-server call.

**Flow:**
1. Redirect user → \`https://nocap.life/authorize?app_id=YOUR_APP_ID&redirect_uri=YOUR_CALLBACK&scope=balance,charge&state=RANDOM_STATE\`
2. User logs in & approves → Redirected to \`YOUR_CALLBACK?code=AUTH_CODE&state=RANDOM_STATE\`
3. Your server exchanges code → \`POST /api-token-exchange\` with \`{ code, app_id, app_secret }\`
4. Receive \`access_token\` → Use in \`Authorization: Bearer\` header for API calls

### 3. Sandbox Mode
Enable **Sandbox Mode** when creating an API app to test integrations without using real money.
Sandbox transactions are immediately marked as completed and do not deduct from wallets.

When you create a sandbox app, a **Test Access Token** is automatically generated. This token lets you skip the OAuth flow entirely — use it as the \`Authorization: Bearer\` header in place of a real user token.

### 4. Base URL
All API requests should be made to:
\`\`\`
\${BASE_URL}/
\`\`\`

### 5. Rate Limits

| Endpoint | Limit |
|---|---|
| /authorize (page) | N/A (user-facing) |
| /api-token-exchange | 10 req/min |
| /api-charge | 30 req/min |
| /api-refund | 20 req/min |
| /api-balance | 60 req/min |
| /api-charge-status | 60 req/min |
| /api-charges-list | 60 req/min |
| /api-referral-info | 60 req/min |
| /api-referral-register | 20 req/min |
| /api-referral-network | 30 req/min |
| /api-cashback-history | 60 req/min |

Exceeding the limit returns a \`429 Too Many Requests\` response with a \`Retry-After\` header.

---

## Authentication (OAuth 2.0 Authorization Code Grant)

### Step 1: Redirect User to Authorization Page

Redirect the user's browser to:

\`\`\`
https://nocap.life/authorize?app_id=YOUR_APP_ID&redirect_uri=YOUR_CALLBACK_URL&scope=balance,charge&state=RANDOM_STRING
\`\`\`

**Query Parameters:**
| Parameter | Required | Description |
|---|---|---|
| \`app_id\` | Yes | Your application's UUID |
| \`redirect_uri\` | Yes | URL to redirect after authorization |
| \`scope\` | No | Comma-separated: \`balance\`, \`charge\`, \`referral\`. Default: \`balance,charge\` |
| \`state\` | Recommended | Random string to prevent CSRF. Returned unchanged in callback |

The user will see a login screen (if not already logged in) and a consent screen showing the requested permissions.

### Step 2: Receive Authorization Code

After the user approves, they are redirected to your \`redirect_uri\` with:
\`\`\`
YOUR_CALLBACK_URL?code=AUTH_CODE_64_HEX_CHARS&state=YOUR_STATE
\`\`\`

If the user denies:
\`\`\`
YOUR_CALLBACK_URL?error=access_denied&error_description=User+denied+the+request&state=YOUR_STATE
\`\`\`

> ⚠️ Authorization codes expire in **10 minutes** and can only be used once.

### Step 3: Exchange Code for Access Token

**POST /api-token-exchange**

Your **server** (not client-side!) exchanges the authorization code for an access token.

**Body Parameters:**
- \`code\` (string, required): The authorization code from Step 2.
- \`app_id\` (string, required): Your application ID.
- \`app_secret\` (string, required): Your API secret.

**Request:**
\`\`\`bash
curl -X POST "\${BASE_URL}/api-token-exchange" \\
  -H "Content-Type: application/json" \\
  -d '{
    "code": "auth_code_from_redirect",
    "app_id": "your-app-uuid",
    "app_secret": "your-api-secret"
  }'
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "access_token": "a1b2c3d4e5f6...64_hex_chars",
  "token_type": "Bearer",
  "scopes": ["balance", "charge"],
  "expires_in": 7776000
}
\`\`\`

> ⚠️ Store the \`access_token\` securely on your server. It is shown only once.

> 🧪 **Sandbox Shortcut:** If your app is in Sandbox Mode, skip the OAuth flow entirely. A test access token is auto-generated when you create the app.

### POST /api-revoke
Revoke a user's access token, disconnecting your app from their wallet.

**Headers:** The user's \`Authorization\` (session token). No API Key/Secret needed.

**Body Parameters:**
- \`token_id\` (string, required): The ID of the access token to revoke.

**Request:**
\`\`\`bash
curl -X POST "\${BASE_URL}/api-revoke" \\
  -H "Authorization: Bearer user_session_token" \\
  -H "Content-Type: application/json" \\
  -d '{ "token_id": "uuid-of-the-token" }'
\`\`\`

**Response:**
\`\`\`json
{ "success": true }
\`\`\`

---

## Endpoints

### GET /api-balance
Retrieve the authenticated user's current VA balance.

**Headers:** X-Api-Key, X-Api-Secret, Authorization (Bearer token)

**Request:**
\`\`\`bash
curl -X GET "${BASE_URL}/api-balance" \\
  -H "X-Api-Key: your_api_key" \\
  -H "X-Api-Secret: your_api_secret" \\
  -H "Authorization: Bearer user_token"
\`\`\`

**Response:**
\`\`\`json
{
  "balance": 150.75,
  "currency": "MYR"
}
\`\`\`

### POST /api-charge
Initiate a payment from the user's wallet to your merchant branch.

**Headers:** X-Api-Key, X-Api-Secret, Authorization (Bearer token), Content-Type: application/json

**Body Parameters:**
- \`amount\` (number, required): The payment amount.
- \`description\` (string, optional): A brief description of the charge.
- \`reference\` (string, optional): Your internal transaction reference ID.
- \`metadata\` (object, optional): Custom key-value data (max 4KB). Returned in webhooks and charge queries.

**Request:**
\`\`\`bash
curl -X POST "${BASE_URL}/api-charge" \\
  -H "X-Api-Key: your_api_key" \\
  -H "X-Api-Secret: your_api_secret" \\
  -H "Authorization: Bearer user_token" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 10.50,
    "description": "Order #12345",
    "reference": "txn_88291",
    "metadata": { "order_id": "ORD-123", "customer_email": "user@example.com" }
  }'
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "charge_id": "uuid",
  "transaction_id": "uuid",
  "amount": 10.50,
  "new_balance": 140.25,
  "cashback": 0.09,
  "branch_name": "My Store"
}
\`\`\`

### GET /api-charge-status
Check the status of a specific charge request.

**Headers:** X-Api-Key, X-Api-Secret

**Query Parameters:**
- \`charge_id\` (string, required): The ID of the charge.

**Request:**
\`\`\`bash
curl -X GET "${BASE_URL}/api-charge-status?charge_id=uuid" \\
  -H "X-Api-Key: your_api_key" \\
  -H "X-Api-Secret: your_api_secret"
\`\`\`

**Response:**
\`\`\`json
{
  "id": "uuid",
  "amount": 10.50,
  "description": "Order #12345",
  "reference": "txn_88291",
  "status": "completed",
  "transaction_id": "uuid",
  "created_at": "2026-02-16T12:00:00.000Z",
  "completed_at": "2026-02-16T12:00:01.000Z"
}
\`\`\`

### POST /api-refund
Issue a full or partial refund for a completed charge.

**Headers:** X-Api-Key, X-Api-Secret (no user token needed — merchant initiates refunds)

**Body Parameters:**
- \`charge_id\` (string, required): The charge ID to refund.
- \`amount\` (number, optional): Partial refund amount. Omit for full refund.
- \`reason\` (string, optional): Reason for the refund.

**Request:**
\`\`\`bash
curl -X POST "${BASE_URL}/api-refund" \\
  -H "X-Api-Key: your_api_key" \\
  -H "X-Api-Secret: your_api_secret" \\
  -H "Content-Type: application/json" \\
  -d '{
    "charge_id": "uuid-of-the-charge",
    "amount": 5.00,
    "reason": "Customer returned item"
  }'
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "refund_amount": 5.00,
  "total_refunded": 5.00,
  "charge_amount": 10.50,
  "status": "partial_refund",
  "transaction_id": "uuid"
}
\`\`\`

### GET /api-charges-list
Retrieve a paginated list of charges for your API app with optional filters.

**Headers:** X-Api-Key, X-Api-Secret

**Query Parameters:**
- \`page\` (number, optional): Page number. Default: 1.
- \`limit\` (number, optional): Items per page (1–100). Default: 20.
- \`status\` (string, optional): Filter by status (pending, completed, failed, refunded, partial_refund).
- \`from\` (string, optional): ISO 8601 date. Only charges created on or after this date.
- \`to\` (string, optional): ISO 8601 date. Only charges created on or before this date.
- \`reference\` (string, optional): Filter by your internal reference ID.
- \`user_id\` (string, optional): Filter by a specific user's charges.

**Request:**
\`\`\`bash
curl -X GET "${BASE_URL}/api-charges-list?page=1&limit=10&status=completed" \\
  -H "X-Api-Key: your_api_key" \\
  -H "X-Api-Secret: your_api_secret"
\`\`\`

**Response:**
\`\`\`json
{
  "data": [
    {
      "id": "uuid",
      "amount": 10.50,
      "description": "Order #12345",
      "reference": "txn_88291",
      "status": "completed",
      "is_sandbox": false,
      "transaction_id": "uuid",
      "user_id": "uuid",
      "created_at": "2026-02-16T12:00:00.000Z",
      "completed_at": "2026-02-16T12:00:01.000Z",
      "metadata": {}
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 42,
    "total_pages": 5,
    "has_more": true
  }
}
\`\`\`

---

## Referral / Affiliate Endpoints

These endpoints require the \`referral\` scope. Existing connected users need to re-authorize with \`scope=balance,charge,referral\` to gain access.

### GET /api-referral-info
Get the connected user's referral code, stats, and earnings.

**Headers:** X-Api-Key, X-Api-Secret, Authorization (Bearer token)

**Request:**
\`\`\`bash
curl -X GET "${BASE_URL}/api-referral-info" \\
  -H "X-Api-Key: your_api_key" \\
  -H "X-Api-Secret: your_api_secret" \\
  -H "Authorization: Bearer user_token"
\`\`\`

**Response:**
\`\`\`json
{
  "referral_code": "A1B2C3D4",
  "referral_link": "https://nocap.life/auth?ref=A1B2C3D4",
  "stats": {
    "direct_referrals": 5,
    "network_size": 12,
    "total_cashback": 15.50,
    "total_commission": 32.00
  }
}
\`\`\`

### POST /api-referral-register
Register a new NoCap account for a customer via API, automatically linked by referral code. **Auth:** API Key + Secret only (no bearer token needed).

**Headers:** X-Api-Key, X-Api-Secret, Content-Type: application/json

**Body Parameters:**
- \`email\` (string, required): New user's email address.
- \`full_name\` (string, optional): User's full name.
- \`phone\` (string, optional): User's phone number in Malaysian format (\`+60xxxxxxxxx\` or \`01xxxxxxxxx\`).
- \`referral_code\` (string, optional): Referral code of the referring user.

**Request:**
\`\`\`bash
curl -X POST "${BASE_URL}/api-referral-register" \\
  -H "X-Api-Key: your_api_key" \\
  -H "X-Api-Secret: your_api_secret" \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "newuser@example.com",
    "full_name": "Ahmad Bin Ali",
    "phone": "+60123456789",
    "referral_code": "A1B2C3D4"
  }'
\`\`\`

**Response (201):**
\`\`\`json
{
  "success": true,
  "user_id": "uuid",
  "referral_code": "NEW_CODE",
  "access_token": "64_hex_chars",
  "scopes": ["balance", "charge", "referral"],
  "message": "User registered and connected"
}
\`\`\`

> If the email is already registered, returns 409 with a message to use the OAuth flow instead.

> A \`user.registered\` webhook event is sent if your app has a webhook URL configured.

### GET /api-referral-network
Get the user's referral tree (Tiers 1-5).

**Headers:** X-Api-Key, X-Api-Secret, Authorization (Bearer token)

**Request:**
\`\`\`bash
curl -X GET "${BASE_URL}/api-referral-network" \\
  -H "X-Api-Key: your_api_key" \\
  -H "X-Api-Secret: your_api_secret" \\
  -H "Authorization: Bearer user_token"
\`\`\`

**Response:**
\`\`\`json
{
  "tiers": [
    { "tier": 1, "count": 3, "members": [{"name": "Ahmad", "joined": "2026-02-23"}] },
    { "tier": 2, "count": 5, "members": [{"name": "Siti", "joined": "2026-02-24"}] }
  ]
}
\`\`\`

### GET /api-cashback-history
Get the user's cashback and commission transaction history with pagination.

**Headers:** X-Api-Key, X-Api-Secret, Authorization (Bearer token)

**Query Parameters:**
- \`page\` (number, optional): Page number. Default: 1.
- \`limit\` (number, optional): Items per page (1–100). Default: 50.

**Request:**
\`\`\`bash
curl -X GET "${BASE_URL}/api-cashback-history?page=1&limit=20" \\
  -H "X-Api-Key: your_api_key" \\
  -H "X-Api-Secret: your_api_secret" \\
  -H "Authorization: Bearer user_token"
\`\`\`

**Response:**
\`\`\`json
{
  "transactions": [
    { "type": "cashback", "amount": 1.50, "description": "Cashback from payment", "created_at": "2026-02-25T..." },
    { "type": "commission", "amount": 0.80, "description": "Tier 1 commission", "created_at": "2026-02-24T..." }
  ],
  "totals": { "cashback": 15.50, "commission": 32.00 },
  "pagination": { "page": 1, "limit": 20, "total": 45, "total_pages": 3, "has_more": true }
}
\`\`\`

---

Sandbox mode lets you build and test your entire payment integration in a safe environment.

**What's different in Sandbox?**
- Charges are marked **completed** immediately (no pending state)
- No VA balance is deducted from users
- Webhooks still fire with realistic payloads
- A **Test Access Token** is auto-generated — no need to run the OAuth flow
- All sandbox charges are flagged with \`is_sandbox: true\`

### Quick Start Steps:
1. Create a Sandbox App in Merchant Dashboard → API tab (toggle Sandbox Mode on)
2. Copy your API Key, API Secret, and Test Access Token
3. Check balance: \`GET /api-balance\`
4. Create a test charge: \`POST /api-charge\`
5. Query charge status: \`GET /api-charge-status\`
6. Test a refund: \`POST /api-refund\`
7. List all charges: \`GET /api-charges-list\`
8. Test webhooks with your endpoint

### Going Live
1. Create a new API app with Sandbox Mode **off**
2. Replace sandbox credentials with production API Key and API Secret
3. Implement the OAuth authorization flow (redirect to \`/authorize\` → exchange code via \`/api-token-exchange\`) for real user tokens
4. Set up your webhook endpoint
5. Test with a small real charge, then scale up

> ⚠️ Production charges deduct real funds from user wallets.

---

## Webhooks

Set a **Webhook URL** when registering your API application. We send a POST request with JSON payload whenever a payment event occurs.

### Events

| Event | Description |
|---|---|
| \`charge.completed\` | Sent when a charge is successfully processed |
| \`charge.failed\` | Sent when a charge fails (insufficient balance, PIN error, etc.) |
| \`charge.partial_refund\` | Sent when a partial refund is issued |
| \`charge.refunded\` | Sent when a charge is fully refunded |

### Payload: charge.completed
\`\`\`json
{
  "event": "charge.completed",
  "charge_id": "uuid",
  "transaction_id": "uuid",
  "amount": 10.50,
  "description": "Order #12345",
  "reference": "txn_88291",
  "status": "completed",
  "metadata": { "order_id": "ORD-123" },
  "timestamp": "2026-02-16T12:00:00.000Z"
}
\`\`\`

### Payload: charge.failed
\`\`\`json
{
  "event": "charge.failed",
  "charge_id": "uuid",
  "amount": 10.50,
  "description": "Order #12345",
  "reference": "txn_88291",
  "status": "failed",
  "reason": "INSUFFICIENT_BALANCE",
  "metadata": {},
  "timestamp": "2026-02-16T12:00:00.000Z"
}
\`\`\`

**Failure Reason Codes:**

| Reason | Description |
|---|---|
| \`INSUFFICIENT_BALANCE\` | User's VA balance is too low |
| \`PIN_REQUIRED\` | Transaction requires PIN but none was provided |
| \`PIN_NOT_SET\` | User hasn't configured a PIN yet |
| \`INVALID_PIN\` | The PIN provided was incorrect |

### Payload: charge.partial_refund / charge.refunded
\`\`\`json
{
  "event": "charge.partial_refund",
  "charge_id": "uuid",
  "transaction_id": "uuid",
  "refund_amount": 5.00,
  "total_refunded": 5.00,
  "charge_amount": 10.50,
  "reason": "Customer returned item",
  "status": "partial_refund",
  "timestamp": "2026-02-16T12:30:00.000Z"
}
\`\`\`

### Signature Verification

Every webhook includes an \`X-Webhook-Signature\` header (HMAC-SHA256).

**Steps:**
1. Compute SHA-256 of your API Secret → signing key
2. Compute HMAC-SHA256(request_body, signing_key)
3. Compare result (hex) with X-Webhook-Signature header

**Node.js Example:**
\`\`\`javascript
const crypto = require('crypto');

function verifyWebhook(body, signature, apiSecret) {
  const signingKey = crypto.createHash('sha256').update(apiSecret).digest('hex');
  const computed = crypto.createHmac('sha256', signingKey).update(body).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(computed, 'hex'), Buffer.from(signature, 'hex'));
}
\`\`\`

**Python Example:**
\`\`\`python
import hashlib, hmac

def verify_webhook(body: str, signature: str, api_secret: str) -> bool:
    signing_key = hashlib.sha256(api_secret.encode()).hexdigest()
    computed = hmac.new(signing_key.encode(), body.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(computed, signature)
\`\`\`

### Retry Policy & Delivery

Webhooks are delivered with up to **3 attempts** using exponential backoff:

| Attempt | Delay |
|---|---|
| 1 | Immediate |
| 2 | 1 second after attempt 1 |
| 3 | 2 seconds after attempt 2 |

Each request includes an \`X-Webhook-Attempt\` header (1, 2, or 3) so you can track retries.

Your endpoint should respond with a **2xx** status code within **5 seconds**. After 3 failed attempts, the webhook is dropped. Always use \`/api-charge-status\` as the source of truth.

### Best Practices

- **Respond quickly** — return 200 immediately, then process asynchronously.
- **Verify signatures** — always validate \`X-Webhook-Signature\` before trusting the payload.
- **Handle duplicates** — use \`charge_id\` for idempotency; you may receive the same event more than once.
- **Use charge-status as fallback** — poll \`/api-charge-status\` if you suspect a missed webhook.

### Sandbox Mode

In sandbox mode, webhooks are still sent with realistic payloads. The payload includes \`"is_sandbox": true\` so your handler can distinguish test events from production.

---

## Error Codes

All errors follow the format: \`{ "error": "message" }\`

| HTTP | Error | Description |
|---|---|---|
| 401 | Missing API credentials | X-Api-Key or X-Api-Secret header is missing |
| 401 | Invalid API credentials | API Key not found, app inactive, or secret doesn't match |
| 401 | Missing access token | Authorization Bearer header is missing (user-scoped endpoints) |
| 401 | Invalid or expired access token | Token is invalid, revoked, or expired |
| 403 | Insufficient scope | Token lacks required scope (e.g., "charge" or "balance") |
| 429 | Rate limit exceeded | Too many requests. Check Retry-After header |
| 400 | Amount must be between 0.01 and 50000 | Charge amount out of range |
| 400 | Insufficient balance | User wallet doesn't have enough funds |
| 400 | PIN_REQUIRED | Transaction requires PIN verification |
| 400 | PIN_NOT_SET | User hasn't set a PIN yet |
| 403 | Invalid PIN | The PIN provided is incorrect |
| 400 | Cannot pay to your own branch | Merchant cannot charge their own wallet |
| 400 | Only completed charges can be refunded | Refund attempted on pending/failed charge |
| 400 | Charge already fully refunded | Total refunded equals original charge amount |
| 400 | Insufficient branch balance for refund | Branch wallet lacks funds for refund |
| 404 | Charge not found | charge_id doesn't exist or doesn't belong to your app |
| 409 | Already authorized for this app | User already granted access. Revoke first |

> **Tip:** Some charge errors include an additional \`charge_id\` field and a \`code\` field (e.g., \`"code": "PIN_REQUIRED"\`) for programmatic handling.
`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const format = url.searchParams.get('format') || 'markdown';

  if (format === 'json') {
    return new Response(
      JSON.stringify({
        title: "NoCap Wallet API Documentation",
        version: "1.0",
        base_url: BASE_URL,
        documentation_url: "https://nocap.life/api-docs",
        sections: ["Getting Started", "Authentication", "Endpoints", "Sandbox", "Webhooks", "Error Codes"],
        content: API_DOCS_MARKDOWN,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Default: return as plain text markdown
  return new Response(API_DOCS_MARKDOWN, {
    headers: { ...corsHeaders, 'Content-Type': 'text/markdown; charset=utf-8' },
  });
});
