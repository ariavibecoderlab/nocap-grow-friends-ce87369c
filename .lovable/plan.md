# Mobile App Plan — NOcap Members (Capacitor)

**Scope:** Wallet core only — Dashboard, QR Pay, Transfer, Top-Up, Withdraw, Referral, Profile, Transactions, Settings, Help/Support, Auth.
**Excluded from mobile shell:** Marketplace, Stores, Checkout, Merchant/Branch tools, Seller Portal, Storefront Builder, Admin/Support/UAT, API Docs.
**Distribution:** Apple App Store + Google Play.
**v1 native upgrades:** Native QR scanner, Push (APNs/FCM), Deep links for top-up return.

---

## Phase 1 — Capacitor foundation

1. Install `@capacitor/core`, `@capacitor/ios`, `@capacitor/android`, `@capacitor/cli` (dev).
2. Create `capacitor.config.ts`:
   - `appId: app.lovable.1d3816d6df5a4a619f259d0086612ee9`
   - `appName: nocap-grow-friends`
   - Dev: `server.url` = Lovable preview URL with `cleartext: true` (hot reload during development).
   - **Production builds: remove `server.url`** so the app loads bundled web assets (per project memory).
3. Add base plugins: `@capacitor/app` (back button, resume), `@capacitor/status-bar`, `@capacitor/splash-screen`, `@capacitor/keyboard`.
4. Add `isNativeApp()` helper using `Capacitor.isNativePlatform()`.

## Phase 2 — Mobile-only routing

Create `src/lib/platform.ts` with `isNativeApp()` and gate routes in `App.tsx`:

- **Hidden on native** (return `<Navigate to="/dashboard" />` from a `MobileBlocked` wrapper):
  `/marketplace`, `/store/*`, `/checkout`, `/order/*`, `/my-orders`, `/merchant`, `/merchant/*`, `/branch`, `/seller-portal`, `/admin-portal*`, `/support-portal*`, `/uat-scripts`, `/api-docs`, `/authorize`.
- **Tweak `RequireMember`**: on native, if user is staff-only, show a "Use the web app at nocap.life" screen instead of redirecting to `/admin-portal`.
- **Tweak `Index`/landing**: on native, redirect logged-in users straight to `/dashboard`, anonymous to `/auth`.
- **Tweak `BottomNav`**: hide the Branch tab on native (members-only shell).

## Phase 3 — Native UX polish

1. **Safe areas**: add `env(safe-area-inset-bottom)` padding to `BottomNav` (currently `fixed bottom-0` collides with iOS home indicator). Same for top headers using `env(safe-area-inset-top)`.
2. **Status bar**: dark background, light content (matches NOcap dark theme).
3. **Splash screen**: NOcap logo on `#000000`, auto-hide after app ready.
4. **Keyboard**: scroll inputs into view on Top-Up / Transfer / PIN / Auth screens.
5. **App resume listener**: refetch wallet balance + notifications when app returns from background.

## Phase 4 — Native QR scanner (replaces web `getUserMedia` in `/qr-pay`)

1. Install `@capacitor-mlkit/barcode-scanning`.
2. In `QrPay.tsx`, branch on `isNativeApp()`:
   - **Native**: call `BarcodeScanner.scan()` → returns the QR payload → feed into existing `lookup_branch_for_qr` RPC flow.
   - **Web**: keep existing camera flow unchanged.
3. Handle camera permission prompt + denied state (show "Enable camera in Settings").

## Phase 5 — Push notifications (APNs + FCM)

1. Install `@capacitor/push-notifications`.
2. New table `mobile_push_tokens` (user_id, platform, token, device_id, created_at, last_seen_at) with RLS: user can read/insert/delete their own.
3. On app start (native + logged in): register, capture FCM/APNs token, upsert into `mobile_push_tokens`.
4. Replace web push call sites: refactor `send-push-notification` edge function to fan out to BOTH web push subscriptions AND mobile tokens (FCM HTTP v1 + APNs via FCM relay to keep one provider).
5. Add new secret: `FCM_SERVER_KEY` (or service account JSON) — request via `add_secret` when implementing.
6. Tap-through: deep-link notification payload `url` field maps to in-app route (e.g., `/transactions`, `/withdraw`).

## Phase 6 — Deep links for top-up return (critical)

1. Configure custom scheme `nocap://` AND Universal Links / App Links for `https://nocap.life/*` in `capacitor.config.ts` and native projects (`AASA` file + Android intent filters).
2. `create-topup-bill` redirect URL → `https://nocap.life/top-up?status=success&...` (already what `TopUp.tsx` reads via `searchParams`).
3. Add `App.addListener('appUrlOpen')` in a top-level `DeepLinkHandler` component → parse URL → `navigate(path + search)` so RaudhahPay's redirect lands the user back inside the app on the success screen.
4. Same handler covers password reset and any future OAuth callbacks.

## Phase 7 — Auth tweaks for native

- Supabase email/password works as-is.
- Google sign-in (currently web OAuth): use `@capacitor/browser` to open the OAuth URL in an in-app browser, capture the redirect via `appUrlOpen`. (Optional — defer if Google login isn't a v1 must.)
- Session persistence: `localStorage` works inside Capacitor WebView; no change needed unless we see session loss reports.

## Phase 8 — Release pipeline

1. Strip `server.url` for production builds (use an env flag in `capacitor.config.ts`).
2. Versioning: `package.json` version → `CFBundleShortVersionString` (iOS) and `versionName` (Android).
3. Generate icons + splash from `public/nocap-icon-512.png` using `@capacitor/assets`.
4. **Apple review prep**:
   - Privacy policy URL: `https://nocap.life/privacy` (already exists).
   - Justify RaudhahPay FPX: it's a wallet top-up via Malaysian online banking, NOT in-app digital goods → falls outside Apple's IAP requirement (similar to TNG eWallet, GrabPay).
   - Camera permission usage string: "Used to scan merchant QR codes for payment."
   - Push permission usage string: "Used to notify you of payments, top-ups, and referrals."
5. **Play Store**: same assets; declare financial app category; provide test member credentials for review.
6. Document export → `git pull` → `npm install` → `npx cap add ios/android` → `npm run build` → `npx cap sync` → `npx cap run` workflow in README.

---

## Files to create

- `capacitor.config.ts`
- `src/lib/platform.ts` — `isNativeApp()`, `isIOS()`, `isAndroid()`
- `src/components/mobile/MobileBlocked.tsx` — "Use the web app" screen
- `src/components/mobile/DeepLinkHandler.tsx` — `appUrlOpen` → `navigate()`
- `src/components/mobile/PushRegistration.tsx` — register + upsert token
- `src/hooks/useNativeQrScanner.ts` — wraps `@capacitor-mlkit/barcode-scanning`
- `supabase/functions/register-push-token/index.ts` — upsert mobile token
- Migration: `mobile_push_tokens` table with RLS

## Files to edit

- `src/App.tsx` — wrap excluded routes in `MobileBlocked`, mount `DeepLinkHandler` + `PushRegistration` inside `RequireMember` group.
- `src/components/auth/RequireMember.tsx` — native-aware staff fallback.
- `src/components/BottomNav.tsx` — safe-area padding, hide Branch tab on native.
- `src/pages/QrPay.tsx` — branch to native scanner.
- `src/pages/Index.tsx` — native auto-redirect.
- `src/index.css` — safe-area utility classes.
- `supabase/functions/send-push-notification/index.ts` — fan out to web push + FCM/APNs.
- `supabase/functions/create-topup-bill/index.ts` — confirm redirect URL is `https://nocap.life/top-up?status=success` (Universal Link).

## Out of scope for v1

- Marketplace/checkout in the mobile app (members can still use it on web).
- Biometric PIN unlock (deferred — PIN typing is acceptable for v1).
- Separate Merchant/Branch mobile app.
- Replacing RaudhahPay with native IAP.

## Key risks

- **Apple review on payments**: must clearly position top-up as "wallet load via local banking", not digital goods. Have screenshots and justification ready.
- **Universal Links setup**: requires hosting `apple-app-site-association` at `https://nocap.life/.well-known/` and Android `assetlinks.json`. Without these, top-up redirect falls back to browser instead of app.
- **Push provider**: FCM + APNs setup needs an Apple Developer account ($99/yr) and Google Play Console account ($25 one-time) before tokens can be issued.
- **Production `server.url` mistake**: leaving it set ships an app that just loads the live website — must be stripped in release builds (project memory rule).

## Approval needed before I start

This plan touches mobile infra (new native projects), one new edge function, one DB migration, one new secret (`FCM_SERVER_KEY`), and edits to ~8 web files. Approve and I'll execute in the order listed above.