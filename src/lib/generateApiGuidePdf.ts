import jsPDF from "jspdf";

export function generateApiGuidePdf() {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;
  let y = 20;

  // === BRANDED HEADER ===
  // Black banner
  doc.setFillColor(15, 15, 15);
  doc.rect(0, 0, pageWidth, 44, "F");

  // Yellow accent bar
  doc.setFillColor(250, 204, 21); // secondary yellow
  doc.rect(0, 44, pageWidth, 2, "F");

  // Zap icon (⚡ drawn as polygon)
  const zx = margin + 1, zy = 12;
  doc.setFillColor(250, 204, 21);
  doc.triangle(zx + 4, zy, zx, zy + 8, zx + 5, zy + 7, "F");
  doc.triangle(zx + 2, zy + 7, zx + 6, zy + 15, zx + 3, zy + 8, "F");

  // "NOcap" text
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text("NO", margin + 12, 24);
  const noWidth = doc.getTextWidth("NO");
  doc.setTextColor(250, 204, 21);
  doc.text("cap", margin + 12 + noWidth, 24);

  // Subtitle
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(180, 180, 180);
  doc.text("API Integration Guide", margin + 12, 32);

  // Version info right-aligned
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text("Version 1.1 — February 2026", pageWidth - margin, 32, { align: "right" });

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
  paragraph("NoCap provides a REST API that allows third-party applications to check user wallet balances, create charges from user wallets, process refunds, and query charge history. All access is secured via OAuth 2.0 Authorization Code flow.");

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
  tableRow(["scope", "Optional", "balance, charge, referral (defaults to balance,charge)"]);
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
  code(`curl -X POST ${BASE_URL}/api-referral-register \\\n  -H "x-api-key: KEY" -H "x-api-secret: SECRET" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "email": "newuser@example.com",\n    "referral_code": "A1B2C3D4",\n    "full_name": "Ahmad Bin Ali"\n  }'`);
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

  // --- Webhooks ---
  heading("5. Webhooks");
  paragraph("Configure your webhook URL in Merchant Dashboard > API Apps. NoCap sends POST requests with HMAC-SHA256 signed payloads.");

  subheading("Headers");
  tableRow(["Header", "Description"], true);
  tableRow(["X-Webhook-Signature", "HMAC-SHA256 hex signature"]);
  tableRow(["X-Webhook-Attempt", "Retry attempt (1–3)"]);

  subheading("Events");
  paragraph("charge.completed — Charge was successfully processed");
  paragraph("charge.failed — Charge failed (includes reason code)");
  paragraph("charge.refunded — Full refund processed");
  paragraph("charge.partial_refund — Partial refund processed");

  subheading("Retry Policy");
  paragraph("3 attempts with exponential backoff: immediate, 1s, 2s. Respond with 2xx to acknowledge.");

  subheading("Signature Verification (Node.js)");
  code(`const crypto = require('crypto');\nfunction verify(body, sig, secret) {\n  const expected = crypto\n    .createHmac('sha256', secret)\n    .update(body).digest('hex');\n  return crypto.timingSafeEqual(\n    Buffer.from(expected),\n    Buffer.from(sig)\n  );\n}`);

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
  paragraph("This section provides a complete step-by-step guide for integrating NoCap into your system. Two paths are available:");
  paragraph("Path A (Prompts 1–9): New to NoCap — full integration from scratch.");
  paragraph("Path B (Prompts 6–9 only): Already have NoCap wallet — upgrade only.");
  paragraph("Important: Existing users do NOT need to disconnect. Wallet and payments continue working. Users only re-authorize once to unlock referral features.");

  subheading("Quick Reference");
  tableRow(["Prompt", "New", "Upgrade"], true);
  tableRow(["1 — Credentials & DB", "Yes", "Skip"]);
  tableRow(["2 — API Service Layer", "Yes", "Skip"]);
  tableRow(["3 — OAuth Connection", "Yes", "Skip"]);
  tableRow(["4 — Registration + Referral", "Yes", "Skip"]);
  tableRow(["5 — Wallet Checkout", "Yes", "Skip"]);
  tableRow(["6 — Upgrade DB + APIs", "Yes", "Start here"]);
  tableRow(["7 — Re-auth for Referral", "Yes", "Yes"]);
  tableRow(["8 — Multi-Branch Routing", "Yes", "Yes"]);
  tableRow(["9 — Referral Dashboard", "Yes", "Yes"]);

  subheading("Prompt 1 — Store NoCap API Credentials");
  paragraph("(New integrators only) Store NOCAP_APP_ID, NOCAP_API_KEY, NOCAP_API_SECRET as backend secrets. Create a 'nocap_connections' table with: id, customer_id, nocap_user_id, access_token, scopes (text array), referral_code, connected_at, updated_at. Add RLS so customers can only read their own connection.");

  subheading("Prompt 2 — Build NoCap API Service Layer");
  paragraph("(New integrators only) Create service functions for all NoCap endpoints:");
  paragraph("Wallet: checkBalance, createCharge (with optional branch_id), getChargeStatus, listCharges, refundCharge, listBranches.");
  paragraph("Referral: getReferralInfo, registerViaReferral, getReferralNetwork, getCashbackHistory.");
  paragraph("All functions use x-api-key + x-api-secret headers. Bearer token endpoints as documented.");

  subheading("Prompt 3 — OAuth Wallet Connection Flow");
  paragraph("(New integrators only) Add 'Connect NoCap Wallet' button. Redirect to /authorize with scope=balance,charge,referral (all three upfront). On callback: verify state, exchange code via POST /api-token-exchange, store access_token and scopes. Handle error=access_denied.");

  subheading("Prompt 4 — Registration with Referral");
  paragraph("(New integrators only) Add optional 'Referral Code' to signup. After account creation, call POST /api-referral-register. Store access_token, nocap_user_id, referral_code. Customer is auto-connected — no OAuth needed. If NoCap registration fails, don't block your signup.");

  subheading("Prompt 5 — Wallet Payment in Checkout");
  paragraph("(New integrators only) Add NoCap as payment option: show balance (GET /api-balance), call POST /api-charge with amount, description, reference, branch_id. Handle PIN_REQUIRED (show PIN input) and INSUFFICIENT_BALANCE. Set up webhook verification (HMAC-SHA256) for charge.completed, charge.failed, charge.refunded events.");

  subheading("Prompt 6 — Upgrade for Affiliate & Multi-Branch");
  paragraph("(All integrators — existing integrators START HERE) DO NOT remove existing wallet features. Add referral_code and scopes columns to nocap_connections. Create 'nocap_branch_mappings' table. Add new API service functions: getReferralInfo, registerViaReferral, getReferralNetwork, getCashbackHistory, listBranches. Update createCharge to accept optional branch_id.");

  subheading("Prompt 7 — Re-authorize for Referral Scope");
  paragraph("(All integrators) Existing customers have only 'balance' and 'charge' scopes. Check stored scopes — if missing 'referral', show banner: 'Unlock Referral Rewards!' On click, redirect to /authorize with scope=balance,charge,referral. NoCap auto-revokes old token and issues new one. Exchange code via same existing flow. Update stored token and scopes. Hide banner once granted.");

  subheading("Prompt 8 — Multi-Branch Charge Routing");
  paragraph("(All integrators) DO NOT change existing payment logic. Call GET /api-branches to fetch NoCap branches. Store in nocap_branch_mappings. Build admin page to map your outlets to NoCap branch IDs. Include branch_id in POST /api-charge body. Show unmapped outlets as warnings. Add 'Refresh Branches' button.");

  subheading("Prompt 9 — Referral Dashboard & Admin");
  paragraph("(All integrators) DO NOT modify existing wallet/payment UI. Add new sections:");
  paragraph("Customer Dashboard (if referral scope granted): referral code with copy/share, stats cards (direct referrals, network size, cashback, commission), network tree Tiers 1-5, earnings history with tabs.");
  paragraph("Admin Section: branch mapping management, connected customers overview, top referrers by network size.");

  subheading("FAQ — Common Upgrade Questions");
  paragraph("Q: Do existing users need to disconnect? A: No. Wallet and payments continue working. They only re-authorize once to unlock referral features.");
  paragraph("Q: What happens to old tokens? A: NoCap auto-revokes old token and issues a new one with updated scopes. No conflict errors.");
  paragraph("Q: Is branch_id always required? A: Only for merchant-level apps. Branch-level apps default to their assigned branch.");

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
