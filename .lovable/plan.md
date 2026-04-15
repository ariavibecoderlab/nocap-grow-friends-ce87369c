

# Add Phone Number to API Referral Registration

## Current State
- `POST /api-referral-register` accepts `email` (required), `referral_code` (optional), `full_name` (optional)
- The `profiles` table already has a `phone` column (text, nullable)
- The edge function passes `full_name` via `user_metadata` but does NOT accept or store `phone`
- After user creation, the `handle_new_user` trigger creates the profile but phone is left NULL

## Changes Required

### 1. Edge Function: `api-referral-register/index.ts`
- Accept new `phone` field in the request body (optional, string)
- Validate phone format (Malaysian format: starts with `+60` or `01`, 10-12 digits)
- Pass phone into `user_metadata` on `createUser`
- After profile is created by trigger, UPDATE `profiles` to set `phone` (the trigger won't set it from metadata)

### 2. API Docs: `api-docs/index.ts`
- Add `phone` to the Body Parameters list
- Update the curl example to include `"phone": "+60123456789"`
- Update the request body description

### 3. Integration Roadmap: `IntegrationRoadmap.tsx`
- Update Prompt 4 (Account Creation via Referral) to include `phone` in the request body: `{ email, full_name, phone, referral_code }`

### 4. Webhook payload update
- Include `phone` in the `user.registered` webhook event so 3rd parties get confirmation

## Files to Edit

| File | Change |
|------|--------|
| `supabase/functions/api-referral-register/index.ts` | Accept `phone`, validate, store in profile |
| `supabase/functions/api-docs/index.ts` | Document `phone` parameter |
| `src/components/IntegrationRoadmap.tsx` | Update Prompt 4 text |

No database migration needed — `profiles.phone` already exists.

## What DreCoffee & Ahmad's Need to Do
Their Prompt 4 will be updated to instruct them to send `phone` along with `email` and `full_name`. The updated prompt will read:

> After account creation in your system, call `POST /api-referral-register` with `{ email, full_name, phone, referral_code }`. Phone should be in Malaysian format (+60xxxxxxxxx). This creates the full NoCap account automatically.

