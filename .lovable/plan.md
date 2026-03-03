

# Admin Panel Overhaul -- Dedicated Admin Portal

## Overview
Create a separate, fully web-based admin portal at `/admin-portal` with a modern desktop-first UI (sidebar navigation), a dedicated admin account (`adminnocap@nocap.life`), and remove admin privileges from `azarul@brainybunch.com`.

---

## Part 1: Create the New Admin Account

Create the admin user via a one-time edge function or database operations:
1. Create user `adminnocap@nocap.life` with password `lne6SNIN#` in `auth.users`
2. Create a profile record (auto-handled by `handle_new_user` trigger, but since this admin doesn't need a referral code, we'll use a direct insert approach via edge function)
3. Assign `admin` role in `user_roles` table
4. Create a member wallet for the account

**Approach:** Create a one-time setup edge function `setup-admin-account` that:
- Creates the user via `supabase.auth.admin.createUser()`
- The database trigger will auto-create profile, wallet, and member role
- Then insert `admin` role into `user_roles`
- After running once, the function can be deleted

---

## Part 2: New Admin Portal UI (Desktop-First)

### Layout
Replace the current mobile-first admin page (`max-w-md`, bottom nav, cramped 7-column tabs) with a desktop-optimized layout using the **Sidebar** component:

```text
+------------------+----------------------------------------+
|                  |                                        |
|   Sidebar        |   Main Content Area                    |
|                  |                                        |
|   - Dashboard    |   (Selected section renders here)      |
|   - Merchants    |                                        |
|   - Withdrawals  |                                        |
|   - Fee Settings |                                        |
|   - Users        |                                        |
|   - Transactions |                                        |
|   - API Apps     |                                        |
|   - Audit        |                                        |
|   - Referral Tree|                                        |
|   - Logout       |                                        |
|                  |                                        |
+------------------+----------------------------------------+
```

### New Files
| File | Purpose |
|------|---------|
| `src/pages/AdminPortal.tsx` | Main layout with SidebarProvider, routing |
| `src/components/admin/AdminSidebar.tsx` | Sidebar navigation component |
| `src/components/admin/AdminDashboard.tsx` | Overview dashboard with summary cards (total users, pending approvals, platform balance, recent activity) |
| `src/pages/AdminLogin.tsx` | Separate login page for admin portal (email + password only, no OTP/referral flow) |

### Design Theme
- Dark background (`bg-slate-950`) with accent colors
- Cards with subtle borders and glass-morphism effects
- Wider content area (no `max-w-md` constraint)
- Professional typography and spacing
- No BottomNav -- sidebar handles navigation

### Route Structure
| Route | Component |
|-------|-----------|
| `/admin-login` | `AdminLogin` -- simple email/password form |
| `/admin-portal` | `AdminPortal` -- sidebar layout, default to dashboard |
| `/admin-portal/merchants` | Merchants tab |
| `/admin-portal/withdrawals` | Withdrawals tab |
| `/admin-portal/fees` | Fee Settings |
| `/admin-portal/users` | User Management |
| `/admin-portal/transactions` | Transactions |
| `/admin-portal/api-apps` | API Apps |
| `/admin-portal/audit` | Wallet Reconciliation / Audit |
| `/admin-portal/referral-tree` | Referral Tree (moved from `/admin/referral-tree`) |

---

## Part 3: Remove Admin from azarul@brainybunch.com

1. Delete the `admin` role from `user_roles` for user_id `59dfea5c-75c7-42a7-90ed-d4b511c87474`
2. The user keeps their `member` role and all other data intact

---

## Part 4: Clean Up Old Admin Routes

- Keep `/admin` route but redirect to `/admin-portal` (or show "Access Denied")
- Remove Admin icon from BottomNav entirely (admin portal has its own navigation)
- Remove `ai_only_admin_ids` logic from BottomNav since admin is no longer accessible from the mobile app nav

---

## Risk Analysis

| Concern | Risk Level | Details |
|---------|------------|---------|
| **Losing admin access** | **LOW** | New admin account is created before removing old one. If creation fails, old admin stays. |
| **Edge functions still work** | **NONE** | Edge functions authenticate via JWT + `has_role()` check. The new admin user has the admin role, so all edge function calls (admin-actions, admin-update-referrer, admin-delete-member) will work identically. |
| **Nightly test reset** | **NONE** | `nightly-test-reset` references `azarul@brainybunch.com` as the TEST_EMAIL. This is the test account, not the admin account -- it remains unchanged. |
| **RLS policies** | **NONE** | All admin RLS policies use `has_role(auth.uid(), 'admin')` which is role-based, not user-based. New admin inherits all access. |
| **AI-only admin list** | **LOW** | The `ai_only_admin_ids` system setting references other user IDs, not the old admin. No change needed. |
| **Existing admin components** | **NONE** | All 8 admin components (`MerchantApprovals`, `FeeSettings`, `UserManagement`, etc.) are reused as-is in the new portal. Only the layout wrapper changes. |
| **Hardcoded password in code** | **NONE** | Password is NOT hardcoded in frontend code. It's set once via the setup edge function, then the function is deleted. |
| **Member features for azarul** | **NONE** | Removing admin role doesn't affect member features (wallet, payments, referrals). The user keeps their `member` role. |
| **AdminReferralTree page** | **LOW** | Currently at `/admin/referral-tree`. Will be moved to `/admin-portal/referral-tree`. Old route will be removed. |
| **Bookmark/URL breakage** | **LOW** | Old `/admin` URLs will no longer work. This only affects the single admin user. |

---

## Implementation Order

1. **Create setup edge function** to provision `adminnocap@nocap.life` with admin role
2. **Run the function** to create the account, then delete the function
3. **Build `AdminLogin.tsx`** -- clean email+password login page for admin
4. **Build `AdminSidebar.tsx`** -- sidebar navigation component
5. **Build `AdminDashboard.tsx`** -- overview dashboard with summary stats
6. **Build `AdminPortal.tsx`** -- main layout with sidebar + nested content routing
7. **Update `App.tsx`** -- add new admin routes, keep existing components
8. **Remove admin from BottomNav** -- clean up mobile nav
9. **Remove old admin role** from azarul via database update
10. **Redirect old `/admin` route** to `/admin-portal` or show access denied

