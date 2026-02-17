import jsPDF from "jspdf";

export function generateApiGuidePdf() {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;
  let y = 20;

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

  title("NoCap API", 26);
  title("Integration Guide", 18);
  y += 2;
  paragraph(`Base URL: ${BASE_URL}`);
  paragraph("Authorization URL: https://nocap.life/authorize");
  paragraph("Version 1.0 — February 2026");
  y += 6;

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
  tableRow(["scope", "Optional", "balance, charge (defaults to both)"]);
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

  // --- Webhooks ---
  heading("4. Webhooks");
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
  heading("5. Rate Limits");
  tableRow(["Endpoint", "Limit"], true);
  tableRow(["/authorize", "10/min per user"]);
  tableRow(["/api-token-exchange", "10/min per app"]);
  tableRow(["/api-balance", "60/min per key"]);
  tableRow(["/api-charge", "30/min per key"]);
  tableRow(["/api-charge-status", "60/min per key"]);
  tableRow(["/api-charges-list", "60/min per key"]);
  tableRow(["/api-refund", "20/min per key"]);

  // --- Error Codes ---
  heading("6. Error Codes");
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
  heading("7. Sandbox Mode");
  paragraph("Apps in Sandbox mode skip balance checks, PIN verification, and real money movement. Webhooks fire normally with is_sandbox: true. Use for development and testing.");
  paragraph("Generate test tokens from the Merchant Dashboard to skip the full OAuth flow during development.");

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
