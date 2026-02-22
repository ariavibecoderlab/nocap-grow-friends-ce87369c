

# AI-Powered Money Transfer via Chatbot

## Overview
Add a new `transfer_money` tool to the AI chatbot so members can transfer wallet balance by simply typing something like **"transfer to beforeb76@gmail.com 10"**. The AI will look up the recipient by email, validate everything, and execute the transfer.

## How It Works

1. User types: "Transfer RM10 to beforeb76@gmail.com"
2. AI recognizes the intent and calls the `transfer_money` tool with `email` and `amount`
3. The tool looks up the recipient's user ID from the email in the auth system
4. If the email doesn't exist, returns a clear error message
5. If found, calls the existing `process-transfer` edge function to execute the transfer
6. Returns success/failure message to the AI, which responds naturally

## Important Considerations

- **PIN requirement**: Transfers of RM100+ require a PIN. Since the chatbot can't securely collect PINs, transfers via AI will be limited to amounts below the PIN threshold (default RM100). For larger amounts, the AI will guide users to the Transfer page.
- **Authentication required**: User must be logged in to use this feature.
- **Security**: The transfer is executed server-side using the user's authenticated session, so no one can transfer from another user's wallet.

## What Changes

### 1. Edge Function: `ai-help-chat/index.ts`
- Add a new `transfer_money` tool definition with parameters: `email` (string, required) and `amount` (number, required)
- Add tool execution logic that:
  - Validates the user is authenticated
  - Looks up recipient by email using `supabase.auth.admin.listUsers()` filtered by email
  - Returns "User with that email not found" if no match
  - Prevents self-transfer
  - Checks the min PIN amount from `system_settings` -- if amount >= threshold, returns a message telling the user to use the Transfer page instead
  - Calls the `process-transfer` edge function internally (server-to-server) with the sender's auth token
  - Returns success with new balance or error message
- Update the system prompt to mention transfer capability and its limits

### 2. No Frontend Changes Needed
The existing `AiHelpChat.tsx` component already handles tool-calling responses. No UI changes required.

### 3. No Database Changes Needed
Uses existing `profiles`, `wallets`, and `transactions` tables via the existing `process-transfer` function.

## Technical Details

### New Tool Definition
```text
transfer_money(email, amount)
- email: Recipient's email address
- amount: Amount in RM to transfer
```

### Tool Execution Flow
```text
User: "transfer 10 to beforeb76@gmail.com"
    |
    v
AI calls: transfer_money(email="beforeb76@gmail.com", amount=10)
    |
    v
Edge function:
  1. Check user is logged in
  2. Look up email in auth.users -> get user_id
  3. If not found -> return error "No user found with that email"
  4. If same as sender -> return error "Cannot transfer to yourself"  
  5. Check amount < min_pin_amount (default RM100)
     - If >= threshold -> return "Please use the Transfer page for amounts RM100+"
  6. Call process-transfer with sender's token, recipient_user_id, amount
  7. Return result (success + new balance, or error)
    |
    v
AI responds: "Done! RM10.00 has been transferred to beforeb76@gmail.com. Your new balance is RM XX.XX."
```

### Error Messages
| Scenario | Message |
|----------|---------|
| Not logged in | "You need to be logged in to make transfers." |
| Email not found | "No NoCap user found with email beforeb76@gmail.com." |
| Self-transfer | "You cannot transfer to yourself." |
| Amount too high (needs PIN) | "For transfers of RM100 and above, please use the Transfer page where you can enter your PIN securely." |
| Insufficient balance | "Insufficient balance for this transfer." |
| Success | Returns new balance and transaction ID |

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/ai-help-chat/index.ts` | Add `transfer_money` tool + execution logic + updated system prompt |

