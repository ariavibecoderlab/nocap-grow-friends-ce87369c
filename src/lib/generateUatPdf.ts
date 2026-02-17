import jsPDF from "jspdf";

interface TestCase {
  id: string;
  title: string;
  precondition: string;
  steps: string;
  expected: string;
}

interface Section {
  title: string;
  cases: TestCase[];
}

function buildSections(): Section[] {
  return [
    {
      title: "1. Authentication & Onboarding",
      cases: [
        { id: "TC-AUTH-001", title: "New User Sign Up", precondition: "No existing account", steps: "1. Navigate to /auth\n2. Click 'Sign Up'\n3. Enter email & password\n4. Click 'Sign Up'\n5. Verify email\n6. Click verification link", expected: "Account created. Verification email received. User can log in after verification." },
        { id: "TC-AUTH-002", title: "Login — Valid Credentials", precondition: "Verified account exists", steps: "1. Navigate to /auth\n2. Enter email & password\n3. Click 'Log In'", expected: "Redirected to /dashboard. Balance displayed." },
        { id: "TC-AUTH-003", title: "Login — Invalid Credentials", precondition: "None", steps: "1. Enter incorrect email/password\n2. Click 'Log In'", expected: "Error toast. User stays on auth page." },
        { id: "TC-AUTH-004", title: "Logout", precondition: "User is logged in", steps: "1. Navigate to Profile\n2. Click 'Sign Out'", expected: "Redirected to landing page. Session cleared." },
        { id: "TC-AUTH-005", title: "Password Reset", precondition: "Account exists", steps: "1. Click 'Forgot Password'\n2. Enter email\n3. Check email for reset link\n4. Set new password", expected: "Password updated. Can log in with new password." },
        { id: "TC-AUTH-006", title: "Onboarding Checklist", precondition: "New user, first login", steps: "1. Log in as new user\n2. Observe checklist on dashboard", expected: "Checklist shows pending items (Set PIN, Complete Profile). Items update on completion." },
      ],
    },
    {
      title: "2. Member Dashboard",
      cases: [
        { id: "TC-DASH-001", title: "View Dashboard", precondition: "Logged in as member", steps: "1. Navigate to /dashboard", expected: "Balance, recent transactions, quick actions (Top Up, Transfer, QR Pay) displayed. Logo visible." },
        { id: "TC-DASH-002", title: "Quick Actions Navigation", precondition: "On dashboard", steps: "1. Click 'Top Up' -> /top-up\n2. Click 'Transfer' -> /transfer\n3. Click 'QR Pay' -> /qr-pay", expected: "Each button navigates correctly." },
      ],
    },
    {
      title: "3. Wallet Top-Up",
      cases: [
        { id: "TC-TOPUP-001", title: "Initiate Top-Up", precondition: "Logged in", steps: "1. Navigate to /top-up\n2. Enter RM 50\n3. Click 'Top Up'\n4. Complete payment", expected: "Bill created. Balance increases. Transaction in history." },
        { id: "TC-TOPUP-002", title: "Invalid Amount", precondition: "Logged in", steps: "1. Enter 0 or negative amount\n2. Attempt submit", expected: "Validation error. Form does not submit." },
      ],
    },
    {
      title: "4. QR Pay (Merchant Payment)",
      cases: [
        { id: "TC-QRPAY-001", title: "Scan and Pay", precondition: "Sufficient balance, QR available", steps: "1. Navigate to /qr-pay\n2. Scan QR code\n3. Confirm amount\n4. Enter PIN if required\n5. Confirm", expected: "Payment processed. Balance deducted. Success shown." },
        { id: "TC-QRPAY-002", title: "Insufficient Balance", precondition: "Balance < payment amount", steps: "1. Attempt QR payment exceeding balance", expected: "Error: 'Insufficient balance'. Not processed." },
        { id: "TC-QRPAY-003", title: "Expired QR Code", precondition: "QR code expired", steps: "1. Scan expired QR", expected: "Error: QR code is expired or invalid." },
      ],
    },
    {
      title: "5. Peer-to-Peer Transfer",
      cases: [
        { id: "TC-XFER-001", title: "Transfer to Another User", precondition: "Sufficient balance, recipient exists", steps: "1. Navigate to /transfer\n2. Enter recipient\n3. Enter amount\n4. Enter PIN if required\n5. Confirm", expected: "Sender balance decreased. Recipient increased. Both see transaction." },
        { id: "TC-XFER-002", title: "Non-Existent Recipient", precondition: "Logged in", steps: "1. Enter non-existent phone/email\n2. Attempt transfer", expected: "Error: 'User not found'. Not processed." },
        { id: "TC-XFER-003", title: "Insufficient Balance", precondition: "Balance < amount", steps: "1. Enter amount exceeding balance\n2. Attempt", expected: "Error: 'Insufficient balance'. Not processed." },
      ],
    },
    {
      title: "6. Transaction History",
      cases: [
        { id: "TC-TXN-001", title: "View Transactions", precondition: "Prior transactions exist", steps: "1. Navigate to /transactions", expected: "List with date, type, amount, status. Most recent first." },
        { id: "TC-TXN-002", title: "View Detail", precondition: "Transactions exist", steps: "1. Click on a transaction", expected: "Detail: ID, type, amount, fee, net, description, date, status." },
        { id: "TC-TXN-003", title: "Filter Transactions", precondition: "Multiple types exist", steps: "1. Select filter (e.g., 'Payments')", expected: "Only selected type shown." },
      ],
    },
    {
      title: "7. PIN Management",
      cases: [
        { id: "TC-PIN-001", title: "Set New PIN", precondition: "No PIN set", steps: "1. Navigate to /set-pin\n2. Enter 7-digit PIN\n3. Confirm\n4. Submit", expected: "PIN set. has_pin = true. Toast confirmation." },
        { id: "TC-PIN-002", title: "Reset PIN via OTP", precondition: "PIN set, email on file", steps: "1. Navigate to /reset-pin\n2. Request OTP\n3. Enter OTP\n4. Set new PIN", expected: "OTP verified. New PIN works." },
        { id: "TC-PIN-003", title: "PIN Lock After Failures", precondition: "PIN set", steps: "1. Enter wrong PIN 3 times", expected: "Locked for PIN entry. Error with lockout duration." },
      ],
    },
    {
      title: "8. Referral System",
      cases: [
        { id: "TC-REF-001", title: "View Referral Code", precondition: "Logged in", steps: "1. Navigate to /referral", expected: "Unique code displayed. Share options. Tier info." },
        { id: "TC-REF-002", title: "Sign Up with Referral", precondition: "Valid referral code", steps: "1. New user signs up with code", expected: "Referral recorded. Referral tree updated." },
      ],
    },
    {
      title: "9. Member Profile & Settings",
      cases: [
        { id: "TC-PROF-001", title: "View Profile", precondition: "Logged in", steps: "1. Navigate to /profile", expected: "Name, email, phone, address, avatar shown." },
        { id: "TC-PROF-002", title: "Update Profile", precondition: "Logged in", steps: "1. Update name and phone\n2. Save", expected: "Updated. Toast confirmation. Changes reflected." },
      ],
    },
    {
      title: "10. Connected Apps (Member)",
      cases: [
        { id: "TC-CONN-001", title: "View Connected Apps", precondition: "At least one app authorized", steps: "1. Navigate to Profile > Connected Apps", expected: "List with name, scopes, date. Revoke button." },
        { id: "TC-CONN-002", title: "Revoke App Access", precondition: "Connected app exists", steps: "1. Click 'Revoke'\n2. Confirm", expected: "Token revoked. App removed. App can no longer access data." },
      ],
    },
    {
      title: "11. Merchant Registration",
      cases: [
        { id: "TC-MREG-001", title: "Submit Application", precondition: "Logged in as member", steps: "1. Navigate to /merchant-register\n2. Fill all fields\n3. Submit", expected: "Application 'pending'. Confirmation shown." },
        { id: "TC-MREG-002", title: "Incomplete Application", precondition: "On registration page", steps: "1. Leave required fields empty\n2. Submit", expected: "Validation errors. Form does not submit." },
      ],
    },
    {
      title: "12. Merchant Dashboard",
      cases: [
        { id: "TC-MDASH-001", title: "View Dashboard", precondition: "Approved merchant", steps: "1. Navigate to /merchant", expected: "Revenue, transaction count, branch performance, analytics." },
        { id: "TC-MDASH-002", title: "View Analytics", precondition: "Has transactions", steps: "1. Open Analytics tab", expected: "Charts: revenue over time, volume, branch comparisons." },
      ],
    },
    {
      title: "13. Merchant Branches",
      cases: [
        { id: "TC-MBRANCH-001", title: "View Branch List", precondition: "Branches exist", steps: "1. Navigate to Merchant Dashboard", expected: "Branches with name, balance, QR, status." },
        { id: "TC-MBRANCH-002", title: "Assign Branch Owner", precondition: "Branch + user available", steps: "1. Open branch settings\n2. Assign owner", expected: "Owner updated. User gains branch access." },
      ],
    },
    {
      title: "14. Merchant Settlements & Withdrawals",
      cases: [
        { id: "TC-MSETTLE-001", title: "View Settlement Summary", precondition: "Completed transactions", steps: "1. Open Settlement tab", expected: "Available, pending, withdrawn amounts per branch." },
        { id: "TC-MWITH-001", title: "Request Withdrawal", precondition: "Balance > minimum", steps: "1. Open Withdrawals\n2. Select branch\n3. Enter amount\n4. Submit", expected: "Request 'pending'. Balance reserved. Admin notified." },
        { id: "TC-MWITH-002", title: "Below Minimum", precondition: "Balance < minimum", steps: "1. Enter amount below minimum", expected: "Error: below minimum threshold." },
      ],
    },
    {
      title: "15. Merchant API Apps",
      cases: [
        { id: "TC-MAPI-001", title: "Register New App", precondition: "Merchant", steps: "1. API Apps tab\n2. Register App\n3. Enter details\n4. Submit", expected: "App created. Key & secret shown ONCE." },
        { id: "TC-MAPI-002", title: "Toggle Sandbox", precondition: "App exists", steps: "1. Toggle Sandbox switch", expected: "Mode toggled. Badge updates." },
        { id: "TC-MAPI-003", title: "Edit Webhook URL", precondition: "App exists", steps: "1. Edit webhook URL\n2. Save", expected: "URL updated. Future events to new URL." },
        { id: "TC-MAPI-004", title: "Deactivate App", precondition: "Active app", steps: "1. Toggle active switch", expected: "Deactivated. API calls return 401." },
      ],
    },
    {
      title: "16. Merchant API Logs",
      cases: [
        { id: "TC-MLOG-001", title: "View Request Logs", precondition: "App has requests", steps: "1. Open Logs tab", expected: "Entries: timestamp, endpoint, method, status, duration." },
        { id: "TC-MLOG-002", title: "Expand Log Detail", precondition: "Log entries exist", steps: "1. Click to expand entry", expected: "Request/response JSON. Sensitive data redacted." },
        { id: "TC-MLOG-003", title: "Webhook Deliveries", precondition: "Webhooks sent", steps: "1. Filter for webhook entries", expected: "'WEBHOOK' method, delivery status, retry attempts." },
      ],
    },
    {
      title: "17. Branch Dashboard",
      cases: [
        { id: "TC-BRANCH-001", title: "View Branch Dashboard", precondition: "Branch owner role", steps: "1. Navigate to /branch", expected: "Sales summary, transaction search, balance." },
        { id: "TC-BRANCH-002", title: "Search Transactions", precondition: "Branch has transactions", steps: "1. Use search/filter", expected: "Filtered by date/amount/status." },
      ],
    },
    {
      title: "18. Admin — User Management",
      cases: [
        { id: "TC-ADMIN-USER-001", title: "View All Users", precondition: "Admin", steps: "1. Admin > Users tab", expected: "All users with name, email, roles, status." },
        { id: "TC-ADMIN-USER-002", title: "Assign/Remove Roles", precondition: "Viewing user list", steps: "1. Select user\n2. Add/remove role", expected: "Role updated. Access changes immediately." },
      ],
    },
    {
      title: "19. Admin — Fee Settings",
      cases: [
        { id: "TC-ADMIN-FEE-001", title: "View Fee Settings", precondition: "Admin", steps: "1. Admin > Fee Settings", expected: "Fee %, cashback rates, referral tiers, PIN threshold." },
        { id: "TC-ADMIN-FEE-002", title: "Update Fee", precondition: "On Fee Settings", steps: "1. Change value\n2. Save", expected: "Saved. Applied to future transactions. Toast." },
      ],
    },
    {
      title: "20. Admin — Merchant Approvals",
      cases: [
        { id: "TC-ADMIN-MAPPR-001", title: "Approve Application", precondition: "Pending application", steps: "1. Review\n2. Click 'Approve'", expected: "Status 'approved'. Merchant role granted. Branch created." },
        { id: "TC-ADMIN-MAPPR-002", title: "Reject Application", precondition: "Pending application", steps: "1. Enter reason\n2. Click 'Reject'", expected: "Status 'rejected'. Reason saved. User notified." },
      ],
    },
    {
      title: "21. Admin — Withdrawal Approvals",
      cases: [
        { id: "TC-ADMIN-WAPPR-001", title: "Approve Withdrawal", precondition: "Pending withdrawal", steps: "1. Review\n2. Click 'Approve'", expected: "Approved. Amount deducted. Transaction recorded." },
        { id: "TC-ADMIN-WAPPR-002", title: "Reject Withdrawal", precondition: "Pending withdrawal", steps: "1. Enter reason\n2. Click 'Reject'", expected: "Rejected. Balance restored. Merchant notified." },
      ],
    },
    {
      title: "22. Admin — Transactions",
      cases: [
        { id: "TC-ADMIN-TXN-001", title: "View All Transactions", precondition: "Admin", steps: "1. Admin > Transactions", expected: "All platform transactions. Pagination working." },
      ],
    },
    {
      title: "23. Admin — API Apps",
      cases: [
        { id: "TC-ADMIN-API-001", title: "View All API Apps", precondition: "Admin", steps: "1. Admin > API Apps", expected: "All apps with name, key, status, date." },
        { id: "TC-ADMIN-API-002", title: "Deactivate Any App", precondition: "Active apps exist", steps: "1. Toggle active switch", expected: "Deactivated globally. API calls fail." },
      ],
    },
    {
      title: "24. API — OAuth Flow",
      cases: [
        { id: "TC-OAUTH-001", title: "Authorization Redirect", precondition: "Valid app_id", steps: "1. Navigate to /authorize?app_id=...&redirect_uri=...&scope=balance,charge", expected: "Consent screen with app name, scopes, Approve/Deny." },
        { id: "TC-OAUTH-002", title: "Approve Authorization", precondition: "On consent screen", steps: "1. Click 'Approve'", expected: "Redirected with ?code=AUTH_CODE&state=xyz." },
        { id: "TC-OAUTH-003", title: "Deny Authorization", precondition: "On consent screen", steps: "1. Click 'Deny'", expected: "Redirected with ?error=access_denied." },
        { id: "TC-OAUTH-004", title: "Token Exchange", precondition: "Valid auth code", steps: "1. POST /api-token-exchange with code, app_id, app_secret", expected: "access_token, scopes, expires_in: 7776000." },
        { id: "TC-OAUTH-005", title: "Expired Code Exchange", precondition: "Code > 10 minutes old", steps: "1. POST /api-token-exchange", expected: "401: 'Authorization code expired'." },
        { id: "TC-OAUTH-006", title: "Reused Code Exchange", precondition: "Code already used", steps: "1. POST /api-token-exchange", expected: "401: 'Authorization code already used'." },
      ],
    },
    {
      title: "25. API — Endpoints",
      cases: [
        { id: "TC-API-001", title: "Check Balance", precondition: "Valid credentials + balance scope", steps: "1. GET /api-balance", expected: "{ balance, currency: 'MYR' }" },
        { id: "TC-API-002", title: "Create Charge", precondition: "Sufficient balance", steps: "1. POST /api-charge { amount: 10 }", expected: "charge_id, transaction_id, new_balance returned." },
        { id: "TC-API-003", title: "Charge — Insufficient Balance", precondition: "Balance < amount", steps: "1. POST /api-charge", expected: "400: INSUFFICIENT_BALANCE." },
        { id: "TC-API-004", title: "Charge — PIN Required", precondition: "Amount >= threshold", steps: "1. POST /api-charge without pin", expected: "403: PIN_REQUIRED." },
        { id: "TC-API-005", title: "Check Charge Status", precondition: "Charge exists", steps: "1. GET /api-charge-status?charge_id=UUID", expected: "Charge details and status." },
        { id: "TC-API-006", title: "List Charges", precondition: "Charges exist", steps: "1. GET /api-charges-list?page=1&limit=10", expected: "Paginated list with total count." },
        { id: "TC-API-007", title: "Full Refund", precondition: "Completed charge", steps: "1. POST /api-refund { charge_id }", expected: "Refunded. Balance restored. Status 'refunded'." },
        { id: "TC-API-008", title: "Partial Refund", precondition: "Charge for RM 100", steps: "1. POST /api-refund { charge_id, amount: 30 }", expected: "RM 30 refunded. Status 'partial_refund'." },
        { id: "TC-API-009", title: "Sandbox Charge", precondition: "App in Sandbox mode", steps: "1. POST /api-charge", expected: "Processed without real money. is_sandbox: true." },
        { id: "TC-API-010", title: "Rate Limiting", precondition: "Valid credentials", steps: "1. Send 31 charge requests in 1 min", expected: "31st returns 429: Rate limited." },
        { id: "TC-API-011", title: "Invalid API Key", precondition: "None", steps: "1. Call any endpoint with bad key", expected: "401: Invalid API credentials." },
      ],
    },
    {
      title: "26. API Developer Portal",
      cases: [
        { id: "TC-DOCS-001", title: "View Documentation", precondition: "Merchant", steps: "1. Navigate to /api-docs", expected: "Full docs with syntax highlighting." },
        { id: "TC-DOCS-002", title: "Try It Panel", precondition: "On API docs", steps: "1. Select endpoint\n2. Enter params\n3. Send", expected: "Response displayed with status and body." },
        { id: "TC-DOCS-003", title: "Download Markdown", precondition: "On API docs", steps: "1. Click 'Download Markdown'", expected: ".md file downloaded." },
        { id: "TC-DOCS-004", title: "Download PDF", precondition: "On API docs", steps: "1. Click 'Download PDF'", expected: "Branded PDF with all sections." },
        { id: "TC-DOCS-005", title: "Generate Test Token", precondition: "Has API app", steps: "1. Use Sandbox shortcut", expected: "Test token generated for API testing." },
      ],
    },
    {
      title: "27. Notifications",
      cases: [
        { id: "TC-NOTIF-001", title: "View Notifications", precondition: "Has notifications", steps: "1. Click bell icon", expected: "List with title, message, timestamp. Unread badge." },
        { id: "TC-NOTIF-002", title: "Mark as Read", precondition: "Unread notifications", steps: "1. Click notification", expected: "Marked read. Count decremented." },
      ],
    },
    {
      title: "28. Responsive / Mobile",
      cases: [
        { id: "TC-MOBILE-001", title: "Mobile Navigation", precondition: "Mobile viewport (<=414px)", steps: "1. Verify bottom nav\n2. Tap each item", expected: "Bottom nav with Dashboard, Transactions, QR Pay, Profile." },
        { id: "TC-MOBILE-002", title: "Landing Page Mobile", precondition: "Not logged in, mobile", steps: "1. Navigate to /", expected: "Responsive. No horizontal scroll. Logo renders." },
        { id: "TC-MOBILE-003", title: "Dashboard Mobile", precondition: "Logged in, mobile", steps: "1. Navigate to /dashboard", expected: "Cards stack vertically. All tappable." },
      ],
    },
    {
      title: "29. Session Management & Security",
      cases: [
        { id: "TC-SESSION-001", title: "Inactivity Timeout Warning", precondition: "Logged in", steps: "1. Remain idle 8 minutes\n2. Observe at 8-min mark", expected: "Warning dialog with 2-min countdown. Stay/Logout options." },
        { id: "TC-SESSION-002", title: "Inactivity Auto-Logout", precondition: "Warning showing", steps: "1. Don't interact\n2. Wait for countdown to 0", expected: "Auto logged out. Redirected to landing." },
        { id: "TC-SESSION-003", title: "Extend Session", precondition: "Warning visible", steps: "1. Click 'Stay Logged In'", expected: "Dialog closes. Timer resets. Still logged in." },
        { id: "TC-SESSION-004", title: "Single Session Enforcement", precondition: "Logged in on Device A", steps: "1. Login on Device B with same credentials", expected: "Device B succeeds. Device A session invalidated." },
        { id: "TC-SESSION-005", title: "Expired Session API Call", precondition: "Session expired", steps: "1. Attempt to load /dashboard", expected: "Redirected to /auth. No partial data." },
      ],
    },
    {
      title: "30. Concurrent Transactions",
      cases: [
        { id: "TC-CONCUR-001", title: "Simultaneous Payments", precondition: "RM 100 balance", steps: "1. Tab 1: pay RM 80\n2. Tab 2: pay RM 80 simultaneously", expected: "First succeeds. Second fails. Balance = RM 20." },
        { id: "TC-CONCUR-002", title: "Double-Click Payment", precondition: "On payment confirmation", steps: "1. Rapidly double-click 'Confirm'", expected: "Only 1 transaction. Button disabled after first click." },
        { id: "TC-CONCUR-003", title: "Duplicate Webhook Callback", precondition: "Top-up initiated", steps: "1. Simulate duplicate webhook", expected: "Balance credited once. Idempotent." },
        { id: "TC-CONCUR-004", title: "Concurrent API Charges", precondition: "RM 50 balance", steps: "1. Two simultaneous POST /api-charge for RM 40", expected: "One succeeds. One fails. Balance = RM 10." },
        { id: "TC-CONCUR-005", title: "Transfer to Self", precondition: "Logged in", steps: "1. Enter own phone/email\n2. Attempt transfer", expected: "Error: 'Cannot transfer to yourself.'" },
        { id: "TC-CONCUR-006", title: "Refund Already Refunded", precondition: "Fully refunded charge", steps: "1. POST /api-refund with same charge_id", expected: "409: 'Charge already refunded.'" },
      ],
    },
    {
      title: "31. Network & Error Handling",
      cases: [
        { id: "TC-NET-001", title: "Slow Network Dashboard", precondition: "Logged in, simulate slow 3G", steps: "1. Navigate to /dashboard", expected: "Loading skeleton shown. No blank screen. Data renders." },
        { id: "TC-NET-002", title: "Network Down During Payment", precondition: "On payment confirmation", steps: "1. Disable network\n2. Click 'Confirm'", expected: "Error: 'Network error'. No partial transaction." },
        { id: "TC-NET-003", title: "Reconnection After Error", precondition: "Network error occurred", steps: "1. Restore network\n2. Retry action", expected: "Succeeds on retry. No stale data." },
        { id: "TC-NET-004", title: "API Timeout", precondition: "Third-party app", steps: "1. Simulate >60s request", expected: "504 timeout. No partial charge. Safe to retry." },
        { id: "TC-NET-005", title: "Webhook Retry on Failure", precondition: "Webhook URL unreachable", steps: "1. Create charge triggering webhook\n2. Endpoint returns 500", expected: "3 retries with backoff. Attempts logged." },
        { id: "TC-NET-006", title: "Oversized Metadata", precondition: "Valid API credentials", steps: "1. POST /api-charge with >4KB metadata", expected: "400: 'Metadata exceeds maximum size (4KB).'" },
      ],
    },
    {
      title: "32. Token & Credential Edge Cases",
      cases: [
        { id: "TC-TOKEN-001", title: "Expired Access Token", precondition: "Token past 90-day expiry", steps: "1. Call /api-balance", expected: "401: 'Access token expired.'" },
        { id: "TC-TOKEN-002", title: "Revoked Token API Call", precondition: "User revoked app access", steps: "1. Call /api-balance with revoked token", expected: "401: 'Token revoked.'" },
        { id: "TC-TOKEN-003", title: "Deactivated App API Call", precondition: "App deactivated", steps: "1. Call any endpoint with deactivated app key", expected: "401: 'Application is deactivated.'" },
        { id: "TC-TOKEN-004", title: "Missing Required Headers", precondition: "Valid credentials", steps: "1. Call /api-charge without x-api-secret", expected: "401: indicates which header is missing." },
        { id: "TC-TOKEN-005", title: "Scope Violation", precondition: "Token has only 'balance' scope", steps: "1. POST /api-charge", expected: "403: 'Insufficient scope. Required: charge.'" },
      ],
    },
    {
      title: "33. Data Validation & Boundaries",
      cases: [
        { id: "TC-VALID-001", title: "Charge Amount Boundaries", precondition: "Valid credentials", steps: "1. amount=0 (reject)\n2. amount=-5 (reject)\n3. amount=50001 (reject)\n4. amount=0.01 (accept)\n5. amount=50000 (accept)", expected: "Cases 1-3 rejected (400). Cases 4-5 accepted." },
        { id: "TC-VALID-002", title: "XSS in Description", precondition: "Valid credentials", steps: "1. POST /api-charge with <script> in description", expected: "Created but sanitized. No XSS." },
        { id: "TC-VALID-003", title: "SQL Injection in Search", precondition: "On transaction page", steps: "1. Enter SQL injection in search field", expected: "Treated as text. No data loss." },
        { id: "TC-VALID-004", title: "Refund Exceeds Original", precondition: "RM 100 charge", steps: "1. POST /api-refund { amount: 150 }", expected: "400: 'Refund exceeds original charge.'" },
        { id: "TC-VALID-005", title: "Cumulative Refund Overflow", precondition: "RM 100 charge, RM 60 already refunded", steps: "1. POST /api-refund { amount: 50 }", expected: "400: 'Total refunds would exceed charge.'" },
        { id: "TC-VALID-006", title: "Excessively Long Input", precondition: "On profile page", steps: "1. Enter 10,000-char name\n2. Save", expected: "Validation error or truncated. No DB error." },
      ],
    },
  ];
}

export function generateUatPdf() {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const maxWidth = pageWidth - margin * 2;
  let y = 0;
  let pageNum = 1;

  const DARK = [15, 15, 15] as const;
  const YELLOW = [250, 204, 21] as const;
  const GRAY = [120, 120, 120] as const;
  const LIGHT_GRAY = [220, 220, 220] as const;
  const WHITE = [255, 255, 255] as const;

  function addFooter() {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text(`NoCap UAT Checklist v1.0 — February 2026`, margin, pageHeight - 8);
    doc.text(`Page ${pageNum}`, pageWidth - margin, pageHeight - 8, { align: "right" });
  }

  function newPage() {
    addFooter();
    doc.addPage();
    pageNum++;
    y = 15;
  }

  function checkPage(needed = 12) {
    if (y + needed > pageHeight - 15) {
      newPage();
    }
  }

  // ===== COVER PAGE =====
  // Black header
  doc.setFillColor(...DARK);
  doc.rect(0, 0, pageWidth, 50, "F");
  doc.setFillColor(...YELLOW);
  doc.rect(0, 50, pageWidth, 2.5, "F");

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.setTextColor(...WHITE);
  doc.text("NO", margin, 28);
  const noW = doc.getTextWidth("NO");
  doc.setTextColor(...YELLOW);
  doc.text("cap", margin + noW, 28);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(180, 180, 180);
  doc.text("User Acceptance Test Checklist", margin, 38);

  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text("Version 1.0 — February 2026", pageWidth - margin, 38, { align: "right" });

  y = 62;

  // Info box
  doc.setFillColor(248, 248, 248);
  doc.roundedRect(margin, y, maxWidth, 32, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(40, 40, 40);
  doc.text("Test Information", margin + 5, y + 7);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);

  const infoLines = [
    "Environment:  Staging / Production",
    "Base URL:     https://nocap-grow-friends.lovable.app",
    "Date:         ___________________    Tester: ___________________",
  ];
  infoLines.forEach((line, i) => {
    doc.text(line, margin + 5, y + 14 + i * 5);
  });
  y += 40;

  // Legend
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(40, 40, 40);
  doc.text("Status Legend", margin, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  const legend = ["P = Pass    F = Fail    B = Blocked    N/A = Not Applicable"];
  doc.text(legend[0], margin, y);
  y += 8;

  // Summary stats
  const sections = buildSections();
  const totalCases = sections.reduce((sum, s) => sum + s.cases.length, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(40, 40, 40);
  doc.text(`Total: ${sections.length} sections, ${totalCases} test cases`, margin, y);
  y += 10;

  // TOC
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...DARK);
  doc.text("Table of Contents", margin, y);
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(60, 60, 60);
  sections.forEach((sec) => {
    checkPage(4);
    doc.text(`${sec.title}  (${sec.cases.length} cases)`, margin + 2, y);
    y += 4;
  });

  addFooter();

  // ===== TEST CASE PAGES =====
  const colId = margin;
  const colTitle = margin + 24;
  const colPrecon = margin + 58;
  const colSteps = margin + 92;
  const colExpected = margin + 132;
  const colStatus = pageWidth - margin - 12;
  const rowHeight = 4;

  sections.forEach((section) => {
    newPage();

    // Section header
    doc.setFillColor(...DARK);
    doc.roundedRect(margin, y, maxWidth, 8, 1, 1, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...WHITE);
    doc.text(section.title, margin + 3, y + 5.5);
    y += 12;

    // Column headers
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y - 2, maxWidth, 6, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(40, 40, 40);
    doc.text("ID", colId + 1, y + 2);
    doc.text("Test Case", colTitle + 1, y + 2);
    doc.text("Precondition", colPrecon + 1, y + 2);
    doc.text("Steps", colSteps + 1, y + 2);
    doc.text("Expected", colExpected + 1, y + 2);
    doc.text("P/F", colStatus + 1, y + 2);
    y += 7;

    // Separator
    doc.setDrawColor(...LIGHT_GRAY);
    doc.line(margin, y - 1, margin + maxWidth, y - 1);

    section.cases.forEach((tc, idx) => {
      // Calculate row height based on content
      doc.setFontSize(6);
      const stepsLines = doc.splitTextToSize(tc.steps.replace(/\n/g, " | "), 38);
      const expectedLines = doc.splitTextToSize(tc.expected, 38);
      const preconLines = doc.splitTextToSize(tc.precondition, 32);
      const maxLines = Math.max(stepsLines.length, expectedLines.length, preconLines.length, 1);
      const cellHeight = Math.max(maxLines * 3.2 + 2, 6);

      checkPage(cellHeight + 2);

      // Alternating row bg
      if (idx % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(margin, y - 1, maxWidth, cellHeight, "F");
      }

      doc.setFont("courier", "bold");
      doc.setFontSize(5.5);
      doc.setTextColor(60, 60, 60);
      doc.text(tc.id, colId + 1, y + 2);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(30, 30, 30);
      const titleLines = doc.splitTextToSize(tc.title, 32);
      doc.text(titleLines, colTitle + 1, y + 2);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(6);
      doc.setTextColor(80, 80, 80);
      doc.text(preconLines, colPrecon + 1, y + 2);
      doc.text(stepsLines, colSteps + 1, y + 2);
      doc.text(expectedLines, colExpected + 1, y + 2);

      // Status checkbox
      doc.setDrawColor(150, 150, 150);
      doc.rect(colStatus + 2, y, 4, 4);

      y += cellHeight;

      // Row separator
      doc.setDrawColor(...LIGHT_GRAY);
      doc.line(margin, y - 0.5, margin + maxWidth, y - 0.5);
    });

    // Notes area
    checkPage(18);
    y += 4;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text("Notes:", margin, y);
    y += 3;
    doc.setDrawColor(200, 200, 200);
    for (let i = 0; i < 3; i++) {
      y += 5;
      doc.line(margin, y, margin + maxWidth, y);
    }
    y += 6;
  });

  // ===== SIGN-OFF PAGE =====
  checkPage(50);
  y += 10;
  doc.setDrawColor(...LIGHT_GRAY);
  doc.line(margin, y, margin + maxWidth, y);
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...DARK);
  doc.text("Sign-Off", margin, y);
  y += 8;

  const signOffRoles = ["QA Lead", "Product Owner", "Dev Lead", "Project Manager"];
  doc.setFontSize(8);

  // Table header
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, y - 2, maxWidth, 6, "F");
  doc.setFont("helvetica", "bold");
  doc.setTextColor(40, 40, 40);
  doc.text("Role", margin + 2, y + 2);
  doc.text("Name", margin + 40, y + 2);
  doc.text("Signature", margin + 90, y + 2);
  doc.text("Date", margin + 145, y + 2);
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  signOffRoles.forEach((role) => {
    doc.text(role, margin + 2, y + 4);
    doc.setDrawColor(...LIGHT_GRAY);
    doc.line(margin + 40, y + 5, margin + 85, y + 5);
    doc.line(margin + 90, y + 5, margin + 140, y + 5);
    doc.line(margin + 145, y + 5, margin + maxWidth - 2, y + 5);
    y += 10;
  });

  y += 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text("© 2026 NoCap. All rights reserved.", margin, y);

  addFooter();

  doc.save("NoCap-UAT-Checklist.pdf");
}
