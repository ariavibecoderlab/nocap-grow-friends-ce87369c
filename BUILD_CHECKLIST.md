# BUILD CHECKLIST — NOcap
*Raudhah Tech 10-Layer Build Framework*

```
Started:   2026-04 (Lovable migration)
Framework: Applied 2026-06-05
Team:      Coach Fadzil + Claude Code
Status:    LIVE — Phases 1–7 complete, Phases 8–10 partial
Live URL:  https://nocap-app.pages.dev
Repo:      https://github.com/ariavibecoderlab/nocap-grow-friends
```

---

## PHASE 1 — DEFINE

### Layer 1: Product Layer
- [x] Problem statement defined (Malaysian SMB payments + referral income gap)
- [x] Target users defined (Members, Merchants, Admins, Support)
- [x] Core value proposition defined (5-tier affiliate + marketplace + wallet)
- [x] Feature scope — MVP defined and shipped
- [x] Success metrics defined (wallet transactions, GMV, referral depth)
- [x] Out of scope documented (no crypto, no stock trading)

### Layer 2: Design Layer
- [x] User flows designed (wallet, QR pay, marketplace, seller onboarding)
- [x] Screen list complete (54 routes, all implemented)
- [x] Key interactions defined (PIN auth, QR scan, cart, live shopping)
- [x] Design system defined (dark theme, secondary #2dac76, font-display)
- [x] Mobile-first responsive (Capacitor iOS + Android + PWA)
- [x] Accessibility — basic ARIA labels present

### Layer 3: Frontend Layer
- [x] Framework chosen — React 18 + TypeScript + Vite
- [x] Component breakdown — shadcn/ui + custom components
- [x] State management — React Context (Cart, Wishlist, Currency)
- [x] Routing — React Router v6, 54 routes
- [x] Form handling — Zod validation throughout
- [x] Loading / error / empty states — present across all pages
- [ ] Remove remaining ~10 `as any` casts in live shopping pages

---

## PHASE 2 — ARCHITECT

### Layer 4: Backend Layer
- [x] Framework — Supabase Edge Functions (Deno)
- [x] API design — 65+ edge functions, all documented
- [x] Business logic — 5-tier commission in process-marketplace-order
- [x] Background jobs — expire-payment-links (cron), rate-limit cleanup
- [x] File handling — product images via JSONB URLs
- [x] Financial operations — process-payment, process-transfer, process-marketplace-order, process-link-payment, process-withdrawal-disbursement
- [x] Merchant API platform — OAuth-style API apps with webhooks

### Layer 5: Database Layer
- [x] Database type — Supabase PostgreSQL (Singapore region)
- [x] Schema — 86+ migrations, all applied
- [x] RLS — enabled on all 65 sensitive tables
- [x] Indexes — GIN for search, BTree for FKs, covering for financial queries
- [x] Data retention — audit logs, webhook delivery history
- [x] Seed data — bank_ibg_codes (17 Malaysian banks)
- [x] Migrations reproducible — all MCP-applied DDL backfilled to files

### Layer 6: Infrastructure Layer
- [x] Hosting — Cloudflare Pages (web) + Supabase (DB + functions)
- [x] Environments — local (port 5173) + production (nocap-app.pages.dev)
- [x] CI/CD — GitHub Actions: terminology check + bun build + wrangler deploy
- [x] Environment variables — all client vars in .env, server secrets in Supabase
- [ ] Staging environment — not configured (deploy straight to prod)
- [ ] .env.example file — not present (team relies on CLAUDE.md env section)

### Layer 7: Security Layer
- [x] Authentication — Supabase Auth (email/password + magic link)
- [x] PIN system — 6-digit, SHA-256 + salt, 5-attempt lockout, 15-min ban
- [x] Authorization — user_roles table (member/merchant/admin/branch/support)
- [x] RLS — row-level security on all sensitive tables
- [x] Rate limiting — check_rate_limit RPC on all payment + auth endpoints
- [x] Idempotency — idempotency_key on all financial transactions
- [x] Input validation — Zod on client, type checks on edge functions
- [x] Wallet integrity — debit_wallet/credit_wallet atomic RPCs + audit trigger
- [x] PDPA — no PII logged to console, auth handled by Supabase
- [ ] Penetration test — not formally run
- [ ] OWASP audit — not formally run

---

## PHASE 3 — BUILD SETUP

- [x] CLAUDE.md created and comprehensive *(updated 2026-06-05)*
- [x] Project folder structure established
- [x] GitHub repo created — ariavibecoderlab/nocap-grow-friends
- [ ] .env.example file — **MISSING** (add with all var names, empty values)
- [x] CI/CD pipeline — .github/workflows/deploy.yml

---

## PHASE 4 — ACTIVE BUILD

### Core Fintech
- [x] Authentication — signup, login, magic link, password reset
- [x] PIN setup + reset flow
- [x] Member wallet — top-up via RaudhahPay FPX
- [x] QR Pay — scan, confirm, PIN gate, process-payment
- [x] P2P Transfer — between NOcap members
- [x] Withdrawal — request, admin approval, auto-disbursement (RaudhahPay IBG)
- [x] 5-tier referral tree — auto-populated on signup, commission distribution
- [x] Transaction history + analytics dashboard
- [x] Push notifications — web (VAPID) + native (Capacitor)

### Marketplace (Phases 1–6)
- [x] Product browse — featured, categories, search (FTS + pg_trgm)
- [x] Product detail + reviews
- [x] Cart (localStorage-persisted, stock-clamped)
- [x] Checkout — wallet debit, 5-tier commission, cashback
- [x] Order management — buyer (my-orders) + seller (kanban fulfillment)
- [x] Seller Center — product management, analytics, promotions
- [x] Store pages — custom pages, SEO, storefront builder
- [x] Wishlist + compare + recently viewed
- [x] Flash sales + countdown timers
- [x] Promoted listings (Boost)
- [x] Seller performance tiers (Bronze/Silver/Gold/Platinum)
- [x] Buyer protection badge
- [x] Affiliate product links (?ref=userId)
- [x] Platform vouchers (admin CRUD + redemption)
- [x] Realtime buyer-seller chat
- [x] Live shopping (LiveKit) — seller broadcast + viewer watch
- [x] Live discovery tab (Marketplace)

### Payment Links
- [x] Create payment links (via merchant API)
- [x] Hosted checkout (/pay/:linkId) — inline PIN pad, wallet balance display
- [x] Webhook delivery — payment_link.paid event

### Merchant Platform
- [x] Merchant registration + approval flow
- [x] Branch management
- [x] API apps (OAuth-style) — keys, secrets, webhooks, rate limits
- [x] Storefront builder (custom pages, menus, SEO)

### Admin Portal
- [x] User management
- [x] Withdrawal approvals + disbursement queue (Processing/Failed/Settled tabs)
- [x] Distribution audit (cashback + commission)
- [x] Platform vouchers management
- [x] Analytics + reconciliation
- [x] Support portal

---

## PHASE 5 — QA

- [ ] Full Layer Audit QA pass (use LAYER_AUDIT_REPORT.md)
- [ ] Payment flow end-to-end test (top-up → pay → cashback)
- [ ] 5-tier commission test (buy as L5 descendant, verify all tiers credit)
- [ ] Withdrawal full flow test (request → approve → processing → settled)
- [ ] Marketplace order test (cart → checkout → fulfillment → delivery)
- [ ] Live shopping test (go live → pin product → viewer watches → adds to cart)
- [ ] Mobile PWA test (iOS Safari + Android Chrome)
- [ ] Security audit — attempt unauthorized access to admin routes
- [ ] Load test — wallet under concurrent transactions

---

## PHASE 6 — DEPLOY & OPERATE

### Deployment
- [x] Production deployed — nocap-app.pages.dev
- [x] Edge functions deployed — 65+ functions active on xgzhlycqknoxgzqznaxe
- [ ] Custom domain configured (e.g. nocap.life or nocap.app)
- [ ] Staging environment setup

### Secrets to Configure
- [ ] `RAUDHAHPAY_DISBURSEMENT_KEY` — enable auto bank payouts
- [ ] `RAUDHAHPAY_DISBURSEMENT_SECRET` — payout webhook verification
- [ ] `SENDGRID_API_KEY` — enable transactional emails
- [ ] `SENDGRID_FROM_EMAIL` — sender address
- [ ] `LIVEKIT_API_KEY` — enable live shopping
- [ ] `LIVEKIT_API_SECRET` — LiveKit token signing
- [ ] `LIVEKIT_URL` — LiveKit cloud URL

### Operations (Layer 9)
- [ ] Sentry — wire up error monitoring (package not installed)
- [ ] Uptime monitoring — no tool configured
- [ ] Alert thresholds — no external alerts (only DB notifications)
- [x] DB-level logging — api_request_logs, webhook_deliveries, va_balance_audit
- [x] Rate limiting — check_rate_limit RPC active

### Business (Layer 10)
- [ ] External analytics — PostHog or Amplitude (no tool wired)
- [ ] Business KPI dashboard — partially built via custom analytics pages
- [ ] Terms of service page — exists (/terms)
- [ ] Privacy policy page — exists (/privacy)
- [ ] PDPA compliance review — partial
- [ ] Revenue reporting — manual via admin portal
- [ ] Custom domain + SSL
- [ ] App Store submission (iOS)
- [ ] Play Store submission (Android)

---

## Priority Items Before Public Launch

| # | Item | Layer | Effort |
|---|---|---|---|
| 1 | Add `.env.example` file | L6 | XS |
| 2 | Configure `RAUDHAHPAY_DISBURSEMENT_KEY` | L8 | XS |
| 3 | Configure `SENDGRID_*` secrets | L8 | XS |
| 4 | Configure `LIVEKIT_*` secrets | L8 | XS |
| 5 | Add Sentry error monitoring | L9 | S |
| 6 | Custom domain (nocap.life) | L6 | S |
| 7 | EasyParcel courier rate API | L8 | M |
| 8 | End-to-end QA test suite | L5 | M |
| 9 | iOS App Store submission | L6 | L |
| 10 | External analytics (PostHog) | L10 | M |
