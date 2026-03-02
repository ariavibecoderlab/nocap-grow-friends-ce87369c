

## Add Top-Up Integration Prompts to Roadmap

Add 3 new prompts (10-12) to the Integration Roadmap component for 3rd party systems that already have OAuth 2.0 and affiliate integration, and just need to add wallet top-up capability. Also add a new path badge ("Path C") and update the quick reference table.

### New Prompts

**Prompt 10 -- Add Top-Up API Service Function**
- Path: C (Top-Up upgrade)
- Prompt instructs the 3rd party to add a `createTopUp` service function that calls `POST /api-topup` with `x-api-key`, `x-api-secret`, and `Bearer` token headers, sending `{ amount, description, reference }`. Returns `{ payment_url, transaction_id, bill_code }`. Amount must be RM10-RM500.
- Member Impact: None -- backend code only.

**Prompt 11 -- Re-authorize for Top-Up Scope**
- Path: C (Top-Up upgrade)
- Prompt instructs to check stored scopes for `topup`. If missing, show a banner like "Enable Wallet Top-Up!" that redirects to `/authorize` with `scope=balance,charge,referral,topup`. NoCap auto-revokes old token and issues new one. Exchange code, update stored token and scopes.
- Member Impact: Members see a one-time banner. One click, approve, done.
- NoCap Merchant Action: None required.

**Prompt 12 -- Top-Up UI & Webhook Handling**
- Path: C (Top-Up upgrade)
- Prompt instructs to build a "Top Up NoCap Wallet" button/page. Show current balance via `GET /api-balance`. Let user enter amount (RM10-RM500). Call `POST /api-topup` with a unique reference. Open the returned `payment_url` for FPX payment. Handle `topup.completed` and `topup.failed` webhooks (HMAC-SHA256 verification, same pattern as charge webhooks). Update UI to reflect new balance after successful top-up.
- Member Impact: Members can top up their NoCap wallet directly from the 3rd party app.

### UI Changes

- Add `Path C (Prompts 10-12): Add Top-Up to existing` badge
- Update the quick reference table with 3 new rows showing "Skip" for New/Upgrade columns and "Yes" for a new "Top-Up" column (or mark them as applicable for all integrators who need top-up)

### Files Modified

- `src/components/IntegrationRoadmap.tsx` -- Add 3 new prompt entries to the PROMPTS array, update badges and reference table

