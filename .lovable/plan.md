

# Fix: Top-Up Mobile Number Format for RaudhahPay

## Problem
RaudhahPay requires the mobile number to include a country code (e.g., `60131234567` for Malaysia). The current fallback `0000000000` is rejected. Also, the `address` field is not being fetched from the profile.

## Changes

**File: `supabase/functions/create-topup-bill/index.ts`**

1. Update the profile query to also select `address`:
   - Change `.select('full_name, phone')` to `.select('full_name, phone, address')`

2. Fix the mobile fallback to use a valid Malaysian format:
   - If the user has a phone number starting with `0` (e.g., `0131234567`), auto-convert to `60131234567`
   - If no phone at all, use `60000000000` as fallback (valid format that won't block the bill creation)

3. Use the actual `profile.address` from the database instead of hardcoded `'Malaysia'`.

## Technical Detail

```
// Phone formatting logic:
let mobile = profile?.phone || '60000000000';
if (mobile.startsWith('0')) {
  mobile = '60' + mobile.substring(1);
} else if (!mobile.startsWith('6')) {
  mobile = '60' + mobile;
}
```

This is a single-file fix with no schema changes required.
