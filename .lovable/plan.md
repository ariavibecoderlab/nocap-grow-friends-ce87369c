

# Add Account & Transaction Info Tools to AI Assistant

## Overview
Enhance the AI chatbot so members can ask about their account details, transaction history, referral info, and more -- all through natural conversation.

## New Tools to Add

| Tool | What It Does | Example Questions |
|------|-------------|-------------------|
| `get_my_profile` | Returns the member's profile info (name, phone, referral code, PIN status) | "What's my account info?", "What's my referral code?" |
| `list_my_transactions` | Returns recent wallet transactions (top-ups, transfers, payments, commissions) | "Show my recent transactions", "What did I spend today?" |
| `get_referral_info` | Returns referral stats -- how many people referred, commission earned | "How many people have I referred?", "Show my referral stats" |

## What Members Can Ask

- "What's my profile info?" -- returns name, phone, referral code, PIN status
- "What's my referral code?" -- returns their unique code
- "Show my last 10 transactions" -- returns recent transaction history with type, amount, date, status
- "How much have I earned from referrals?" -- returns referral count and total commission earned
- "Do I have a PIN set?" -- returns PIN status
- "What transactions did I make today?" -- filters transactions by date

## What Changes

### Edge Function: `supabase/functions/ai-help-chat/index.ts`

**3 new tool definitions:**

1. **`get_my_profile`** -- no parameters
   - Queries `profiles` table for the user's name, phone, referral code, PIN status, address
   - Returns formatted profile summary

2. **`list_my_transactions`** -- optional parameters: `limit` (default 10, max 20), `type` filter (topup, transfer, payment, commission, etc.)
   - Queries `transactions` table filtered by user_id
   - Returns recent transactions with type, amount, description, date, status
   - Ordered by most recent first

3. **`get_referral_info`** -- no parameters
   - Queries `referral_tree` where ancestor_id = user to count direct referrals (tier 1) and total network
   - Queries `transactions` where type = 'commission' to sum total commission earned
   - Returns referral code, direct referral count, total network size, total commission earned

**System prompt update:**
- Add a section explaining that the AI can look up account info, transaction history, and referral stats
- Mention available query capabilities so the AI knows when to call each tool

### No Frontend or Database Changes Needed
All data comes from existing tables (`profiles`, `transactions`, `referral_tree`) using the service role client.

## Technical Details

### get_my_profile Response
```text
{
  name: "Ahmad bin Ali",
  phone: "0123456789",
  referral_code: "ABC12345",
  has_pin: true,
  address: "Kuala Lumpur"
}
```

### list_my_transactions Response
```text
{
  transactions: [
    { type: "topup", amount: "RM 50.00", description: "Top up via FPX", date: "22/2/2026", status: "completed" },
    { type: "transfer_out", amount: "RM 10.00", description: "Transfer to user@email.com", date: "21/2/2026", status: "completed" }
  ],
  count: 2
}
```

### get_referral_info Response
```text
{
  referral_code: "ABC12345",
  direct_referrals: 5,
  total_network: 12,
  total_commission_earned: "RM 45.50"
}
```

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/ai-help-chat/index.ts` | Add 3 new tools (get_my_profile, list_my_transactions, get_referral_info) + updated system prompt |

