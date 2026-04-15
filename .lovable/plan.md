

# Plan: Update OAuth Authorize Page to Password-Based Flow

## Current State
The `/authorize` page (used by Brainy Bunch Wallet, DRE Coffee, AhmadsOS) currently uses an **OTP-based** login flow:
1. User enters email → system sends OTP → user verifies OTP → consent screen

The main NoCap login page (`/auth`) uses a **password-based** flow:
1. User enters email → system checks if account exists
2. **Existing user with password** → password login dialog
3. **Existing user without password** → set password dialog
4. **New user** → show referral code + password fields → register

## Proposed Changes

### File: `src/pages/Authorize.tsx`
Replace the OTP-based authentication with the same password-first flow used in `Auth.tsx`:

1. **Remove** OTP-related logic (`sendOtpViaEdgeFunction`, `handleSendOtp`, `handleVerifyOtp`, OTP step UI)
2. **Remove** imports for `verifyOtp`, `signUp` with random password pattern
3. **Add** imports for `signInWithPassword`, `signUp` (with user-chosen password), and `checkHasPassword` edge function call
4. **Update step type** from `"login" | "register" | "otp" | "consent"` to `"login" | "register" | "consent"` (password entry handled inline/dialog like Auth.tsx)
5. **Add password fields** to the login step — after email submission, show password input for existing users
6. **Add set-password dialog** for existing users who haven't set a password yet
7. **Add registration fields** (referral code + password + confirm password + PasswordStrengthIndicator) for new users
8. **Add forgot password** button that triggers `resetPasswordForEmail`

### Flow After Changes
```text
User enters email → "Continue"
  ├─ User exists + has password → Show password field → Sign in → Consent
  ├─ User exists + no password → Show "Set Password" dialog → Set → Sign in → Consent
  └─ User not found → Show referral code + password + confirm password → Register → Sign in → Consent
```

This exactly mirrors the `/auth` page behavior.

## Implications to Existing Integrations

### No Breaking Changes for 3rd-Party Apps
- **URL structure unchanged**: `/authorize?client_id=...&redirect_uri=...&scope=...` remains the same
- **Token exchange unchanged**: The authorization code generation and redirect-back logic is untouched
- **Consent screen unchanged**: Same permissions display and approve/deny flow
- **All three apps** (Brainy Bunch, DRE Coffee, AhmadsOS) will work without any code changes on their end

### Behavioral Changes
- **Existing NoCap members** who previously logged in via OTP will now use their password instead. If they haven't set a password, they'll be prompted to create one (same as main login)
- **New users** registering via OAuth will now create a proper password (instead of a random one), so they can also log in directly on nocap.life afterward
- **OTP dependency removed** from OAuth flow — no more reliance on the `send-otp` edge function for authorization, reducing email delivery friction

### Benefits
- Consistent user experience across all entry points
- New users get a usable password immediately (no "set password later" needed)
- Reduces support confusion — one login method everywhere

## Technical Details
- Reuse `check-has-password` and `set-initial-password` edge functions (already deployed)
- Import `PasswordStrengthIndicator` component (already exists)
- Keep the `api-app-info` resolution logic and consent flow completely unchanged
- Keep the `resolvedAppId` dual-format lookup (UUID/hex) intact

