# CLAUDE.md — NOcap
*Raudhah Tech Build Framework — Project Context File*
*Last updated: 2026-06-05 | Framework version: Phase 0 Complete*

> Read this file before touching any code. It is the single source of truth for
> every Claude Code session on this project.

---

## What We Are Building

**NOcap** (nocap-grow-friends) — Malaysia's first 5-tier affiliate fintech PWA.

Members earn cashback every time they pay. They invite friends and earn from
their purchases — 5 tiers deep. Merchants grow 10× faster with built-in
referrals. The platform combines a wallet + payment system with a full
Shopee-parity marketplace and live shopping.

**Origin:** Migrated from Lovable → Cloudflare Pages (2026-04).
**Status:** Live at [nocap-app.pages.dev](https://nocap-app.pages.dev).

---

## Target Users

| User Type | What They Do |
|---|---|
| **Members** | Top up wallet, pay via QR/link, earn cashback & commissions, shop marketplace |
| **Merchants** | Accept payments, manage store, list products, go live, disburse earnings |
| **Admins** | Manage platform, approve withdrawals, monitor finances, manage users |
| **Support** | Handle tickets, view transactions, assist members |

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript (strict) + Vite |
| UI | shadcn/ui + Tailwind CSS (dark-mode-first) |
| Mobile | Capacitor 8 (iOS + Android), PWA |
| Backend | Supabase Edge Functions (Deno, 65+ functions) |
| Database | Supabase PostgreSQL (86+ migrations, 65 tables with RLS) |
| Auth | Supabase Auth + 6-digit PIN (SHA-256 + salt) |
| Hosting | Cloudflare Pages (web) |
| Payments | RaudhahPay (collection) + RaudhahPay Disbursement (payouts) |
| Live Shopping | LiveKit WebRTC |
| Push | Web Push (VAPID) + Capacitor Push Notifications |
| State | React Context (Cart, Wishlist, Currency) |
| Forms | Zod validation |
| Testing | Vitest |

---

## Dev Commands

```bash
bun run dev       # Vite dev server — port 5173
bun run build     # Production build
npm run lint      # ESLint
npm run test      # Vitest
npm run preview   # Preview production build locally

# Capacitor
npx cap sync        # Sync web → native
npx cap open ios    # Open in Xcode
npx cap open android  # Open in Android Studio
```

---

## Deployment

| Target | Method |
|---|---|
| **Cloudflare Pages** | Push to `main` → GitHub Actions auto-deploys |
| **Supabase Edge Functions** | `supabase functions deploy <name>` or via Supabase MCP |
| **GitHub repo** | `https://github.com/ariavibecoderlab/nocap-grow-friends` |
| **Live URL** | `https://nocap-app.pages.dev` |

CI/CD: `.github/workflows/deploy.yml` (bun build + terminology check + wrangler-action v3)

---

## Environment Variables

### Client (Vite — public, safe to expose)
```
VITE_SUPABASE_URL=https://xgzhlycqknoxgzqznaxe.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...  (anon key)
VITE_SUPABASE_PROJECT_ID=xgzhlycqknoxgzqznaxe
VITE_VAPID_PUBLIC_KEY=...             (push notifications)
```

### Edge Functions (server-side secrets — never commit)
```
SUPABASE_URL                   (auto-injected by Supabase)
SUPABASE_ANON_KEY              (auto-injected)
SUPABASE_SERVICE_ROLE_KEY      (auto-injected)
RAUDHAHPAY_API_KEY             (collection payments)
RAUDHAHPAY_COLLECTION_CODE     (collection code)
RAUDHAHPAY_SECRET_KEY          (webhook verification)
RAUDHAHPAY_DISBURSEMENT_KEY    (payout API — set when ready)
RAUDHAHPAY_DISBURSEMENT_SECRET (payout webhook secret)
RAUDHAHPAY_CALLBACK_URL        (payout webhook URL)
SENDGRID_API_KEY               (transactional email)
SENDGRID_FROM_EMAIL            (sender address)
LIVEKIT_API_KEY                (live shopping — set when ready)
LIVEKIT_API_SECRET             (live shopping)
LIVEKIT_URL                    (LiveKit cloud URL)
CRON_SECRET                    (internal cron job auth)
VAPID_PUBLIC_KEY               (push notifications)
VAPID_PRIVATE_KEY              (push notifications)
VAPID_SUBJECT                  (mailto: for VAPID)
```

---

## Project Structure

```
nocap-app/
├── src/
│   ├── pages/           # 54 page components (one per route)
│   ├── components/
│   │   ├── admin/       # Admin portal components
│   │   ├── marketplace/ # Buyer-facing marketplace
│   │   ├── merchant/    # Seller/merchant portal
│   │   ├── mobile/      # Capacitor-specific components
│   │   └── ui/          # shadcn/ui primitives
│   ├── contexts/        # CartContext, WishlistContext, CurrencyProvider
│   ├── hooks/           # useAuth, useCart, useAdminCheck, etc.
│   ├── lib/             # Utilities, constants, PDF generators
│   └── integrations/
│       └── supabase/    # client.ts + types.ts (auto-generated)
├── supabase/
│   ├── functions/       # 65+ Edge Functions (Deno)
│   └── migrations/      # 86+ SQL migration files
├── .github/workflows/   # deploy.yml + terminology-check.yml
└── capacitor.config.ts  # iOS/Android config
```

---

## Route Architecture

| Group | Guard | Count | Examples |
|---|---|---|---|
| Public | None | 13 | `/`, `/auth`, `/marketplace`, `/store/:slug` |
| Auth-only | `RequireAuth` | 3 | `/set-pin`, `/reset-pin`, `/my-profile` |
| Member-only | `RequireMember` | 26 | `/dashboard`, `/cart`, `/seller/live` |
| Staff | Self-guarded | 4 | `/admin-portal`, `/support-portal` |

---

## Core Financial Architecture

```
Member Wallet (Supabase wallets table)
    ↑ top-up via RaudhahPay FPX
    ↓ debit via process-payment / process-marketplace-order / process-link-payment
    ↓ withdraw via withdrawal_requests → process-withdrawal-disbursement → RaudhahPay IBG

5-Tier Commission (referral_tree + process-marketplace-order):
  Buyer cashback:  1/6 of commission pool
  Tier 1–5:        1/6 each, walking up referral_tree
  Platform fee:    1.5% to admin wallet
```

**Financial safety rules (non-negotiable):**
- All wallet mutations use `debit_wallet` / `credit_wallet` RPCs (atomic)
- PIN required above RM50 threshold
- Idempotency keys on all financial edge functions
- `va_balance_audit` trigger logs every balance delta
- Rate limiting on all payment endpoints

---

## Key Database Tables

| Table | Purpose |
|---|---|
| `profiles` | User profile (full_name, phone, PIN hash, referral_code) |
| `wallets` | Balance per user per wallet_type (member/merchant/branch/admin) |
| `transactions` | Every financial event |
| `withdrawal_requests` | Withdrawal queue with disbursement tracking |
| `referral_tree` | 5-tier referral hierarchy |
| `marketplace_products` | Product catalog (images as JSONB) |
| `marketplace_orders` | Order records |
| `marketplace_stores` | Merchant stores (merchant_user_id FK) |
| `live_streams` | Live shopping sessions |
| `payment_links` | Hosted payment links |

---

## Coding Conventions

- TypeScript strict — **no `any`** (eslint-enforced)
- shadcn/ui for ALL UI primitives — never build from scratch
- Tailwind CSS — dark mode first, `cn()` for conditional classes
- Functional components + hooks only — no class components
- Zod for all form validation at boundaries
- Money: **never float** — store as numeric, display formatted
- Commits: conventional commits + Co-Authored-By: Claude

---

## Known Architecture Decisions

| Decision | Reason | Date |
|---|---|---|
| Migrated Supabase project to `xgzhlycqknoxgzqznaxe` | Fresh project on Singapore region | 2026-04 |
| Marketplace uses JSONB `images` array (not `image_url`) | Multi-image support from the start | 2026-04 |
| `merchant_user_id` (not `owner_user_id`) on stores | Consistent with user_roles pattern | 2026-04 |
| `profiles` table (not `members`) for user data | Supabase convention | 2026-04 |
| LiveKit for live shopping (not Agora/Mux) | Better React SDK, self-hostable | 2026-05 |
| RaudhahPay for Malaysian FPX | Best MY gateway for SMBs | 2026-04 |

---

## Open Items / Known Issues

| # | Issue | Priority | Notes |
|---|---|---|---|
| 1 | `RAUDHAHPAY_DISBURSEMENT_KEY` not set | High | Withdrawals fall back to manual until configured |
| 2 | `LIVEKIT_*` secrets not set | High | Live shopping returns 503 until configured |
| 3 | `SENDGRID_*` secrets not set | Medium | Email notifications disabled |
| 4 | No external error monitoring | Medium | Add Sentry — no tool wired yet |
| 5 | No external analytics | Low | Custom dashboards exist; PostHog/Amplitude not integrated |
| 6 | Courier API (EasyParcel) not integrated | Low | Flat-rate shipping only |
| 7 | `supabase.from()` used directly in components | Low | Violates architecture rule; RLS is enforced so no security risk, but inconsistent |

---

## Build Framework Status

```
Layer 1  — Product Layer      ✅ Complete
Layer 2  — Design Layer       ✅ Complete
Layer 3  — Frontend Layer     ✅ Complete (minor: ~10 as-any casts remain)
Layer 4  — Backend Layer      ✅ Complete (65+ edge functions)
Layer 5  — Database Layer     ✅ Complete (86+ migrations, RLS on all tables)
Layer 6  — Infrastructure     ✅ Complete (CF Pages + CI/CD)
Layer 7  — Security Layer     ✅ Complete (PIN, RLS, rate-limit, idempotency)
Layer 8  — Integration Layer  ⚠️ Partial (RaudhahPay ✅, LiveKit ⚠️, SendGrid ⚠️)
Layer 9  — Operations Layer   ⚠️ Partial (no Sentry, logs via DB only)
Layer 10 — Business Layer     ⚠️ Partial (revenue model built, no external analytics)
```
