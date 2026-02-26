

## Plan: Enable Scope Upgrade for Existing Users + 3rd Party Integration Guide

### Problem Found

The current `api-authorize` endpoint (line 86-90) rejects re-authorization with a `409 Already authorized` error if the user already has an active token. This blocks existing users from upgrading their scopes to include `referral`.

### Fix Required

**File:** `supabase/functions/api-authorize/index.ts`

Change the "already authorized" logic: instead of returning a 409 error, **revoke the old token and issue a new one** with the updated scopes. This way, when the 3rd party redirects existing users to `/authorize?scopes=balance,charge,referral`, the flow works seamlessly -- the old token is replaced with a new token that includes the `referral` scope.

The updated logic:
1. Check if an active token exists for this user + app
2. If yes, **deactivate it** (set `is_active = false`)
3. Issue a new token with the requested scopes
4. Return the new access token

This is consistent with how `api-token-exchange` already works (it revokes old tokens when issuing new ones).

### What the 3rd Party System Needs To Do

**Good news: NO need to remove existing integration.** They just need to add the affiliate endpoints and prompt existing users to re-authorize once.

#### Step-by-Step Prompts for the 3rd Party Lovable Project

**Prompt 1 -- Add Referral API Service Layer**
```
Add a new API service file for NoCap referral/affiliate integration.
Create functions that call these NoCap API endpoints:

1. GET referral info: GET https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1/api-referral-info
   - Headers: x-api-key, x-api-secret, Authorization: Bearer {access_token}
   - Returns: referral_code, referral_link, stats (direct_referrals, network_size, total_cashback, total_commission)

2. Register new user via referral: POST https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1/api-referral-register
   - Headers: x-api-key, x-api-secret (no Bearer token needed)
   - Body: { email, referral_code, full_name }
   - Returns: user_id, referral_code, access_token

3. Get referral network: GET https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1/api-referral-network
   - Headers: x-api-key, x-api-secret, Authorization: Bearer {access_token}
   - Returns: tiers array with member details

4. Get cashback history: GET https://tukuyszayzkyckrfxqvt.supabase.co/functions/v1/api-cashback-history
   - Headers: x-api-key, x-api-secret, Authorization: Bearer {access_token}
   - Query params: page, limit, type (cashback/commission), from, to
   - Returns: transactions array and totals

Store the API credentials (app_id, api_key, api_secret) as backend secrets.
```

**Prompt 2 -- Handle New User Registration with Referral**
```
When a new customer registers on our system and provides a referral code,
call the NoCap api-referral-register endpoint to automatically create
their NoCap account. Store the returned access_token and user_id
in our database linked to the customer record. Also store their
referral_code so they can share it with others.

The flow should be:
1. Customer signs up on our system with a referral code
2. We call POST /api-referral-register with their email, name, and referral code
3. Store the returned access_token for future API calls on their behalf
4. Show them their own NoCap referral code so they can refer others
```

**Prompt 3 -- Re-authorize Existing Users for Referral Scope**
```
For existing customers who already connected their NoCap wallet,
their current access token only has "balance" and "charge" scopes.
They need to re-authorize to get the "referral" scope.

Add a prompt/banner in the app that detects if a connected user
doesn't have the referral scope yet, and shows a button like
"Enable Referral Features". When clicked, redirect them to:

https://nocap.life/authorize?app_id=YOUR_APP_ID&redirect_uri=YOUR_CALLBACK&scope=balance,charge,referral&state=RANDOM

After they approve, exchange the code for a new token using
POST /api-token-exchange (same as the original wallet connection flow).
Replace the old stored access_token with the new one.
```

**Prompt 4 -- Add Referral Dashboard UI**
```
Add a referral section to the customer dashboard that shows:
1. Their NoCap referral code with a copy/share button
2. Referral stats (direct referrals, network size, cashback earned, commission earned)
3. Their referral network tree (Tiers 1-5)
4. Cashback and commission transaction history with pagination

Fetch all data from the NoCap API using the stored access token.
Only show this section if the user has connected their NoCap account
with the referral scope.
```

**Prompt 5 -- Add Referral Code Sharing in Registration Flow**
```
Update the registration/signup flow so that:
1. There's an optional "Referral Code" field where new users can enter
   a code shared by an existing customer
2. The referral code is validated against NoCap during registration
3. After successful registration, show the new user their own referral
   code and encourage them to share it
```

### Summary of Changes in This Project (NoCap)

| File | Change |
|------|--------|
| `supabase/functions/api-authorize/index.ts` | Replace 409 "Already authorized" with token replacement logic (revoke old, issue new with updated scopes) |

This is a small but critical fix -- just changing ~10 lines in the authorize endpoint to support scope upgrades instead of blocking them.

