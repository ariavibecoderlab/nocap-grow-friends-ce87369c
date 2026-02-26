

# Nightly Test Account Reset with Daily PDF Report

## Overview

Create a backend function that handles three operations for the test account `azarul@brainybunch.com`:

1. **Immediate**: Top up RM 1,000 to seed the test wallet tonight
2. **Nightly at 10:55 PM MYT**: Reverse ALL transactions (including referral commissions, cashback, branch credits, admin fees) back to pre-test state
3. **Nightly at 11:00 PM MYT**: Top up RM 1,000 for the next day's testing
4. **Nightly at 11:05 PM MYT**: Generate and email a PDF report (summary + transaction detail) to azarul@brainybunch.com

## What Gets Reversed (100% Complete)

For each **payment** transaction by the test user, the function traces the `reference_id` chain to find and reverse ALL downstream impacts:

| Impact | Wallet | Reversal Action |
|--------|--------|-----------------|
| Payer debited | Test user member wallet | Credit back |
| Branch credited | Branch wallet (wallets table) | Debit |
| Branch balance (legacy) | merchant_branches.balance | Debit |
| Cashback to payer | Test user member wallet | Debit cashback |
| Tier 1-5 commissions | Each ancestor's member wallet | Debit tier share |
| Unclaimed commissions | Branch wallet | Debit |
| Platform fee | Admin wallet | Debit |
| Branch owner income tx | Branch owner | Mark reversed |

For **transfers**, **top-ups**, and **refunds** -- each side is reversed symmetrically.

## Daily PDF Email Report

After reversal and top-up, a PDF report is generated and emailed via SendGrid containing:

**Summary section:**
- Date, test account email
- Total transactions reversed count
- Total amounts: payments, transfers, cashback, commissions reversed
- Final wallet balance after reset

**Detail section:**
- Table of every transaction reversed: time, type, amount, description, counterparty, status

The PDF is generated server-side using a simple text-based approach (no jsPDF in Deno -- will use a formatted HTML email with an inline summary table as the primary delivery, with structured data).

Since Deno edge functions cannot use jsPDF, the "PDF report" will be delivered as a **richly formatted HTML email** with full summary and transaction detail table -- functionally equivalent and more convenient than a PDF attachment.

## Technical Implementation

### Step 1: Create Edge Function

**File:** `supabase/functions/nightly-test-reset/index.ts`

Single function with `?mode=reverse`, `?mode=topup`, `?mode=report` query parameters.

**Reverse mode logic:**
1. Look up user ID for `azarul@brainybunch.com` via `auth.admin.listUsers()`
2. Query all `completed` transactions for that user created today
3. For each `payment` transaction:
   - Find ALL related transactions (cashback, commission, admin fee) via `reference_id = payment.id`
   - Reverse each wallet impact (member, branch, admin)
   - Reverse `merchant_branches.balance`
   - Mark all as `reversed` in metadata
4. For `transfer_out`: refund sender, debit recipient
5. For `transfer_in`: debit test user, refund sender
6. For `top_up`: debit (skip own reset top-ups by description match)
7. For `cashback`/`commission` received: debit test user
8. Skip already-reversed transactions

**Top-up mode:** Set member wallet to RM 1,000, insert transaction with description "Nightly test reset top-up"

**Report mode:** Query all transactions reversed today, build HTML email with summary + detail table, send via SendGrid to azarul@brainybunch.com

### Step 2: Update config.toml (automatic)

```text
[functions.nightly-test-reset]
verify_jwt = false
```

### Step 3: Immediate top-up

Run an SQL insert to credit RM 1,000 to the test account's member wallet and create a top_up transaction record -- so testing can begin tomorrow with funds available.

### Step 4: Schedule cron jobs

Three `pg_cron` jobs (Malaysia UTC+8, so subtract 8 hours for UTC):

| Job | Cron (UTC) | MYT | Mode |
|-----|-----------|-----|------|
| nightly-test-reverse | `55 14 * * *` | 10:55 PM | `?mode=reverse` |
| nightly-test-topup | `0 15 * * *` | 11:00 PM | `?mode=topup` |
| nightly-test-report | `5 15 * * *` | 11:05 PM | `?mode=report` |

Requires enabling `pg_cron` and `pg_net` extensions via SQL.

### Step 5: Enable extensions

SQL to enable `pg_cron` and `pg_net`, then create the three scheduled jobs pointing to the edge function URL with the anon key.

## Safety Measures

- Hardcoded to only target `azarul@brainybunch.com`
- Skips transactions already marked reversed
- Skips its own "Nightly test reset" transactions
- Full audit trail via reversal transaction records
- Logs summary of all reversals performed

## Files to Create/Modify

| File | Action |
|------|--------|
| `supabase/functions/nightly-test-reset/index.ts` | Create -- edge function with reverse, topup, report modes |
| `supabase/config.toml` | Auto-updated with verify_jwt = false |
| Database (SQL insert) | Enable pg_cron + pg_net, create 3 cron schedules |
| Database (SQL insert) | Immediate RM 1,000 top-up for test account |

