

# Admin Referral Tree Manager

## Overview
Create a new admin-only page at `/admin/referral-tree` that displays the entire platform's referral tree as a visual hierarchy and allows admins to re-assign a user's position (change their referrer).

## What will be built

### 1. New page: `src/pages/AdminReferralTree.tsx`
- Admin-only access using the same `useAdminCheck` + `isAiOnlyAdmin` guard pattern from the existing Admin page
- Full-width layout (not constrained to `max-w-md` like mobile pages) for better tree visualization
- **Search bar** at the top to find users by name, phone, or referral code
- **Tree view** showing root users (those with no referrer) as top-level nodes, with expandable child nodes showing their direct referrals recursively
- Each node displays: user name, referral code, phone, number of direct referrals, wallet balance
- **"Change Referrer" button** on each user node that opens a dialog to reassign their position

### 2. Tree data loading
- Fetch all profiles (with `referred_by` field) and build the parent-child tree client-side
- Show users with no `referred_by` as root nodes
- Lazy-expand children on click to keep the UI performant

### 3. Change Referrer dialog
- Admin selects a user node and clicks "Change Referrer"
- A dialog opens showing the current referrer and a searchable input to pick a new referrer (by name or referral code)
- Includes validation: cannot set a user as their own referrer, cannot create circular references (a descendant becoming the parent)
- On confirm, calls a new edge function to safely update the referral relationships

### 4. New edge function: `supabase/functions/admin-update-referrer/index.ts`
- Accepts `{ targetUserId, newReferrerCode }` from an authenticated admin
- Validates admin role using service role key
- Validates no circular reference would be created
- Updates `profiles.referred_by` to the new referrer's profile ID
- Deletes all existing `referral_tree` rows for `targetUserId`
- Rebuilds the 5-tier ancestor chain for `targetUserId` based on the new referrer
- Recursively rebuilds referral_tree entries for all descendants of `targetUserId` (since their ancestor chain changes too)
- Logs the action for audit purposes

### 5. Route registration
- Add `/admin/referral-tree` route in `App.tsx`

### 6. Navigation link
- Add a "Referral Tree" button/link in the Admin page header for easy access

## Technical Details

### Tree rendering approach
- Use a recursive `TreeNode` component with expand/collapse state
- Color-code depth levels using the existing `tierColors` pattern
- Show connecting lines between parent and children (CSS borders)

### Circular reference prevention
The edge function will:
1. Look up the new referrer's user_id
2. Walk up the new referrer's ancestor chain in `referral_tree`
3. If `targetUserId` appears anywhere in that chain, reject with 400 error

### Descendant rebuild logic
After updating a user's referrer, all users who have `targetUserId` in their `referral_tree` need their ancestor entries recalculated. The edge function will:
1. Find all users where `targetUserId` is an ancestor (from `referral_tree`)
2. For each affected user, delete their `referral_tree` entries and rebuild by walking up the `profiles.referred_by` chain

### Config updates
- Add `[functions.admin-update-referrer]` with `verify_jwt = false` to `supabase/config.toml` (JWT validated in code)

