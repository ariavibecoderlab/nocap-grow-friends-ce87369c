

## Plan: Revamp Login Flow — Password-First Authentication

### Overview
Replace the current OTP-based login with a password-first flow. New users set a password immediately after registration. Existing users log in with password (with forgot-password fallback). OTP is removed from the primary login path.

### Database Changes

1. **Add `has_password` column to `profiles` table**
   - `has_password boolean NOT NULL DEFAULT false`
   - This tracks whether a user has explicitly set their own password (since all accounts are created with a random password they don't know)

2. **Create edge function `check-has-password`**
   - Accepts `{ email }`, uses service role to look up the user in `auth.users`, then checks `profiles.has_password`
   - Returns `{ exists: true/false, has_password: true/false }`
   - This tells the login page whether to show password login or set-password flow

3. **Create edge function `set-initial-password`**
   - Accepts `{ email, password }`
   - Uses service role to call `admin.updateUserById()` to set the password
   - Updates `profiles.has_password = true`
   - Does NOT log the user in — returns success so the frontend redirects to login

### Auth Page (`Auth.tsx`) — New Flow

**Step 1 — Email Entry** (unchanged UI)
- User enters email, clicks Continue
- Calls `check-has-password` edge function
- Three outcomes:
  - **User not found** → show referral code field, proceed to registration
  - **User found, has password** → show password dialog (small popup/dialog)
  - **User found, no password** → show set-password dialog (small popup/dialog)

**Step 2a — Registration (new user)**
- Validate referral code → `signUp()` with random password → sign out
- Then immediately show **set-password dialog** (using `set-initial-password` edge function)
- On success: toast "Password set! Please login" → return to email step

**Step 2b — Password Login (existing user with password)**
- Dialog with password input + "Forgot Password?" button
- `signInWithPassword()` → navigate to dashboard
- Forgot Password: calls `supabase.auth.resetPasswordForEmail()` → toast instructions

**Step 2c — Set Password (existing user without password)**
- Dialog with new password + confirm password fields
- Calls `set-initial-password` edge function
- On success: toast "Password set successfully!" → close dialog, return to login to sign in with new password

**Step 3 — Forgot Password**
- Uses Supabase built-in `resetPasswordForEmail()` with redirect to `/reset-password`
- New `/reset-password` page: checks for recovery token in URL, shows new password form, calls `updateUser({ password })`
- Updates `profiles.has_password = true` after successful reset

### New Page: `/reset-password` (ResetPassword.tsx)
- Detects `type=recovery` from URL hash
- Shows new password + confirm password form
- Calls `supabase.auth.updateUser({ password })` then updates `has_password`
- Redirects to `/auth` on success

### Dashboard Change
- After registration + OTP verify, show a **Dialog popup** prompting new members to set their password
- This is removed since password is now set during registration before reaching dashboard

### UI Approach
- Use shadcn `Dialog` component for password entry and set-password popups (small overlay windows as requested)
- Keep the existing Auth page background and branding

### Files Modified/Created
- `supabase/functions/check-has-password/index.ts` — new edge function
- `supabase/functions/set-initial-password/index.ts` — new edge function  
- `src/pages/Auth.tsx` — rewrite login flow
- `src/pages/ResetPassword.tsx` — new page for forgot password
- `src/App.tsx` — add `/reset-password` route
- Database migration: add `has_password` column to `profiles`
- `src/lib/auth.ts` — minor updates

