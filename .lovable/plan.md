

## Update Integration Roadmap Documentation

### Problem
Prompt #4 in the Integration Roadmap (`IntegrationRoadmap.tsx`) incorrectly states "Customer is auto-connected -- no OAuth needed" and suggests storing the access token from registration. This misleads 3rd party developers into thinking they can skip the OAuth wallet connection step.

### What Changes

**1. Update Prompt #4 text in `src/components/IntegrationRoadmap.tsx`**

- Change the prompt text to clarify that `api-referral-register` only **creates the NoCap account** (profile, wallet, referral tree) -- it does NOT connect the wallet to the 3rd party app
- Remove the instruction to "store access_token, nocap_user_id, referral_code" as if the user is fully connected
- Add guidance that wallet connection happens later via OAuth (Prompt #3) when the user reaches their dashboard
- Update the `memberImpact` to: "New members get a NoCap account created automatically. They connect their wallet later via OAuth from the 3rd party dashboard."

**2. Update the quick-reference table**

- Adjust the description for Prompt #4 from "Registration + Referral" to "Account Creation via Referral" for clarity

**3. Update Prompt #3 (OAuth) member impact**

- Add a note that this is also how API-registered users connect their wallet post-registration

### No backend changes needed
The `api-referral-register` edge function is working correctly as-is -- it creates the account, wallet, and referral tree. The access token it returns can still be useful for the 3rd party to check status, but the docs should clarify it is not a substitute for the OAuth wallet connection flow.

### Files to modify
- `src/components/IntegrationRoadmap.tsx` -- Update prompts #3 and #4 text, member impact, and quick-reference table
