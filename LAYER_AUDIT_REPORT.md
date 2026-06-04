# Layer Audit Report — NOcap
*Raudhah Tech 10-Layer Build Framework*
*Audited: 2026-06-05 | Auditor: Claude Code (Phase 0 Step 2)*

---

## Audit Summary

| Layer | Name | Status | Risk |
|---|---|---|---|
| 1 | Product Layer | ✅ Complete | Low |
| 2 | Design Layer | ✅ Complete | Low |
| 3 | Frontend Layer | ✅ Complete | Low |
| 4 | Backend Layer | ✅ Complete | Low |
| 5 | Database Layer | ✅ Complete | Low |
| 6 | Infrastructure Layer | ⚠️ Partial | Medium |
| 7 | Security Layer | ✅ Complete | Low |
| 8 | Integration Layer | ⚠️ Partial | High |
| 9 | Operations Layer | ⚠️ Partial | Medium |
| 10 | Business Layer | ⚠️ Partial | Medium |

**Overall Decision: ✅ GO — Safe to continue building and launch**
Three missing items (L8 secrets) must be resolved before accepting real money.

---

## Layer 1 — Product Layer ✅

**What exists:**
- Problem: Malaysian SMBs and consumers need a unified payment + growth platform
- Users: Members (wallet + earn), Merchants (collect + sell), Admins, Support
- Value proposition: 5-tier affiliate cashback on every transaction + full marketplace
- MVP shipped and live at nocap-app.pages.dev
- Scope well-bounded: wallet, QR pay, marketplace, live shopping, API platform

**What's missing:** Nothing critical.

**Risk:** Low — product is well-defined and live.

---

## Layer 2 — Design Layer ✅

**What exists:**
- Complete screen list: 54 routes, all implemented
- Consistent dark-mode design system (bg-primary, text-secondary #2dac76)
- Mobile-first responsive layout (Capacitor iOS/Android + PWA)
- BottomNav with role-aware tabs (member vs merchant vs branch)
- shadcn/ui component library throughout
- Loading, empty, and error states on all key pages
- Brand name: NOcap (enforced via CI terminology check)

**What's missing:**
- No formal design file (Figma/etc.) — code is the design source of truth
- Accessibility audit not formally completed

**Risk:** Low — UI is consistent and functional.

---

## Layer 3 — Frontend Layer ✅

**What exists:**
- React 18 + TypeScript strict + Vite
- 54 page components, all routed and guarded correctly
- State: CartContext (localStorage), WishlistContext, CurrencyProvider
- Zod validation on all forms
- Functional components + hooks only (no class components)
- `cn()` for conditional classes
- Code-split by route (Vite lazy loading)
- Full-text search (SearchBar autocomplete, SearchResults page)
- Realtime UI (Supabase channels for chat, orders, live streams)
- LiveKit components for live shopping (seller broadcast + viewer)

**What's missing:**
- ~10 remaining `as any` / `as never` casts in live shopping pages (low severity)
- No E2E tests (Playwright/Cypress)

**Risk:** Low — TypeScript compiles clean with zero errors.

---

## Layer 4 — Backend Layer ✅

**What exists:**
- 65+ Supabase Edge Functions (Deno runtime)
- All financial operations: process-payment, process-transfer,
  process-marketplace-order, process-link-payment,
  process-withdrawal-disbursement
- Merchant API platform: OAuth apps, API keys/secrets, webhook delivery,
  replay, idempotency, rate limits, request logs
- Live shopping: livekit-token edge function
- Scheduled jobs: expire-payment-links, rate-limit cleanup
- All endpoints return consistent `{ data, error }` shape
- HMAC-SHA256 webhook signing throughout

**What's missing:**
- No automated test runner for edge functions (manual test files exist for
  api-topup, api-charge, api-branches)

**Risk:** Low — all critical paths have live functions.

---

## Layer 5 — Database Layer ✅

**What exists:**
- Supabase PostgreSQL on Singapore region (xgzhlycqknoxgzqznaxe)
- 86+ migration files — reproducible from clean state
- 65 tables, all with RLS enabled
- Schema coverage: profiles, wallets, transactions, withdrawal_requests,
  referral_tree, marketplace (products/orders/stores/categories),
  live_streams, payment_links, api_applications, notifications,
  bank_ibg_codes (17 Malaysian banks), and more
- Indexes: GIN for full-text search (pg_trgm), BTree for FK lookups,
  covering indexes for financial queries
- Audit: va_balance_audit trigger on every wallet balance change
- Rate limiting: check_rate_limit RPC
- RPCs: debit_wallet, credit_wallet, search_products, autocomplete_products,
  increment/decrement_viewer_count, approve_withdrawal,
  validate_platform_voucher, reconcile_va_balances

**What's missing:**
- No formal data retention/archiving policy for old transactions
- No DB backup schedule confirmed (Supabase handles this by default on Pro plan)

**Risk:** Low — schema is well-designed, all tables RLS-protected.

---

## Layer 6 — Infrastructure Layer ⚠️

**What exists:**
- Hosting: Cloudflare Pages (web) + Supabase (DB + edge functions)
- CI/CD: GitHub Actions — terminology check + bun build + wrangler deploy
- Branch: main → auto-deploy to production
- Environment variables: client vars in .env, server secrets in Supabase dashboard

**What's missing:**
- ❌ `.env.example` file not present — new developers can't onboard without the CLAUDE.md
- ❌ Staging environment not configured — all deploys go straight to production
- ❌ Custom domain not configured — live on *.pages.dev subdomain
- No rollback process documented

**Risk:** Medium — no staging means untested code ships to real users.
Priority fix: create `.env.example` and configure a staging branch.

---

## Layer 7 — Security Layer ✅

**What exists:**
- Auth: Supabase Auth (email/password, magic link, OTP)
- PIN: 6-digit, SHA-256 + salt, 5-attempt lockout, 15-min ban, reset flow
- Roles: user_roles table (member/merchant/admin/branch/support)
- RLS: enforced on all 65 sensitive tables
- Rate limiting: check_rate_limit RPC on all payment + auth endpoints
- Idempotency: idempotency_key on all financial transactions
- Double-spend protection: wallet balance locked atomically on debit
- Wallet integrity: debit_wallet/credit_wallet RPCs + va_balance_audit trigger
- Financial controls: top-up amount bounds (RM10–500), PIN gate above RM50
- Input validation: Zod on client, type checks + schema validation on edge functions
- PDPA: no PII in console logs, no PII in URL params, Supabase handles encryption at rest
- OWASP: No raw SQL (all via Supabase SDK), XSS mitigated by React, CSRF not applicable (JWT auth)

**What's missing:**
- No formal penetration test
- No formal OWASP audit (though patterns are followed)
- admin-portal is desktop-only (MobileBlocked) which is acceptable

**Risk:** Low — security architecture is solid for a fintech MVP.

---

## Layer 8 — Integration Layer ⚠️

**What exists:**
- ✅ **RaudhahPay** (collection): FPX top-up bills, webhook confirmation
- ✅ **RaudhahPay** (disbursement): IBG bank transfer edge function built, awaiting credentials
- ✅ **LiveKit**: WebRTC live shopping, token edge function deployed, awaiting secrets
- ✅ **Web Push (VAPID)**: Push notifications, keys configured
- ✅ **Capacitor Push**: Native iOS/Android notifications
- ✅ **Supabase Realtime**: Chat, order updates, live viewer counts

**What's missing:**
- ❌ `RAUDHAHPAY_DISBURSEMENT_KEY` not set → withdrawals processed manually
- ❌ `SENDGRID_*` not set → transactional emails (approval, settled, rejected) not sending
- ❌ `LIVEKIT_*` not set → live shopping returns 503 for token requests
- ❌ EasyParcel / courier rate API not integrated → flat-rate shipping only
- ❌ No SMS fallback for OTP (Supabase email OTP only)

**Risk:** HIGH — three missing secrets block real money movement automation.
**Action required before public launch:** Set the 3 credential sets above.

---

## Layer 9 — Operations Layer ⚠️

**What exists:**
- ✅ DB-level logging: api_request_logs, webhook_deliveries, va_balance_audit
- ✅ Rate limiting and abuse detection via check_rate_limit RPC
- ✅ Webhook delivery retries (3 attempts) with replay capability
- ✅ Admin withdrawal queue with processing/failed/settled tracking
- ✅ GitHub Actions deployment logs

**What's missing:**
- ❌ **No Sentry** (or equivalent) — uncaught frontend exceptions go undetected
- ❌ **No uptime monitoring** — no alert if the site goes down
- ❌ **No external alert channel** — only DB notifications to admin user
- ❌ No structured logging from edge functions to external sink (Datadog/Logtail)
- ❌ No automated backup verification

**Risk:** Medium — the app is live without visibility into silent errors.
**Recommended fix:** Add Sentry (frontend) + BetterStack/Logtail (edge functions) before scaling.

---

## Layer 10 — Business Layer ⚠️

**What exists:**
- ✅ Revenue model: 1.5% platform fee on marketplace orders + payment links
- ✅ 5-tier commission model built and live
- ✅ Analytics pages (member analytics + seller analytics) — custom built
- ✅ Admin distribution audit (commission/cashback tracking)
- ✅ Legal pages: /terms, /privacy
- ✅ Referral tracking with tree visualization

**What's missing:**
- ❌ No external analytics tool (PostHog/Amplitude/GA) — no user behaviour data
- ❌ No formal business KPI dashboard for the platform owner
- ❌ PDPA compliance not formally reviewed by a legal professional
- ❌ Custom domain not configured (still on .pages.dev)
- ❌ App Store / Play Store submission not completed
- ❌ No subscription/billing model for merchants (currently free)

**Risk:** Medium — product works, but growth and compliance are not instrumented.

---

## Top 3 Risks

| # | Risk | Layer | Action |
|---|---|---|---|
| 1 | **Missing payment secrets** — RAUDHAHPAY_DISBURSEMENT_KEY, SENDGRID_*, LIVEKIT_* not configured | L8 | Set secrets in Supabase dashboard immediately |
| 2 | **No error monitoring** — silent frontend crashes go undetected in production | L9 | Install Sentry, wire DSN |
| 3 | **No staging environment** — every deploy ships to real users | L6 | Create `staging` CF Pages environment from a `staging` branch |

---

## GO / NO-GO Per Layer

| Layer | GO? | Condition |
|---|---|---|
| L1 Product | ✅ GO | — |
| L2 Design | ✅ GO | — |
| L3 Frontend | ✅ GO | Minor: clean remaining `as any` casts |
| L4 Backend | ✅ GO | — |
| L5 Database | ✅ GO | — |
| L6 Infrastructure | ⚠️ GO with condition | Add .env.example + staging branch |
| L7 Security | ✅ GO | — |
| L8 Integration | ⚠️ NO-GO for full launch | Set 3 credential sets (disbursement, email, LiveKit) |
| L9 Operations | ⚠️ GO with condition | Add Sentry before scaling past 100 users |
| L10 Business | ⚠️ GO with condition | Add analytics before making growth decisions |

**Overall: SOFT LAUNCH ✅ — can accept users today.**
**Full public launch: pending L8 secrets + L9 Sentry.**
