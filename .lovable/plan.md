

# Admin Panel for NOcap

## Overview
Build a comprehensive admin dashboard accessible only to users with the `admin` role. The panel will have 4 tabs: Merchant Approvals, Fee Settings, User Management, and Transactions overview.

## What Gets Built

### 1. Admin Page (`/admin`)
A new page with role-based access control (redirects non-admins). Contains a tabbed interface:

**Tab 1 -- Merchant Approvals**
- List all `merchant_applications` with status filters (pending, approved, rejected)
- Show business name, applicant email, bank details, registration number
- Approve button: updates status to `approved`, assigns `merchant` role to the user
- Reject button: opens a dialog to enter rejection reason, updates status to `rejected`

**Tab 2 -- Fee Settings**
- Display and edit `system_settings` values (e.g., `platform_fee_percent`, cashback rates, tier commission percentages)
- Inline edit with save button for each setting
- Add new setting capability

**Tab 3 -- User Management**
- List all users (from `profiles` table joined with `user_roles` and `wallets`)
- Show name, email, phone, roles, wallet balance, referral code
- Ability to assign/remove roles (member, merchant, admin)
- View user's referral tree count

**Tab 4 -- Transactions**
- List all transactions across the platform with filters (type, status, date range)
- Show total volume stats

### 2. Edge Function: `admin-actions`
A single backend function to handle admin-only operations securely:
- Approve/reject merchant applications (updates status + assigns merchant role)
- Update user roles
- Update system settings

This ensures sensitive operations like role assignment happen server-side with proper admin verification.

### 3. Navigation Update
- Add an "Admin" link in the `BottomNav` (only visible to admin users)
- Add `/admin` route in `App.tsx`

### 4. Admin Role Check Hook
- Create `useAdminCheck` hook that queries `user_roles` to verify admin status
- Used by both the admin page and the bottom nav for conditional rendering

## Technical Details

### New Files
- `src/pages/Admin.tsx` -- Main admin page with tabs
- `src/components/admin/MerchantApprovals.tsx` -- Merchant application list and actions
- `src/components/admin/FeeSettings.tsx` -- System settings editor
- `src/components/admin/UserManagement.tsx` -- User list with role management
- `src/components/admin/TransactionsList.tsx` -- All transactions view
- `supabase/functions/admin-actions/index.ts` -- Secure backend for admin operations

### Modified Files
- `src/App.tsx` -- Add `/admin` route
- `src/components/BottomNav.tsx` -- Conditionally show Admin tab for admin users

### Database
- No schema changes needed -- all required tables and RLS policies already exist
- The `has_role` security definer function is already in place
- Admin RLS policies are already configured on all tables

### Security
- Admin check done server-side in the edge function using `getUser()` + `has_role` query
- Client-side admin check is only for UI visibility (not security)
- All write operations (approve, reject, role changes) go through the edge function

