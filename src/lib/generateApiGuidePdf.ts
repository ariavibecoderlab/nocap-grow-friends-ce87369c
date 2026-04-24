import jsPDF from "jspdf";

export function generateApiGuidePdf() {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;
  let y = 20;

  // === BRANDED HEADER ===
  doc.setFillColor(15, 15, 15);
  doc.rect(0, 0, pageWidth, 44, "F");
  doc.setFillColor(250, 204, 21);
  doc.rect(0, 44, pageWidth, 2, "F");

  const zx = margin + 1, zy = 12;
  doc.setFillColor(250, 204, 21);
  doc.triangle(zx + 4, zy, zx, zy + 8, zx + 5, zy + 7, "F");
  doc.triangle(zx + 2, zy + 7, zx + 6, zy + 15, zx + 3, zy + 8, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text("NO", margin + 12, 24);
  const noWidth = doc.getTextWidth("NO");
  doc.setTextColor(250, 204, 21);
  doc.text("cap", margin + 12 + noWidth, 24);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(180, 180, 180);
  doc.text("API Integration Guide", margin + 12, 32);

  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text("Version 1.4 — April 2026 (additive Commerce extension)", pageWidth - margin, 32, { align: "right" });

  y = 54;

  const BASE_URL = "https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1";

  function checkPage(needed = 12) {
    if (y + needed > 275) {
      doc.addPage();
      y = 20;
    }
  }

  function title(text: string, size = 22) {
    checkPage(20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(size);
    doc.setTextColor(20, 20, 20);
    doc.text(text, margin, y);
    y += size * 0.5 + 4;
  }

  function heading(text: string) {
    checkPage(16);
    y += 4;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(30, 30, 30);
    doc.text(text, margin, y);
    y += 8;
  }

  function subheading(text: string) {
    checkPage(12);
    y += 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(50, 50, 50);
    doc.text(text, margin, y);
    y += 6;
  }

  function paragraph(text: string) {
    checkPage(10);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    const lines = doc.splitTextToSize(text, maxWidth);
    for (const line of lines) {
      checkPage(5);
      doc.text(line, margin, y);
      y += 5;
    }
    y += 2;
  }

  function code(text: string) {
    const lines = text.split("\n");
    checkPage(lines.length * 4 + 6);
    doc.setFillColor(245, 245, 245);
    const blockHeight = lines.length * 4 + 4;
    doc.roundedRect(margin, y - 2, maxWidth, blockHeight, 1, 1, "F");
    doc.setFont("courier", "normal");
    doc.setFontSize(8);
    doc.setTextColor(40, 40, 40);
    for (const line of lines) {
      checkPage(5);
      doc.text(line, margin + 3, y + 2);
      y += 4;
    }
    y += 4;
  }

  function tableRow(cells: string[], bold = false) {
    checkPage(7);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(9);
    doc.setTextColor(bold ? 30 : 60, bold ? 30 : 60, bold ? 30 : 60);
    const colW = maxWidth / cells.length;
    cells.forEach((cell, i) => {
      const wrapped = doc.splitTextToSize(cell, colW - 4);
      doc.text(wrapped, margin + i * colW + 2, y);
    });
    y += 6;
    if (bold) {
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, y - 2, margin + maxWidth, y - 2);
    }
  }

  // ===== CONTENT =====

  paragraph(`Base URL: ${BASE_URL}`);
  paragraph("Authorization URL: https://nocap.life/authorize");
  y += 4;

  // --- Overview ---
  heading("1. Overview");
  paragraph("NoCap provides a REST API that allows third-party applications to check user wallet balances, create charges from user wallets, process refunds, query charge history, initiate wallet top-ups via FPX, trigger cashback & commission distributions, and access referral/affiliate features. All access is secured via OAuth 2.0 Authorization Code flow.");

  subheading("Credentials");
  tableRow(["Credential", "Purpose"], true);
  tableRow(["app_id", "Identifies your application (UUID)"]);
  tableRow(["api_key", "Authenticates API requests"]);
  tableRow(["api_secret", "Signs requests & verifies webhooks"]);

  // --- OAuth Flow ---
  heading("2. OAuth 2.0 Authorization Code Flow");

  subheading("Step 1 — Redirect User");
  paragraph("Redirect the user's browser to the NoCap consent screen:");
  code("https://nocap.life/authorize\n  ?app_id=YOUR_APP_ID\n  &redirect_uri=YOUR_CALLBACK_URL\n  &scope=balance,charge\n  &state=RANDOM_STRING");

  tableRow(["Parameter", "Required", "Description"], true);
  tableRow(["app_id", "Yes", "Your application UUID"]);
  tableRow(["redirect_uri", "Yes", "Callback URL after approval"]);
  tableRow(["scope", "Optional", "balance, charge, referral, topup (defaults to balance,charge)"]);
  tableRow(["state", "Recommended", "CSRF protection string"]);

  subheading("Step 2 — Receive Authorization Code");
  paragraph("On approval, user is redirected to:");
  code("YOUR_CALLBACK_URL?code=AUTH_CODE&state=YOUR_STATE");
  paragraph("On denial:");
  code("YOUR_CALLBACK_URL?error=access_denied&state=YOUR_STATE");
  paragraph("The authorization code expires in 10 minutes and can only be used once.");

  subheading("Step 3 — Exchange Code for Access Token");
  paragraph("Server-to-server POST (never expose app_secret client-side):");
  code(`curl -X POST ${BASE_URL}/api-token-exchange \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "code": "AUTH_CODE",\n    "app_id": "YOUR_APP_ID",\n    "app_secret": "YOUR_APP_SECRET"\n  }'`);

  paragraph("Success response:");
  code(`{\n  "success": true,\n  "access_token": "64-char-hex-string",\n  "token_type": "Bearer",\n  "scopes": ["balance", "charge"],\n  "expires_in": 7776000\n}`);
  paragraph("Access tokens are valid for 90 days (7,776,000 seconds).");

  // --- Endpoints ---
  heading("3. API Endpoints");
  paragraph("All API calls require these 3 headers:");
  tableRow(["Header", "Value"], true);
  tableRow(["x-api-key", "Your app's API key"]);
  tableRow(["x-api-secret", "Your app's API secret"]);
  tableRow(["Authorization", "Bearer ACCESS_TOKEN"]);

  subheading("3.1 Check Balance — GET /api-balance");
  paragraph("Requires scope: balance");
  code(`curl ${BASE_URL}/api-balance \\\n  -H "x-api-key: KEY" -H "x-api-secret: SECRET" \\\n  -H "Authorization: Bearer TOKEN"`);
  paragraph('Response: { "balance": 150.00, "currency": "MYR" }');

  subheading("3.2 Create a Charge — POST /api-charge");
  paragraph("Requires scope: charge");
  tableRow(["Field", "Type", "Required", "Description"], true);
  tableRow(["amount", "number", "Yes", "0.01 – 50,000 MYR"]);
  tableRow(["description", "string", "No", "Payment description"]);
  tableRow(["reference", "string", "No", "Your internal reference"]);
  tableRow(["branch_id", "string", "Conditional", "Required for merchant-level apps"]);
  tableRow(["pin", "string", "Conditional", "7-digit PIN (if amount >= threshold)"]);
  tableRow(["metadata", "object", "No", "Custom data (max 4KB)"]);

  paragraph("Success response includes: charge_id, transaction_id, amount, new_balance, cashback, branch_name.");

  subheading("3.3 Check Charge Status — GET /api-charge-status");
  paragraph("Query: ?charge_id=UUID. No Bearer token needed, only x-api-key + x-api-secret.");
  paragraph("Possible statuses: pending, completed, failed, refunded, partial_refund.");

  subheading("3.4 List Charges — GET /api-charges-list");
  paragraph("Supports pagination and filtering:");
  tableRow(["Parameter", "Default", "Description"], true);
  tableRow(["page", "1", "Page number"]);
  tableRow(["limit", "20", "Results per page (max 100)"]);
  tableRow(["status", "—", "Filter by status"]);
  tableRow(["from / to", "—", "Date range (ISO format)"]);
  tableRow(["reference", "—", "Filter by reference"]);
  tableRow(["user_id", "—", "Filter by user UUID"]);

  subheading("3.5 Refund a Charge — POST /api-refund");
  paragraph("Only completed charges can be refunded. Supports partial refunds.");
  tableRow(["Field", "Type", "Required", "Description"], true);
  tableRow(["charge_id", "UUID", "Yes", "The charge to refund"]);
  tableRow(["amount", "number", "No", "Partial amount (defaults to full)"]);
  tableRow(["reason", "string", "No", "Refund reason"]);

  subheading("3.6 Revoke Access — POST /api-revoke");
  paragraph("Users can revoke tokens from Connected Apps settings, or call this endpoint with their session token and { token_id }.");

  // --- Branch Management ---
  heading("3b. Branch Management");
  subheading("3.7 List Branches — GET /api-branches");
  paragraph("Returns all active branches for the merchant who owns the API app. Auth: x-api-key + x-api-secret only (no Bearer token needed).");
  code(`curl ${BASE_URL}/api-branches \\\n  -H "x-api-key: KEY" -H "x-api-secret: SECRET"`);
  paragraph("Response: { branches: [{ id, branch_name, qr_code_id, is_active }] }");
  paragraph("Use this endpoint to populate branch selectors or map internal outlet IDs to NoCap branch IDs. Required for merchant-level apps when calling POST /api-charge.");

  subheading("3.7b App Metadata (Public) — GET /api-app-info");
  paragraph("Public endpoint (no auth) that resolves an app's display name from its app_id (UUID) or api_key. Useful for custom OAuth consent screens.");
  code(`curl "${BASE_URL}/api-app-info?app_id=YOUR_APP_ID"`);
  paragraph("Response: { id, name }. Returns 404 if the app does not exist or is inactive. Secrets are never exposed.");

  // --- Wallet Top-Up ---
  heading("3c. Wallet Top-Up");
  subheading("3.8 Initiate Top-Up — POST /api-topup");
  paragraph("Requires scope: topup. Initiates a wallet top-up via FPX bank transfer.");
  tableRow(["Field", "Type", "Required", "Description"], true);
  tableRow(["amount", "number", "Yes", "RM10–RM500"]);
  tableRow(["description", "string", "No", "Top-up description"]);
  tableRow(["reference", "string", "No", "Unique reference for idempotency"]);
  code(`curl -X POST ${BASE_URL}/api-topup \\\n  -H "x-api-key: KEY" -H "x-api-secret: SECRET" \\\n  -H "Authorization: Bearer TOKEN" \\\n  -H "Content-Type: application/json" \\\n  -d '{ "amount": 50.00, "reference": "topup_001" }'`);
  paragraph("Response: { success, payment_url, transaction_id, bill_code, amount }");
  paragraph("Open payment_url in user's browser for FPX payment. Wallet is credited automatically on success. Webhook events: topup.completed, topup.failed.");
  subheading("Error Responses");
  tableRow(["Status", "Error", "Meaning"], true);
  tableRow(["400", "Amount must be between RM 10.00 and RM 500.00", "Invalid amount"]);
  tableRow(["401", "Missing or invalid API key", "Bad credentials"]);
  tableRow(["403", "Access token does not have the required scope: topup", "Missing topup scope"]);
  tableRow(["409", "A top-up with this reference already exists", "Duplicate reference"]);

  // --- Distribution ---
  heading("3d. Cashback & Commission Distribution");
  subheading("3.9 Distribute — POST /api-distribute");
  paragraph("Server-to-server only. Auth: x-api-key + x-api-secret (no Bearer token needed). Triggers cashback for the purchasing member and tier commissions for up to 5 referral ancestors.");
  tableRow(["Field", "Type", "Required", "Description"], true);
  tableRow(["branch_id", "UUID", "Yes", "Branch where sale occurred"]);
  tableRow(["member_referral_code", "string", "Conditional", "Member's referral code (or use user_id)"]);
  tableRow(["user_id", "UUID", "Conditional", "Member's NoCap user ID (or use member_referral_code)"]);
  tableRow(["amount", "number", "Yes", "Sale amount — commission pool calculated from branch commission_percent"]);
  tableRow(["reference", "string", "Yes", "Unique idempotency key"]);
  code(`curl -X POST ${BASE_URL}/api-distribute \\\n  -H "x-api-key: KEY" -H "x-api-secret: SECRET" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "branch_id": "BRANCH_UUID",\n    "member_referral_code": "A1B2C3D4",\n    "amount": 100.00,\n    "reference": "sale_20260415_001"\n  }'`);
  paragraph("Response:");
  code(`{\n  "success": true,\n  "distribution_id": "UUID",\n  "breakdown": {\n    "total_pool": 10.00,\n    "cashback": 1.67,\n    "tier_commissions": [\n      { "tier": 1, "amount": 1.67, "user_id": "..." },\n      { "tier": 2, "amount": 1.67, "user_id": "..." }\n    ],\n    "unclaimed_returned": 5.00,\n    "branch_debited": 10.00\n  }\n}`);
  paragraph("The branch wallet is debited by the total pool amount (negative balances are allowed). Cashback (1/6 of pool) goes to the member, tier commissions (1/6 each) go to up to 5 referral ancestors, and unclaimed tiers are returned to the branch.");
  subheading("Error Responses");
  tableRow(["Status", "Error", "Meaning"], true);
  tableRow(["400", "Validation error", "Missing or invalid fields"]);
  tableRow(["401", "Invalid credentials", "Bad API key/secret"]);
  tableRow(["404", "Branch or member not found", "Invalid branch_id or referral code"]);
  tableRow(["409", "Duplicate reference", "Reference already used"]);

  // --- Payment Flow Comparison ---
  heading("3e. Payment Flow Comparison");
  paragraph("Path A (Wallet Payment): Customer pays from their NoCap wallet via POST /api-charge. Requires OAuth connection with charge scope. Commission distribution is automatic — built into the charge flow.");
  paragraph("Path D (Cash/Card + Distribution): Customer pays via cash, card, or other method outside NoCap. The 3rd party records the sale and calls POST /api-distribute to trigger cashback and commissions. No OAuth connection or wallet balance needed from the customer — only their referral code or user_id.");
  paragraph("Key Difference: Path A moves money from the customer's wallet. Path D only distributes commissions from the branch wallet — no customer funds are touched.");

  // --- Referral / Affiliate Endpoints ---
  heading("4. Referral / Affiliate Endpoints");
  paragraph("These endpoints require the 'referral' OAuth scope. Existing connected users must re-authorize with scope=balance,charge,referral to access these endpoints.");

  subheading("4.1 Get Referral Info — GET /api-referral-info");
  paragraph("Returns the user's referral code, sharing link, and summary stats.");
  code(`curl ${BASE_URL}/api-referral-info \\\n  -H "x-api-key: KEY" -H "x-api-secret: SECRET" \\\n  -H "Authorization: Bearer TOKEN"`);
  paragraph("Response:");
  code(`{\n  "referral_code": "A1B2C3D4",\n  "referral_link": "https://nocap.life/auth?ref=A1B2C3D4",\n  "stats": {\n    "direct_referrals": 5,\n    "network_size": 12,\n    "total_cashback": 15.50,\n    "total_commission": 32.00\n  }\n}`);

  subheading("4.2 Register User via Referral — POST /api-referral-register");
  paragraph("Allows 3rd party to register a new NoCap account linked by referral code. Auth: API key + secret only (no bearer token needed).");
  tableRow(["Field", "Type", "Required", "Description"], true);
  tableRow(["email", "string", "Yes", "New user's email"]);
  tableRow(["referral_code", "string", "Yes", "Referrer's code"]);
  tableRow(["full_name", "string", "No", "User's display name"]);
  tableRow(["phone", "string", "No", "Malaysian format (+60xxxxxxxxx)"]);
  code(`curl -X POST ${BASE_URL}/api-referral-register \\\n  -H "x-api-key: KEY" -H "x-api-secret: SECRET" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "email": "newuser@example.com",\n    "referral_code": "A1B2C3D4",\n    "full_name": "Ahmad Bin Ali",\n    "phone": "+60123456789"\n  }'`);
  paragraph("Success response includes: user_id, referral_code (new user's own code), access_token, scopes.");
  paragraph("The new user's account is auto-confirmed. The referral tree and wallet are created automatically.");

  subheading("4.3 Get Referral Network — GET /api-referral-network");
  paragraph("Returns the user's multi-tier referral tree (Tiers 1–5).");
  code(`curl ${BASE_URL}/api-referral-network \\\n  -H "x-api-key: KEY" -H "x-api-secret: SECRET" \\\n  -H "Authorization: Bearer TOKEN"`);
  paragraph("Response includes tiers array with tier number, member count, and member details (name, joined date).");

  subheading("4.4 Cashback & Commission History — GET /api-cashback-history");
  paragraph("Returns paginated cashback and commission transaction history.");
  tableRow(["Parameter", "Default", "Description"], true);
  tableRow(["page", "1", "Page number"]);
  tableRow(["limit", "20", "Results per page (max 100)"]);
  tableRow(["type", "—", "Filter: cashback or commission"]);
  tableRow(["from / to", "—", "Date range (ISO format)"]);
  code(`curl "${BASE_URL}/api-cashback-history?page=1&limit=10" \\\n  -H "x-api-key: KEY" -H "x-api-secret: SECRET" \\\n  -H "Authorization: Bearer TOKEN"`);
  paragraph("Response includes transactions array and totals for cashback and commission.");

  // --- v1.4 Commerce Endpoints ---
  heading("4b. v1.4 Commerce Endpoints (additive)");
  paragraph("All v1.4 endpoints use server-to-server auth: X-Api-Key + X-Api-Secret only (no user Bearer token).");

  subheading("4b.1 Products — GET /api-products");
  paragraph("List/search products in your stores. ?id=<uuid> returns detail including variants. Filters: store_id, q (search), status, limit, offset.");
  code(`curl "${BASE_URL}/api-products?store_id=<uuid>&q=tshirt" \\\n  -H "X-Api-Key: KEY" -H "X-Api-Secret: SECRET"`);

  subheading("4b.2 Orders — GET / POST / PATCH /api-orders");
  paragraph("GET lists orders (filters: store_id, status, payment_status, from, to). POST creates a draft order; pass create_payment_link: true to also receive a hosted /pay/<link_id>. PATCH ?id=<uuid> updates fulfillment status and tracking_number.");
  code(`curl -X POST "${BASE_URL}/api-orders" \\\n  -H "X-Api-Key: KEY" -H "X-Api-Secret: SECRET" -H "Content-Type: application/json" \\\n  -d '{"store_id":"uuid","buyer_name":"Ali","buyer_phone":"+60123456789","buyer_email":"ali@example.com","shipping_address":"12 Jalan ABC","items":[{"product_id":"uuid","quantity":2}],"create_payment_link":true}'`);

  subheading("4b.3 Payment Links — GET / POST /api-payment-links");
  paragraph("Hosted checkout link. Buyer pays at /pay/<link_id> on nocap.life — PIN never leaves NoCap. Lifecycle webhooks: payment_link.paid, payment_link.expired.");
  code(`curl -X POST "${BASE_URL}/api-payment-links" \\\n  -H "X-Api-Key: KEY" -H "X-Api-Secret: SECRET" -H "Content-Type: application/json" \\\n  -d '{"amount":49.90,"description":"Order ORD-XYZ","expires_in_seconds":86400}'`);

  subheading("4b.4 Customers — GET /api-customers");
  paragraph("Merchant-scoped directory of buyers who have ordered from your stores. Filter by ?phone= or ?email=. ?id=<uuid> returns one customer. Append &orders=true for full order history.");
  code(`# Lookup by phone\ncurl "${BASE_URL}/api-customers?phone=%2B60123456789" \\\n  -H "X-Api-Key: KEY" -H "X-Api-Secret: SECRET"\n\n# Detail with order history\ncurl "${BASE_URL}/api-customers?id=<uuid>&orders=true" \\\n  -H "X-Api-Key: KEY" -H "X-Api-Secret: SECRET"`);

  subheading("4b.5 Inventory Reservations — POST /api-inventory/reserve · /release");
  paragraph("Soft TTL holds on stock. reserve() does NOT decrement stock_quantity — effective availability = stock − Σ active reservations. ttl_seconds defaults to 900 (max 3600). Idempotent per (api_key, reference).");
  code(`# Reserve\ncurl -X POST "${BASE_URL}/api-inventory/reserve" \\\n  -H "X-Api-Key: KEY" -H "X-Api-Secret: SECRET" -H "Content-Type: application/json" \\\n  -d '{"product_id":"uuid","quantity":2,"ttl_seconds":900,"reference":"cart_abc"}'\n\n# Release (by reference OR reservation_id)\ncurl -X POST "${BASE_URL}/api-inventory/release" \\\n  -H "X-Api-Key: KEY" -H "X-Api-Secret: SECRET" -H "Content-Type: application/json" \\\n  -d '{"reference":"cart_abc"}'`);
  paragraph("On stock-out, reserve returns 409 with { available, requested }. Release is idempotent — already-released/expired holds return 200.");

  subheading("4b.6 Webhook Subscriptions — GET / POST /api-webhooks/subscriptions");
  paragraph("Manage per-event opt-in and the delivery URL for the calling app. Each API application stores its own webhook_url and subscriptions array. Branch-scoped apps only receive events for their branch.");
  paragraph("subscriptions value reference: null = subscribe to all events (v1.3-compatible default); [\"order.paid\",\"order.shipped\"] = receive only those events; [] = pause (no events delivered); omitted from POST = preserve existing setting.");
  code(`# View current config + event catalog\ncurl "${BASE_URL}/api-webhooks/subscriptions" \\\n  -H "X-Api-Key: KEY" -H "X-Api-Secret: SECRET"\n\n# Sample response (subscribed to all)\n{\n  "app_id": "f6e5...",\n  "webhook_url": "https://yourapp.com/webhooks/nocap",\n  "subscriptions": null,\n  "subscribed_to_all": true,\n  "available_events": ["charge.completed","order.created","order.paid","order.shipped","order.delivered","order.cancelled","product.stock_changed","payment_link.paid","payment_link.expired"]\n}\n\n# Subscribe to specific events only\ncurl -X POST "${BASE_URL}/api-webhooks/subscriptions" \\\n  -H "X-Api-Key: KEY" -H "X-Api-Secret: SECRET" -H "Content-Type: application/json" \\\n  -d '{"webhook_url":"https://yourapp.com/webhooks/nocap","subscriptions":["order.paid","order.shipped","payment_link.paid"]}'\n\n# Subscribe to ALL events (default)\ncurl -X POST "${BASE_URL}/api-webhooks/subscriptions" \\\n  -H "X-Api-Key: KEY" -H "X-Api-Secret: SECRET" -H "Content-Type: application/json" \\\n  -d '{"subscriptions":null}'\n\n# Pause all deliveries (keep URL)\ncurl -X POST "${BASE_URL}/api-webhooks/subscriptions" \\\n  -H "X-Api-Key: KEY" -H "X-Api-Secret: SECRET" -H "Content-Type: application/json" \\\n  -d '{"subscriptions":[]}'`);



  paragraph("Configure your webhook URL in Merchant Dashboard > API Apps. NoCap sends POST requests with HMAC-SHA256 signed payloads for all events.");

  subheading("How Signing Works");
  paragraph("NoCap computes HMAC-SHA256 using your api_secret_hash (SHA-256 of your api_secret) as the key and the raw JSON payload as the message. Your server must verify this signature on every webhook.");
  code(`HMAC-SHA256(\n  key = SHA256(your_api_secret),\n  msg = raw_json_payload\n) → hex_signature (64 chars)`);

  subheading("Verification — Node.js");
  code(`const crypto = require('crypto');\n\n// Compute once at startup:\nconst SECRET_HASH = crypto\n  .createHash('sha256')\n  .update(process.env.NOCAP_API_SECRET)\n  .digest('hex');\n\nfunction verifyWebhook(rawBody, sig) {\n  const expected = crypto\n    .createHmac('sha256', SECRET_HASH)\n    .update(rawBody).digest('hex');\n  return crypto.timingSafeEqual(\n    Buffer.from(expected, 'hex'),\n    Buffer.from(sig, 'hex')\n  );\n}`);

  subheading("Verification — Python");
  code(`import hmac, hashlib\n\nSECRET_HASH = hashlib.sha256(\n  os.environ['NOCAP_API_SECRET'].encode()\n).hexdigest()\n\ndef verify(raw_body, sig):\n  expected = hmac.new(\n    SECRET_HASH.encode(),\n    raw_body.encode(),\n    hashlib.sha256\n  ).hexdigest()\n  return hmac.compare_digest(expected, sig)`);

  subheading("Verification — PHP");
  code(`$secretHash = hash('sha256', $apiSecret);\n$expected = hash_hmac('sha256', $rawBody, $secretHash);\nif (!hash_equals($expected, $signature)) {\n  http_response_code(401);\n  die('Invalid signature');\n}`);

  subheading("Security Notes");
  paragraph("1. Always use the raw request body — do not re-serialize parsed JSON.");
  paragraph("2. Use constant-time comparison (timingSafeEqual, compare_digest, hash_equals).");
  paragraph("3. Reject requests with missing or invalid signatures with 401.");
  paragraph("4. Store api_secret_hash (SHA256 of api_secret) — compute once and cache.");

  subheading("Headers");
  tableRow(["Header", "Description"], true);
  tableRow(["X-Webhook-Signature", "HMAC-SHA256 hex signature (64 chars)"]);
  tableRow(["X-Webhook-Attempt", "Retry attempt number (1–3)"]);

  subheading("Events");
  paragraph("charge.completed — Charge was successfully processed and funds moved.");
  paragraph("charge.failed — Charge failed. Check 'reason' field: PIN_REQUIRED, PIN_NOT_SET, INVALID_PIN, PIN_LOCKED, INSUFFICIENT_BALANCE.");
  paragraph("charge.refunded — Full refund processed.");
  paragraph("charge.partial_refund — Partial refund processed.");
  paragraph("topup.completed — API-initiated wallet top-up successfully paid via FPX.");
  paragraph("topup.failed — API-initiated wallet top-up payment failed or cancelled.");
  paragraph("distribution.completed — Cashback and commission distribution processed successfully. Payload includes full breakdown (cashback, tier commissions, unclaimed returned).");
  paragraph("user.registered — New user account created via POST /api-referral-register. Payload includes user_id, email, and referral_code.");
  paragraph("[v1.4] order.created/confirmed/shipped/delivered/cancelled/refunded — Marketplace order lifecycle. Envelope adds merchant_id and branch_id.");
  paragraph("[v1.4] payment_link.paid / payment_link.expired — Hosted checkout link lifecycle (POST /api-payment-links).");
  paragraph("[v1.4] product.created / product.updated / product.stock_changed — Catalog change notifications.");

  subheading("Retry Policy");
  paragraph("3 attempts with exponential backoff: immediate, 1s, 2s. Respond with 2xx to acknowledge. After 3 failures, webhook is logged as undelivered.");

  subheading("Testing Webhooks");
  paragraph("Sandbox mode: webhooks fire normally with is_sandbox: true. Use ngrok or Cloudflare Tunnel to expose your local server. All delivery attempts are logged in the API request logs.");

  // --- Rate Limits ---
  heading("6. Rate Limits");
  tableRow(["Endpoint", "Limit"], true);
  tableRow(["/authorize", "10/min per user"]);
  tableRow(["/api-token-exchange", "10/min per app"]);
  tableRow(["/api-balance", "60/min per key"]);
  tableRow(["/api-charge", "30/min per key"]);
  tableRow(["/api-charge-status", "60/min per key"]);
  tableRow(["/api-charges-list", "60/min per key"]);
  tableRow(["/api-refund", "20/min per key"]);
  tableRow(["/api-branches", "60/min per key"]);
  tableRow(["/api-app-info", "120/min (public)"]);
  tableRow(["/api-topup", "30/min per key"]);
  tableRow(["/api-distribute", "60/min per key"]);
  tableRow(["/api-referral-info", "60/min per key"]);
  tableRow(["/api-referral-register", "10/min per app"]);
  tableRow(["/api-referral-network", "30/min per key"]);
  tableRow(["/api-cashback-history", "60/min per key"]);

  // --- Error Codes ---
  heading("7. Error Codes");
  tableRow(["Status", "Meaning"], true);
  tableRow(["200", "Success"]);
  tableRow(["400", "Bad request"]);
  tableRow(["401", "Authentication failed"]);
  tableRow(["403", "Forbidden / Invalid PIN"]);
  tableRow(["404", "Not found"]);
  tableRow(["409", "Conflict"]);
  tableRow(["429", "Rate limited"]);
  tableRow(["500", "Server error"]);

  subheading("Charge Error Codes");
  tableRow(["Code", "Description", "Action"], true);
  tableRow(["PIN_REQUIRED", "Amount >= threshold", "Include pin field"]);
  tableRow(["PIN_NOT_SET", "User has no PIN", "Set PIN in NoCap app"]);
  tableRow(["INVALID_PIN", "Wrong PIN", "Retry"]);
  tableRow(["INSUFFICIENT_BALANCE", "Balance too low", "Top up wallet"]);

  // --- Sandbox ---
  heading("8. Sandbox Mode");
  paragraph("Apps in Sandbox mode skip balance checks, PIN verification, and real money movement. Webhooks fire normally with is_sandbox: true. Use for development and testing.");
  paragraph("Generate test tokens from the Merchant Dashboard to skip the full OAuth flow during development.");

  // --- 3rd Party Integration Roadmap ---
  heading("9. 3rd Party Integration Roadmap");
  paragraph("This section provides a complete step-by-step guide for integrating NoCap into your system. Four paths are available:");
  paragraph("Path A (Prompts 1–9): New to NoCap — full integration from scratch.");
  paragraph("Path B (Prompts 6–9 only): Already have NoCap wallet — upgrade only.");
  paragraph("Path C (Prompts 10–12): Add wallet top-up to existing integration.");
  paragraph("Path D (Prompt 13): Add cashback & commission distribution for cash/card sales.");
  paragraph("Important: Existing users do NOT need to disconnect. Wallet and payments continue working. Users only re-authorize once to unlock new features.");

  subheading("Quick Reference");
  tableRow(["Prompt", "New", "Upgrade", "Top-Up", "Dist"], true);
  tableRow(["1 — Credentials & DB", "Yes", "Skip", "Skip", "Skip"]);
  tableRow(["2 — API Service Layer", "Yes", "Skip", "Skip", "Skip"]);
  tableRow(["3 — OAuth Connection", "Yes", "Skip", "Skip", "Skip"]);
  tableRow(["4 — Registration + Referral", "Yes", "Skip", "Skip", "Skip"]);
  tableRow(["5 — Wallet Checkout", "Yes", "Skip", "Skip", "Skip"]);
  tableRow(["6 — Upgrade DB + APIs", "Yes", "Start here", "Skip", "Skip"]);
  tableRow(["7 — Re-auth for Referral", "Yes", "Yes", "Skip", "Skip"]);
  tableRow(["8 — Multi-Branch Routing", "Yes", "Yes", "Skip", "Skip"]);
  tableRow(["9 — Referral Dashboard", "Yes", "Yes", "Skip", "Skip"]);
  tableRow(["10 — Top-Up Service", "Skip", "Skip", "Start here", "Skip"]);
  tableRow(["11 — Re-auth for Top-Up", "Skip", "Skip", "Yes", "Skip"]);
  tableRow(["12 — Top-Up UI & Webhooks", "Skip", "Skip", "Yes", "Skip"]);
  tableRow(["13 — Distribution", "Skip", "Skip", "Skip", "Start here"]);

  // --- Pre-Integration: NoCap Merchant Setup ---
  heading("10. Pre-Integration: NoCap Merchant Setup");
  paragraph("Before handing prompts to your developer, the NoCap merchant must complete these steps in the Merchant Dashboard.");

  subheading("Fresh Integration");
  paragraph("1. Register as a Merchant — Complete the merchant application and wait for admin approval.");
  paragraph("2. Create Branches — Add all outlet locations under Branch Management.");
  paragraph("3. Create a Merchant-Level API App — Go to API Apps → Create App. Select 'All Branches' so the app covers every outlet with a single set of credentials.");
  paragraph("4. Save Credentials — Securely copy and share app_id, api_key, and api_secret with your developer. The api_secret is shown only once.");
  paragraph("5. Set Webhook URL — Enter your server's webhook endpoint in the app settings.");
  paragraph("6. Enable Sandbox — Toggle sandbox mode for development/testing.");

  subheading("Upgrade Integration");
  paragraph("1. Create a NEW Merchant-Level API App — Select 'All Branches'. Keep the old branch-level app active during transition.");
  paragraph("2. Share New Credentials — Provide app_id, api_key, and api_secret to your 3rd party developer.");
  paragraph("3. Set Webhook URL — Configure the webhook endpoint on the new app.");
  paragraph("4. Transition Period — Once the 3rd party completes Prompts 6–9, existing members re-authorize and the old app can be deactivated.");

  // --- 3rd Party System Enhancements Required ---
  heading("11. 3rd Party System Enhancements");
  paragraph("Summary of all changes needed on the 3rd party system:");
  tableRow(["Enhancement", "Fresh", "Upgrade"], true);
  tableRow(["nocap_connections table", "New table", "Add referral_code + scopes"]);
  tableRow(["nocap_branch_mappings", "New table", "New table"]);
  tableRow(["API service layer", "Build full", "Add referral + branch"]);
  tableRow(["OAuth flow", "All 3 scopes", "Add referral scope"]);
  tableRow(["Charge routing", "Include branch_id", "Update createCharge"]);
  tableRow(["Re-auth banner", "Build", "Build"]);
  tableRow(["Referral dashboard", "Build", "Build"]);
  tableRow(["Webhook verification", "Build HMAC", "No change"]);

  // --- Member Action Required ---
  heading("12. Member Action Required");
  paragraph("Existing connected members do NOT need to disconnect or create new accounts.");
  paragraph("1. Current State — Members already connected via OAuth have balance and charge scopes. Wallet and payments continue working normally.");
  paragraph("2. Re-authorization — The 3rd party system shows a banner: 'Unlock Referral Rewards!' for members missing the referral scope.");
  paragraph("3. One-Click Upgrade — Member clicks the banner → redirected to NoCap /authorize with scope=balance,charge,referral → approves → redirected back.");
  paragraph("4. Token Swap — NoCap automatically revokes the old token and issues a new one with all 3 scopes. No conflict errors.");
  paragraph("5. No Disruption — Wallet balance, payment history, and all existing features remain intact throughout.");

  // --- Updated Prompts ---
  heading("13. Integration Prompts (1–13)");

  subheading("Prompt 1 — Store NoCap API Credentials");
  paragraph("(New integrators only) NoCap Merchant Action: Must have created a merchant-level API app and shared credentials.");
  paragraph("Store NOCAP_APP_ID, NOCAP_API_KEY, NOCAP_API_SECRET as backend secrets. Create a 'nocap_connections' table with: id, customer_id, nocap_user_id, access_token, scopes (text array), referral_code, connected_at, updated_at. Add RLS so customers can only read their own connection.");
  paragraph("Member Impact: None — backend setup only.");

  subheading("Prompt 2 — Build NoCap API Service Layer");
  paragraph("(New integrators only) Create service functions for all NoCap endpoints:");
  paragraph("Wallet: checkBalance, createCharge (with optional branch_id), getChargeStatus, listCharges, refundCharge, listBranches.");
  paragraph("Referral: getReferralInfo, registerViaReferral, getReferralNetwork, getCashbackHistory.");
  paragraph("All functions use x-api-key + x-api-secret headers. Bearer token endpoints as documented.");
  paragraph("Member Impact: None — backend code only.");

  subheading("Prompt 3 — OAuth Wallet Connection Flow");
  paragraph("(New integrators only) NoCap Merchant Action: Ensure redirect URI matches the 3rd party callback URL.");
  paragraph("Add 'Connect NoCap Wallet' button. Redirect to /authorize with scope=balance,charge,referral (all three upfront). On callback: verify state, exchange code via POST /api-token-exchange, store access_token and scopes. Handle error=access_denied.");
  paragraph("Member Impact: Members see a consent screen and approve access.");

  subheading("Prompt 4 — Registration with Referral");
  paragraph("(New integrators only) Add optional 'Referral Code' to signup. After account creation in your system, call POST /api-referral-register with { email, full_name, phone, referral_code }. Phone should be in Malaysian format (+60xxxxxxxxx). This creates the full NoCap account: auth user, profile, RM 0.00 wallet, member role, and referral tree links — all automatically. Store the returned user_id and referral_code for reference. If the call returns 409 (user already exists), skip silently. If NoCap registration fails for other reasons, don't block your signup — log and retry later.");
  paragraph("Member Impact: New members get a full NoCap account (with wallet) created automatically when they register on the 3rd party system with a referral code.");

  subheading("Prompt 5 — Wallet Payment in Checkout");
  paragraph("(New integrators only) NoCap Merchant Action: Ensure sandbox mode is enabled for testing.");
  paragraph("Add NoCap as payment option: show balance (GET /api-balance), call POST /api-charge with amount, description, reference, branch_id. Handle PIN_REQUIRED and INSUFFICIENT_BALANCE. Set up webhook verification (HMAC-SHA256) for charge events.");
  paragraph("Member Impact: Members can now pay with their NoCap wallet at checkout.");

  subheading("Prompt 6 — Upgrade for Affiliate & Multi-Branch");
  paragraph("(All integrators — existing integrators START HERE) NoCap Merchant Action: Must have created a NEW merchant-level API app and shared new credentials.");
  paragraph("DO NOT remove existing wallet features. Add referral_code and scopes columns to nocap_connections. Create 'nocap_branch_mappings' table. Add new API service functions. Update createCharge to accept optional branch_id.");
  paragraph("Member Impact: None — backend preparation only.");

  subheading("Prompt 7 — Re-authorize for Referral Scope");
  paragraph("(All integrators) Check stored scopes — if missing 'referral', show banner: 'Unlock Referral Rewards!' On click, redirect to /authorize with scope=balance,charge,referral. NoCap auto-revokes old token and issues new one. Exchange code, update stored token and scopes. Hide banner once granted.");
  paragraph("Member Impact: Members see a one-time banner. One click → approve → done. Wallet continues working throughout.");

  subheading("Prompt 8 — Multi-Branch Charge Routing");
  paragraph("(All integrators) NoCap Merchant Action: Ensure all branches are created. New branches can be added later.");
  paragraph("DO NOT change existing payment logic. Call GET /api-branches to fetch NoCap branches. Store in nocap_branch_mappings. Build admin page to map outlets to NoCap branch IDs. Include branch_id in POST /api-charge. Show unmapped outlets as warnings. Add 'Refresh Branches' button.");
  paragraph("Member Impact: None — branch routing is transparent to members.");

  subheading("Prompt 9 — Referral Dashboard & Admin");
  paragraph("(All integrators) DO NOT modify existing wallet/payment UI. Add new sections:");
  paragraph("Customer Dashboard (if referral scope granted): referral code with copy/share, stats cards, network tree Tiers 1-5, earnings history with tabs.");
  paragraph("Admin Section: branch mapping management, connected customers overview, top referrers by network size.");
  paragraph("Member Impact: Members with referral scope see a new Referral Dashboard.");

  subheading("Prompt 10 — Add Top-Up API Service Function");
  paragraph("(Top-Up upgrade — START HERE for Path C) Add a createTopUp service function that calls POST /api-topup with x-api-key, x-api-secret, and Bearer token. Body: { amount, description, reference }. Amount: RM10–RM500. Response: { payment_url, transaction_id, bill_code }.");
  paragraph("Member Impact: None — backend code only.");

  subheading("Prompt 11 — Re-authorize for Top-Up Scope");
  paragraph("(Top-Up upgrade) Check stored scopes for 'topup'. If missing, show banner: 'Enable Wallet Top-Up!' Redirect to /authorize with scope=balance,charge,referral,topup. NoCap auto-revokes old token and issues new one. Exchange code, update stored token and scopes. Hide banner once granted.");
  paragraph("Member Impact: Members see a one-time banner. One click → approve → done.");

  subheading("Prompt 12 — Top-Up UI & Webhook Handling");
  paragraph("(Top-Up upgrade) Merchant Action: Ensure webhook URL receives topup.completed and topup.failed events.");
  paragraph("Build 'Top Up NoCap Wallet' button/page. Show balance via GET /api-balance. Enter amount (RM10–RM500). Call POST /api-topup. Open payment_url for FPX payment. Handle topup.completed and topup.failed webhooks (HMAC-SHA256, same pattern as charge webhooks). Update balance after success.");
  paragraph("Member Impact: Members can top up their NoCap wallet directly from the 3rd party app via FPX.");

  subheading("Prompt 13 — 3rd Party Cashback & Commission Distribution");
  paragraph("(Distribution upgrade — START HERE for Path D) Merchant Action: Ensure the API app has a webhook URL configured to receive distribution.completed events. Each branch must have commission_percent set.");
  paragraph("Add a createDistribution service function that calls POST /api-distribute. Headers: x-api-key, x-api-secret (server-to-server, no Bearer token needed). Request body: { branch_id, member_referral_code (or user_id), amount (the sale amount), reference (unique idempotency key) }. The API calculates the commission pool automatically using the branch's commission_percent. Response: { success, distribution_id, breakdown: { total_pool, cashback, tier_commissions[], unclaimed_returned, branch_debited } }. The branch wallet is debited (negative balances allowed). Cashback (1/6 of pool) goes to the member, tier commissions (1/6 each) go to up to 5 referral ancestors, and unclaimed tiers are returned to the branch. Handle errors: 400 (validation/missing fields), 401 (invalid credentials), 404 (branch or member not found), 409 (duplicate reference). Set up webhook verification (HMAC-SHA256, same pattern as charge webhooks) for distribution.completed events. Build an admin/reporting page showing distribution history with breakdowns per branch.");
  paragraph("Member Impact: Members automatically receive cashback when a 3rd party sale is recorded. Referral ancestors earn tier commissions.");

  // --- When a New Branch Opens ---
  heading("14. When a New Branch Opens");
  paragraph("When a merchant expands and opens a new branch/outlet, here's what needs to happen:");

  subheading("NoCap Merchant Actions");
  paragraph("1. Create the branch in the NoCap Merchant Dashboard → Branch Management.");
  paragraph("2. The new branch is automatically available via GET /api-branches — no API app changes needed.");
  paragraph("3. No credential rotation required — merchant-level apps automatically cover new branches.");
  paragraph("4. No need to contact NoCap support or modify any API settings.");

  subheading("3rd Party System Actions");
  paragraph("1. Refresh branch list — Call GET /api-branches or click the 'Refresh Branches' button (Prompt 8).");
  paragraph("2. Add mapping — Insert a new row in nocap_branch_mappings linking the internal outlet ID to the new NoCap branch_id.");
  paragraph("3. Update branch selector — The new branch appears in the admin mapping page. Map it to the correct internal outlet.");
  paragraph("4. Unmapped warning — If Prompt 8's warning system is implemented, the new outlet surfaces as unmapped until configured.");

  subheading("Member Impact");
  paragraph("No action required from members — existing tokens and connections are completely unaffected. Payments at the new branch work immediately once the mapping is configured. No re-authorization, no new consent, no disruption.");
  paragraph("Key Point: Because merchant-level API apps cover all branches, no credential changes or member re-authorization is ever needed when new branches are added.");

  // --- Updated FAQ ---
  heading("15. FAQ");

  subheading("Common Integration Questions");
  paragraph("Q: Do existing users need to disconnect? A: No. They only re-authorize once (Prompt 7) to unlock referral features.");
  paragraph("Q: What happens to old tokens? A: NoCap auto-revokes old token and issues a new one with updated scopes. No conflict errors.");
  paragraph("Q: Is branch_id always required? A: Only for merchant-level apps. Branch-level apps default to their assigned branch.");
  paragraph("Q: Can I use both branch-level and merchant-level apps? A: Yes. Merchant-level apps offer flexibility for multi-outlet systems.");
  paragraph("Q: What do I do when a new branch opens? A: Merchant creates the branch in the dashboard. 3rd party refreshes via GET /api-branches and maps the new branch. No credential changes needed.");
  paragraph("Q: Do I need a new API app for each branch? A: No. A single merchant-level app covers all current and future branches.");
  paragraph("Q: What if upgrading from branch-level to merchant-level? A: Create a new merchant-level app, complete Prompts 6–9, keep old app active during transition.");
  paragraph("Q: What is Path D distribution? A: It allows 3rd parties to trigger cashback/commission for cash or card sales without requiring the customer to pay via NoCap wallet.");

  // Footer
  checkPage(20);
  y += 10;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, margin + maxWidth, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text("© 2026 NoCap. All rights reserved.", margin, y);

  doc.save("NoCap-API-Integration-Guide.pdf");
}
