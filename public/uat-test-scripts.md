# NoCap Wallet — User Acceptance Test (UAT) Script

**Version:** 1.0  
**Date:** February 2026  
**Environment:** Staging / Production  
**Base URL:** https://nocap-grow-friends.lovable.app

---

## Table of Contents

1. [Authentication & Onboarding](#1-authentication--onboarding)
2. [Member Dashboard](#2-member-dashboard)
3. [Wallet Top-Up](#3-wallet-top-up)
4. [QR Pay (Merchant Payment)](#4-qr-pay-merchant-payment)
5. [Peer-to-Peer Transfer](#5-peer-to-peer-transfer)
6. [Transaction History](#6-transaction-history)
7. [PIN Management](#7-pin-management)
8. [Referral System](#8-referral-system)
9. [Member Profile & Settings](#9-member-profile--settings)
10. [Connected Apps (Member)](#10-connected-apps-member)
11. [Merchant Registration](#11-merchant-registration)
12. [Merchant Dashboard](#12-merchant-dashboard)
13. [Merchant Branches](#13-merchant-branches)
14. [Merchant Settlements & Withdrawals](#14-merchant-settlements--withdrawals)
15. [Merchant API Apps](#15-merchant-api-apps)
16. [Merchant API Logs](#16-merchant-api-logs)
17. [Branch Dashboard](#17-branch-dashboard)
18. [Admin — User Management](#18-admin--user-management)
19. [Admin — Fee Settings](#19-admin--fee-settings)
20. [Admin — Merchant Approvals](#20-admin--merchant-approvals)
21. [Admin — Withdrawal Approvals](#21-admin--withdrawal-approvals)
22. [Admin — Transactions](#22-admin--transactions)
23. [Admin — API Apps Management](#23-admin--api-apps-management)
24. [API Integration — OAuth Flow](#24-api-integration--oauth-flow)
25. [API Integration — Endpoints](#25-api-integration--endpoints)
26. [API Developer Portal](#26-api-developer-portal)
27. [Notifications](#27-notifications)
28. [Responsive / Mobile](#28-responsive--mobile)

---

## Test Conventions

| Symbol | Meaning |
|--------|---------|
| ✅ | Pass |
| ❌ | Fail |
| ⚠️ | Blocked / Partial |
| N/A | Not Applicable |

Each test case includes:
- **ID** — Unique identifier
- **Preconditions** — What must be true before running
- **Steps** — Numbered actions
- **Expected Result** — What should happen
- **Status** — Pass / Fail / Blocked
- **Tester / Date / Notes** — For recording results

---

## 1. Authentication & Onboarding

### TC-AUTH-001: New User Sign Up

| Field | Value |
|-------|-------|
| **Precondition** | User has no existing account |
| **Steps** | 1. Navigate to `/auth` <br> 2. Click "Sign Up" tab <br> 3. Enter valid email and password <br> 4. Click "Sign Up" <br> 5. Check email for verification link <br> 6. Click verification link |
| **Expected** | Account created. Verification email received. After verification, user can log in. |
| **Status** | |
| **Notes** | |

### TC-AUTH-002: Login with Valid Credentials

| Field | Value |
|-------|-------|
| **Precondition** | User has a verified account |
| **Steps** | 1. Navigate to `/auth` <br> 2. Enter email and password <br> 3. Click "Log In" |
| **Expected** | User is redirected to `/dashboard`. Wallet balance is displayed. |
| **Status** | |

### TC-AUTH-003: Login with Invalid Credentials

| Field | Value |
|-------|-------|
| **Precondition** | None |
| **Steps** | 1. Navigate to `/auth` <br> 2. Enter incorrect email/password <br> 3. Click "Log In" |
| **Expected** | Error toast displayed. User remains on auth page. |
| **Status** | |

### TC-AUTH-004: Logout

| Field | Value |
|-------|-------|
| **Precondition** | User is logged in |
| **Steps** | 1. Navigate to Profile/Settings <br> 2. Click "Sign Out" |
| **Expected** | User is redirected to landing page. Session is cleared. |
| **Status** | |

### TC-AUTH-005: Password Reset Flow

| Field | Value |
|-------|-------|
| **Precondition** | User has an existing account |
| **Steps** | 1. Navigate to `/auth` <br> 2. Click "Forgot Password" <br> 3. Enter email <br> 4. Check email for reset link <br> 5. Set new password |
| **Expected** | Password updated. User can log in with new password. |
| **Status** | |

### TC-AUTH-006: Onboarding Checklist

| Field | Value |
|-------|-------|
| **Precondition** | New user, first login |
| **Steps** | 1. Log in as new user <br> 2. Observe onboarding checklist on dashboard |
| **Expected** | Checklist shows pending items (Set PIN, Complete Profile, etc.). Items update as completed. |
| **Status** | |

---

## 2. Member Dashboard

### TC-DASH-001: View Dashboard

| Field | Value |
|-------|-------|
| **Precondition** | User is logged in as member |
| **Steps** | 1. Navigate to `/dashboard` |
| **Expected** | Dashboard displays: wallet balance, recent transactions, quick action buttons (Top Up, Transfer, QR Pay). NoCap logo visible in header. |
| **Status** | |

### TC-DASH-002: Quick Actions Navigation

| Field | Value |
|-------|-------|
| **Precondition** | User is on dashboard |
| **Steps** | 1. Click "Top Up" → verify redirect to `/top-up` <br> 2. Go back, click "Transfer" → verify redirect to `/transfer` <br> 3. Go back, click "QR Pay" → verify redirect to `/qr-pay` |
| **Expected** | Each button navigates to the correct page. |
| **Status** | |

---

## 3. Wallet Top-Up

### TC-TOPUP-001: Initiate Top-Up

| Field | Value |
|-------|-------|
| **Precondition** | User is logged in |
| **Steps** | 1. Navigate to `/top-up` <br> 2. Enter amount (e.g., RM 50.00) <br> 3. Click "Top Up" <br> 4. Complete payment via payment gateway |
| **Expected** | Bill created. User redirected to payment gateway. On success, wallet balance increases by the top-up amount. Transaction appears in history. |
| **Status** | |

### TC-TOPUP-002: Top-Up with Invalid Amount

| Field | Value |
|-------|-------|
| **Precondition** | User is logged in |
| **Steps** | 1. Navigate to `/top-up` <br> 2. Enter 0 or negative amount <br> 3. Attempt to submit |
| **Expected** | Validation error shown. Form does not submit. |
| **Status** | |

---

## 4. QR Pay (Merchant Payment)

### TC-QRPAY-001: Scan and Pay

| Field | Value |
|-------|-------|
| **Precondition** | User is logged in, has sufficient balance, merchant QR code available |
| **Steps** | 1. Navigate to `/qr-pay` <br> 2. Scan merchant QR code (or enter QR code ID) <br> 3. Confirm payment amount <br> 4. Enter PIN if required <br> 5. Confirm payment |
| **Expected** | Payment processed. Balance deducted. Success confirmation shown. Transaction appears in history with merchant/branch name. |
| **Status** | |

### TC-QRPAY-002: Pay with Insufficient Balance

| Field | Value |
|-------|-------|
| **Precondition** | User balance is lower than payment amount |
| **Steps** | 1. Attempt QR payment for amount exceeding balance |
| **Expected** | Error: "Insufficient balance". Payment not processed. |
| **Status** | |

### TC-QRPAY-003: Pay with Expired QR Code

| Field | Value |
|-------|-------|
| **Precondition** | QR code has expired |
| **Steps** | 1. Scan expired QR code |
| **Expected** | Error message indicating QR code is expired or invalid. |
| **Status** | |

---

## 5. Peer-to-Peer Transfer

### TC-XFER-001: Transfer to Another User

| Field | Value |
|-------|-------|
| **Precondition** | Sender is logged in with sufficient balance. Recipient exists. |
| **Steps** | 1. Navigate to `/transfer` <br> 2. Enter recipient's phone/email <br> 3. Enter amount <br> 4. Enter PIN if required <br> 5. Confirm transfer |
| **Expected** | Transfer processed. Sender balance decreased. Recipient balance increased. Both see transaction in history. |
| **Status** | |

### TC-XFER-002: Transfer to Non-Existent User

| Field | Value |
|-------|-------|
| **Precondition** | Sender is logged in |
| **Steps** | 1. Enter a phone/email that doesn't exist <br> 2. Attempt transfer |
| **Expected** | Error: "User not found" or similar. Transfer not processed. |
| **Status** | |

### TC-XFER-003: Transfer with Insufficient Balance

| Field | Value |
|-------|-------|
| **Precondition** | Sender balance < transfer amount |
| **Steps** | 1. Enter amount exceeding balance <br> 2. Attempt transfer |
| **Expected** | Error: "Insufficient balance". Transfer not processed. |
| **Status** | |

---

## 6. Transaction History

### TC-TXN-001: View Transaction List

| Field | Value |
|-------|-------|
| **Precondition** | User has prior transactions |
| **Steps** | 1. Navigate to `/transactions` |
| **Expected** | List of transactions displayed with date, type, amount, status. Most recent first. |
| **Status** | |

### TC-TXN-002: View Transaction Detail

| Field | Value |
|-------|-------|
| **Precondition** | Transactions exist |
| **Steps** | 1. Click on a transaction row |
| **Expected** | Detail view shows: transaction ID, type, amount, fee, net amount, description, date, status, and any metadata (branch name, reference). |
| **Status** | |

### TC-TXN-003: Filter Transactions

| Field | Value |
|-------|-------|
| **Precondition** | Multiple transaction types exist |
| **Steps** | 1. Use filter/tab to select specific type (e.g., "Payments") |
| **Expected** | Only transactions of selected type are shown. |
| **Status** | |

---

## 7. PIN Management

### TC-PIN-001: Set New PIN

| Field | Value |
|-------|-------|
| **Precondition** | User has no PIN set |
| **Steps** | 1. Navigate to `/set-pin` <br> 2. Enter 7-digit PIN <br> 3. Confirm PIN <br> 4. Submit |
| **Expected** | PIN set successfully. Profile `has_pin` updated to true. Toast confirmation. |
| **Status** | |

### TC-PIN-002: Reset PIN via OTP

| Field | Value |
|-------|-------|
| **Precondition** | User has a PIN set and email on file |
| **Steps** | 1. Navigate to `/reset-pin` <br> 2. Request OTP <br> 3. Enter OTP from email <br> 4. Set new PIN |
| **Expected** | OTP verified. New PIN set. User can use new PIN for transactions. |
| **Status** | |

### TC-PIN-003: PIN Lock After Failed Attempts

| Field | Value |
|-------|-------|
| **Precondition** | User has a PIN set |
| **Steps** | 1. Attempt a payment <br> 2. Enter wrong PIN 3 times |
| **Expected** | Account locked for PIN entry. Error message with lockout duration. |
| **Status** | |

---

## 8. Referral System

### TC-REF-001: View Referral Code

| Field | Value |
|-------|-------|
| **Precondition** | User is logged in |
| **Steps** | 1. Navigate to `/referral` |
| **Expected** | Unique referral code displayed. Share options visible. Referral tier information shown. |
| **Status** | |

### TC-REF-002: Sign Up with Referral Code

| Field | Value |
|-------|-------|
| **Precondition** | Valid referral code from existing user |
| **Steps** | 1. New user signs up <br> 2. Enter referral code during registration |
| **Expected** | Referral recorded. Both referrer and referee see the connection. Referral tree updated. |
| **Status** | |

---

## 9. Member Profile & Settings

### TC-PROF-001: View Profile

| Field | Value |
|-------|-------|
| **Precondition** | User is logged in |
| **Steps** | 1. Navigate to `/profile` |
| **Expected** | Profile page shows: name, email, phone, address, avatar. Edit options available. |
| **Status** | |

### TC-PROF-002: Update Profile

| Field | Value |
|-------|-------|
| **Precondition** | User is logged in |
| **Steps** | 1. Navigate to `/profile` <br> 2. Update name and phone <br> 3. Save |
| **Expected** | Profile updated. Toast confirmation. Changes reflected immediately. |
| **Status** | |

---

## 10. Connected Apps (Member)

### TC-CONN-001: View Connected Apps

| Field | Value |
|-------|-------|
| **Precondition** | User has authorized at least one third-party app |
| **Steps** | 1. Navigate to Profile → Connected Apps section |
| **Expected** | List of authorized apps with name, scopes, and granted date. Revoke button visible. |
| **Status** | |

### TC-CONN-002: Revoke App Access

| Field | Value |
|-------|-------|
| **Precondition** | At least one connected app exists |
| **Steps** | 1. Click "Revoke" on an app <br> 2. Confirm revocation |
| **Expected** | Access token revoked. App removed from list. Third-party app can no longer access user data. |
| **Status** | |

---

## 11. Merchant Registration

### TC-MREG-001: Submit Merchant Application

| Field | Value |
|-------|-------|
| **Precondition** | User is logged in as member |
| **Steps** | 1. Navigate to `/merchant-register` <br> 2. Fill in business name, type, registration no, address <br> 3. Enter bank details <br> 4. Upload documents if required <br> 5. Submit application |
| **Expected** | Application submitted with "pending" status. Confirmation message shown. Application visible in admin panel. |
| **Status** | |

### TC-MREG-002: Submit Incomplete Application

| Field | Value |
|-------|-------|
| **Precondition** | User is on merchant registration page |
| **Steps** | 1. Leave required fields empty <br> 2. Click submit |
| **Expected** | Validation errors shown for required fields. Form does not submit. |
| **Status** | |

---

## 12. Merchant Dashboard

### TC-MDASH-001: View Merchant Dashboard

| Field | Value |
|-------|-------|
| **Precondition** | User has approved merchant role |
| **Steps** | 1. Navigate to `/merchant` |
| **Expected** | Dashboard shows: total revenue, transaction count, branch performance, analytics charts. |
| **Status** | |

### TC-MDASH-002: View Merchant Analytics

| Field | Value |
|-------|-------|
| **Precondition** | Merchant has transactions |
| **Steps** | 1. Navigate to Merchant Dashboard → Analytics tab |
| **Expected** | Charts display revenue over time, transaction volume, and branch comparisons. |
| **Status** | |

---

## 13. Merchant Branches

### TC-MBRANCH-001: View Branch List

| Field | Value |
|-------|-------|
| **Precondition** | Merchant has branches |
| **Steps** | 1. Navigate to Merchant Dashboard |
| **Expected** | List of branches with name, balance, QR code, active status. |
| **Status** | |

### TC-MBRANCH-002: Assign Branch Owner

| Field | Value |
|-------|-------|
| **Precondition** | Merchant has a branch and a user to assign |
| **Steps** | 1. Open branch settings <br> 2. Assign owner user |
| **Expected** | Branch owner updated. Assigned user gains branch role access. |
| **Status** | |

---

## 14. Merchant Settlements & Withdrawals

### TC-MSETTLE-001: View Settlement Summary

| Field | Value |
|-------|-------|
| **Precondition** | Merchant has completed transactions |
| **Steps** | 1. Navigate to Merchant Dashboard → Settlement tab |
| **Expected** | Settlement summary with available balance, pending, and withdrawn amounts per branch. |
| **Status** | |

### TC-MWITH-001: Request Withdrawal

| Field | Value |
|-------|-------|
| **Precondition** | Merchant has available balance above minimum withdrawal |
| **Steps** | 1. Navigate to Merchant Dashboard → Withdrawals <br> 2. Select branch <br> 3. Enter amount <br> 4. Submit withdrawal request |
| **Expected** | Withdrawal request created with "pending" status. Balance reserved. Admin notified. |
| **Status** | |

### TC-MWITH-002: Withdrawal Below Minimum

| Field | Value |
|-------|-------|
| **Precondition** | Merchant has balance but below minimum |
| **Steps** | 1. Enter amount below minimum withdrawal <br> 2. Attempt submit |
| **Expected** | Error: amount below minimum withdrawal threshold. |
| **Status** | |

---

## 15. Merchant API Apps

### TC-MAPI-001: Register New API App

| Field | Value |
|-------|-------|
| **Precondition** | User is a merchant |
| **Steps** | 1. Navigate to Merchant Dashboard → API Apps tab <br> 2. Click "Register App" <br> 3. Enter app name, description, select branch <br> 4. Optionally enter webhook URL <br> 5. Submit |
| **Expected** | App created. API key and secret displayed ONCE. User prompted to save credentials. App appears in list. |
| **Status** | |

### TC-MAPI-002: Toggle Sandbox Mode

| Field | Value |
|-------|-------|
| **Precondition** | API app exists |
| **Steps** | 1. Toggle Sandbox switch on an API app |
| **Expected** | Sandbox mode toggled. Badge updates. Sandbox apps skip real money movement. |
| **Status** | |

### TC-MAPI-003: Edit Webhook URL

| Field | Value |
|-------|-------|
| **Precondition** | API app exists |
| **Steps** | 1. Click edit on webhook URL <br> 2. Enter new URL <br> 3. Save |
| **Expected** | Webhook URL updated. Future events sent to new URL. |
| **Status** | |

### TC-MAPI-004: Deactivate API App

| Field | Value |
|-------|-------|
| **Precondition** | Active API app exists |
| **Steps** | 1. Toggle app active/inactive switch |
| **Expected** | App deactivated. API calls with this app's credentials return 401. |
| **Status** | |

---

## 16. Merchant API Logs

### TC-MLOG-001: View API Request Logs

| Field | Value |
|-------|-------|
| **Precondition** | API app has received requests |
| **Steps** | 1. Navigate to Merchant Dashboard → API Apps → Logs tab |
| **Expected** | Log entries show: timestamp, endpoint, method, status code, duration. Color-coded status badges. |
| **Status** | |

### TC-MLOG-002: Expand Log Detail

| Field | Value |
|-------|-------|
| **Precondition** | Log entries exist |
| **Steps** | 1. Click on a log entry to expand |
| **Expected** | Shows request body and response body (JSON formatted). Sensitive data (tokens) redacted. |
| **Status** | |

### TC-MLOG-003: View Webhook Deliveries

| Field | Value |
|-------|-------|
| **Precondition** | Webhook events have been sent |
| **Steps** | 1. Filter logs for webhook entries |
| **Expected** | Webhook logs show "WEBHOOK" method, delivery status, retry attempts. |
| **Status** | |

---

## 17. Branch Dashboard

### TC-BRANCH-001: View Branch Dashboard

| Field | Value |
|-------|-------|
| **Precondition** | User has branch owner role |
| **Steps** | 1. Navigate to `/branch` |
| **Expected** | Branch dashboard shows: sales summary, transaction search, branch balance. |
| **Status** | |

### TC-BRANCH-002: Search Branch Transactions

| Field | Value |
|-------|-------|
| **Precondition** | Branch has transactions |
| **Steps** | 1. Use search/filter on branch dashboard |
| **Expected** | Results filtered by date/amount/status. |
| **Status** | |

---

## 18. Admin — User Management

### TC-ADMIN-USER-001: View All Users

| Field | Value |
|-------|-------|
| **Precondition** | Logged in as admin |
| **Steps** | 1. Navigate to `/admin` → Users tab |
| **Expected** | List of all users with name, email, roles, status. |
| **Status** | |

### TC-ADMIN-USER-002: Assign/Remove Roles

| Field | Value |
|-------|-------|
| **Precondition** | Admin is viewing user list |
| **Steps** | 1. Select a user <br> 2. Add or remove a role (merchant, branch, admin) |
| **Expected** | Role updated. User gains/loses access to corresponding features. |
| **Status** | |

---

## 19. Admin — Fee Settings

### TC-ADMIN-FEE-001: View Fee Settings

| Field | Value |
|-------|-------|
| **Precondition** | Logged in as admin |
| **Steps** | 1. Navigate to Admin → Fee Settings |
| **Expected** | Current fee percentages, cashback rates, referral tier percentages, and PIN threshold displayed. |
| **Status** | |

### TC-ADMIN-FEE-002: Update Fee Settings

| Field | Value |
|-------|-------|
| **Precondition** | Admin on Fee Settings page |
| **Steps** | 1. Change a fee value <br> 2. Save |
| **Expected** | Setting saved. New value applied to future transactions. Toast confirmation. |
| **Status** | |

---

## 20. Admin — Merchant Approvals

### TC-ADMIN-MAPPR-001: Approve Merchant Application

| Field | Value |
|-------|-------|
| **Precondition** | Pending merchant application exists |
| **Steps** | 1. Navigate to Admin → Merchant Approvals <br> 2. Review application details <br> 3. Click "Approve" |
| **Expected** | Application status → "approved". User gains merchant role. Default branch created. Notification sent. |
| **Status** | |

### TC-ADMIN-MAPPR-002: Reject Merchant Application

| Field | Value |
|-------|-------|
| **Precondition** | Pending merchant application exists |
| **Steps** | 1. Review application <br> 2. Enter rejection reason <br> 3. Click "Reject" |
| **Expected** | Application status → "rejected". Rejection reason saved. User notified. |
| **Status** | |

---

## 21. Admin — Withdrawal Approvals

### TC-ADMIN-WAPPR-001: Approve Withdrawal

| Field | Value |
|-------|-------|
| **Precondition** | Pending withdrawal request exists |
| **Steps** | 1. Navigate to Admin → Withdrawal Approvals <br> 2. Review request <br> 3. Click "Approve" |
| **Expected** | Withdrawal approved. Amount deducted from branch balance. Transaction recorded. |
| **Status** | |

### TC-ADMIN-WAPPR-002: Reject Withdrawal

| Field | Value |
|-------|-------|
| **Precondition** | Pending withdrawal request exists |
| **Steps** | 1. Enter rejection reason <br> 2. Click "Reject" |
| **Expected** | Withdrawal rejected. Reserved balance restored. Merchant notified. |
| **Status** | |

---

## 22. Admin — Transactions

### TC-ADMIN-TXN-001: View All Transactions

| Field | Value |
|-------|-------|
| **Precondition** | Logged in as admin |
| **Steps** | 1. Navigate to Admin → Transactions |
| **Expected** | All platform transactions listed with user, type, amount, status, date. Pagination working. |
| **Status** | |

---

## 23. Admin — API Apps Management

### TC-ADMIN-API-001: View All API Apps

| Field | Value |
|-------|-------|
| **Precondition** | Logged in as admin |
| **Steps** | 1. Navigate to Admin → API Apps tab |
| **Expected** | All registered API apps listed with name, API key (truncated), status, creation date. |
| **Status** | |

### TC-ADMIN-API-002: Deactivate Any API App

| Field | Value |
|-------|-------|
| **Precondition** | Active API apps exist |
| **Steps** | 1. Toggle active switch on any app |
| **Expected** | App deactivated globally. All API calls using this app's credentials fail. |
| **Status** | |

---

## 24. API Integration — OAuth Flow

### TC-OAUTH-001: Authorization Redirect

| Field | Value |
|-------|-------|
| **Precondition** | Third-party app registered with valid app_id |
| **Steps** | 1. Navigate to `/authorize?app_id=APP_ID&redirect_uri=CALLBACK&scope=balance,charge&state=xyz` |
| **Expected** | User sees consent screen with app name, requested scopes. Approve/Deny buttons visible. |
| **Status** | |

### TC-OAUTH-002: Approve Authorization

| Field | Value |
|-------|-------|
| **Precondition** | User is logged in, on consent screen |
| **Steps** | 1. Click "Approve" |
| **Expected** | Redirected to `redirect_uri?code=AUTH_CODE&state=xyz`. Code is single-use, expires in 10 min. |
| **Status** | |

### TC-OAUTH-003: Deny Authorization

| Field | Value |
|-------|-------|
| **Precondition** | User is on consent screen |
| **Steps** | 1. Click "Deny" |
| **Expected** | Redirected to `redirect_uri?error=access_denied&state=xyz`. |
| **Status** | |

### TC-OAUTH-004: Token Exchange

| Field | Value |
|-------|-------|
| **Precondition** | Valid authorization code obtained |
| **Steps** | 1. POST to `/api-token-exchange` with code, app_id, app_secret |
| **Expected** | Response: `{ success: true, access_token, token_type: "Bearer", scopes, expires_in: 7776000 }` |
| **Status** | |

### TC-OAUTH-005: Token Exchange — Expired Code

| Field | Value |
|-------|-------|
| **Precondition** | Authorization code older than 10 minutes |
| **Steps** | 1. POST to `/api-token-exchange` with expired code |
| **Expected** | Error 401: "Authorization code expired" |
| **Status** | |

### TC-OAUTH-006: Token Exchange — Reused Code

| Field | Value |
|-------|-------|
| **Precondition** | Code already exchanged once |
| **Steps** | 1. POST to `/api-token-exchange` with already-used code |
| **Expected** | Error 401: "Authorization code already used" |
| **Status** | |

---

## 25. API Integration — Endpoints

### TC-API-001: Check Balance

| Field | Value |
|-------|-------|
| **Precondition** | Valid API key, secret, and access token with `balance` scope |
| **Steps** | 1. GET `/api-balance` with headers: x-api-key, x-api-secret, Authorization |
| **Expected** | Response: `{ balance: <number>, currency: "MYR" }` |
| **Status** | |

### TC-API-002: Create Charge

| Field | Value |
|-------|-------|
| **Precondition** | Valid credentials, user has sufficient balance |
| **Steps** | 1. POST `/api-charge` with `{ amount: 10.00, description: "Test" }` |
| **Expected** | Charge created. Response includes charge_id, transaction_id, new_balance. |
| **Status** | |

### TC-API-003: Create Charge — Insufficient Balance

| Field | Value |
|-------|-------|
| **Precondition** | User balance < charge amount |
| **Steps** | 1. POST `/api-charge` with amount > balance |
| **Expected** | Error 400: INSUFFICIENT_BALANCE |
| **Status** | |

### TC-API-004: Create Charge — PIN Required

| Field | Value |
|-------|-------|
| **Precondition** | Amount >= PIN threshold |
| **Steps** | 1. POST `/api-charge` without pin field |
| **Expected** | Error 403: PIN_REQUIRED |
| **Status** | |

### TC-API-005: Check Charge Status

| Field | Value |
|-------|-------|
| **Precondition** | Charge exists |
| **Steps** | 1. GET `/api-charge-status?charge_id=UUID` with x-api-key, x-api-secret |
| **Expected** | Response with charge details and status. |
| **Status** | |

### TC-API-006: List Charges

| Field | Value |
|-------|-------|
| **Precondition** | Charges exist for this app |
| **Steps** | 1. GET `/api-charges-list?page=1&limit=10` |
| **Expected** | Paginated list of charges with total count. |
| **Status** | |

### TC-API-007: Refund a Charge

| Field | Value |
|-------|-------|
| **Precondition** | Completed charge exists |
| **Steps** | 1. POST `/api-refund` with `{ charge_id: UUID }` |
| **Expected** | Full refund processed. Charge status → "refunded". User balance restored. |
| **Status** | |

### TC-API-008: Partial Refund

| Field | Value |
|-------|-------|
| **Precondition** | Completed charge for RM 100 |
| **Steps** | 1. POST `/api-refund` with `{ charge_id: UUID, amount: 30.00 }` |
| **Expected** | Partial refund of RM 30. Charge status → "partial_refund". |
| **Status** | |

### TC-API-009: Sandbox Mode Charge

| Field | Value |
|-------|-------|
| **Precondition** | API app is in Sandbox mode |
| **Steps** | 1. POST `/api-charge` in sandbox |
| **Expected** | Charge processed without real money movement. Response includes `is_sandbox: true`. |
| **Status** | |

### TC-API-010: Rate Limiting

| Field | Value |
|-------|-------|
| **Precondition** | Valid API credentials |
| **Steps** | 1. Send 31 charge requests within 1 minute |
| **Expected** | 31st request returns 429: Rate limited. |
| **Status** | |

### TC-API-011: Invalid API Key

| Field | Value |
|-------|-------|
| **Precondition** | None |
| **Steps** | 1. Call any API endpoint with invalid x-api-key |
| **Expected** | Error 401: Invalid API credentials. |
| **Status** | |

---

## 26. API Developer Portal

### TC-DOCS-001: View API Documentation

| Field | Value |
|-------|-------|
| **Precondition** | User is a merchant |
| **Steps** | 1. Navigate to `/api-docs` |
| **Expected** | Full API documentation displayed with sections: Overview, OAuth Flow, Endpoints, Webhooks, Rate Limits, Error Codes, Sandbox. Syntax highlighting on code blocks. |
| **Status** | |

### TC-DOCS-002: Try It Panel

| Field | Value |
|-------|-------|
| **Precondition** | On API docs page |
| **Steps** | 1. Open "Try It" panel <br> 2. Select an endpoint <br> 3. Enter test parameters <br> 4. Click "Send" |
| **Expected** | Request sent. Response displayed with status code and body. |
| **Status** | |

### TC-DOCS-003: Download Markdown Guide

| Field | Value |
|-------|-------|
| **Precondition** | On API docs page |
| **Steps** | 1. Click "Download Markdown" |
| **Expected** | `.md` file downloaded with complete API documentation. |
| **Status** | |

### TC-DOCS-004: Download PDF Guide

| Field | Value |
|-------|-------|
| **Precondition** | On API docs page |
| **Steps** | 1. Click "Download PDF" |
| **Expected** | Branded PDF downloaded with NoCap header, yellow accent, and all API documentation sections. |
| **Status** | |

### TC-DOCS-005: Generate Test Token

| Field | Value |
|-------|-------|
| **Precondition** | Merchant has an API app |
| **Steps** | 1. Use Sandbox shortcut to generate test token |
| **Expected** | Test token generated. Can be used for API testing without full OAuth flow. |
| **Status** | |

---

## 27. Notifications

### TC-NOTIF-001: View Notifications

| Field | Value |
|-------|-------|
| **Precondition** | User has notifications |
| **Steps** | 1. Click notification bell icon |
| **Expected** | Notification list displayed with title, message, timestamp. Unread count badge shown. |
| **Status** | |

### TC-NOTIF-002: Mark as Read

| Field | Value |
|-------|-------|
| **Precondition** | Unread notifications exist |
| **Steps** | 1. Click on a notification |
| **Expected** | Notification marked as read. Unread count decremented. |
| **Status** | |

---

## 28. Responsive / Mobile

### TC-MOBILE-001: Mobile Navigation

| Field | Value |
|-------|-------|
| **Precondition** | App loaded on mobile viewport (≤ 414px) |
| **Steps** | 1. Verify bottom navigation bar is visible <br> 2. Tap each nav item |
| **Expected** | Bottom nav shows icons for Dashboard, Transactions, QR Pay, Profile. Each navigates correctly. |
| **Status** | |

### TC-MOBILE-002: Landing Page Mobile

| Field | Value |
|-------|-------|
| **Precondition** | Not logged in, mobile viewport |
| **Steps** | 1. Navigate to `/` |
| **Expected** | Hero section, features, and CTA are responsive. No horizontal scroll. Logo and animations render correctly. |
| **Status** | |

### TC-MOBILE-003: Dashboard Mobile

| Field | Value |
|-------|-------|
| **Precondition** | Logged in, mobile viewport |
| **Steps** | 1. Navigate to `/dashboard` |
| **Expected** | Balance card, quick actions, and recent transactions stack vertically. All tappable. |
| **Status** | |

---

## Sign-Off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| QA Lead | | | |
| Product Owner | | | |
| Dev Lead | | | |

---

*Generated for NoCap Wallet v1.0 — February 2026*
