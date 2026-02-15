

# NOcap — Affiliate Cashback Platform (Updated Plan)
## A web-based affiliate system for businesses to grow their customer base with low marketing costs

---

## Phase 1: Foundation & Member Features (Starting Here)

### 1.1 Authentication & Registration
- **Member registration** with required referral code, email, phone, and OTP verification
- **Smart login flow**: Enter email → system checks if password exists → show password page OR send OTP → on OTP login, prompt to set password
- **PIN setup** for transactions RM50 and above
- Supabase Auth with email-based OTP via SendGrid integration

### 1.2 Member Dashboard
- Overview of wallet balance, recent transactions, and referral stats
- Quick access to QR Pay, Top Up, Transfer, and Referral features

### 1.3 Wallet System
- **Top up** wallet balance (via RaudhahPay payment gateway)
- **Wallet balance display** with real-time updates
- **Top-up history** with date, amount, status
- **Transaction history** — all wallet activity (payments, transfers, cashback received)

### 1.4 QR Payment & Transfers
- **QR Pay scanner** using mobile camera to pay at registered merchant branches
- **PIN verification** for payments RM50 and above
- **Member-to-member transfer** via QR code scan or member search
- **Personal QR code** for receiving transfers from other members

### 1.5 Referral System
- **Unique referral QR code** and **referral URL link** for each member
- Social media sharing capabilities
- **Affiliate dashboard** showing referral tree, referral count, and commission earnings from 5-tier structure

### 1.6 Member Profile
- Full profile management (name, address, avatar, etc.)
- Password management and PIN change

---

## Phase 2: Merchant Features

### 2.1 Merchant Registration & Approval
- Merchant registration form (business details, documents)
- Registration submitted for **admin approval** before activation

### 2.2 Branch Management
- Add/manage multiple branches per merchant
- Each branch gets a **unique static QR code** for accepting payments
- **Dynamic QR code generation** — enter amount before generating QR
- Branch-level commission percentage configuration

### 2.3 Bank Setup & Verification
- Merchant bank account setup for withdrawals
- **RM1 verification payment** — system generates a bill, merchant pays, bank auto-verified on success

### 2.4 Merchant Dashboard
- Branch-level sales, transaction tracking, and summaries
- Balance overview and withdrawal requests (requires admin approval)
- Commission pool tracking per branch

### 2.5 Payment Fee & Commission Engine
- **Platform fee** — admin-configurable percentage deducted from every successful member payment (goes to NOcap platform revenue)
- **Merchant commission** — merchant sets commission % per branch
- **Both fees calculated from gross payment amount:**
  - Example: RM100 payment, 3% platform fee, 5% commission → Platform gets RM3, Commission pool is RM5, Merchant receives RM92
- Commission pool splits **equally 6 ways**: buyer cashback + 5 referral tiers above the buyer
- If fewer than 5 tiers exist above a member, unclaimed portion returns to the branch
- Full transaction breakdown recorded: gross amount, platform fee, commission pool, merchant net, cashback, tier payouts

---

## Phase 3: System Administrator

### 3.1 Admin Dashboard
- System-wide analytics and KPIs (total members, merchants, transaction volume)
- **Platform revenue tracking** — total platform fees collected, daily/monthly trends
- Real-time activity monitoring

### 3.2 Platform Fee Configuration
- **Set and update platform fee percentage** from admin settings
- Fee change audit log (who changed it, when, old vs new value)
- View platform fee revenue reports

### 3.3 Approval Workflows
- **Merchant registration** approval/rejection
- **Withdrawal request** approval/rejection with audit trail

### 3.4 User & Merchant Management
- View, search, suspend/activate members and merchants
- View referral trees and commission distributions

### 3.5 Integration Monitoring
- **RaudhahPay webhook monitoring** — incoming webhook logs, status, payload inspection
- **API health checks** — monitor RaudhahPay and SendGrid API availability
- **Integration dashboard** — success/failure rates, latency metrics, error alerts

### 3.6 System Configuration
- Platform fee percentage, commission rules, and system-wide settings
- Audit logs for all admin actions

---

## Backend & Integrations

- **Lovable Cloud (Supabase)** for database, auth, edge functions, and secrets management
- **RaudhahPay API v2.0** for payment processing (top-ups, merchant verification, QR payments) — API keys stored securely as secrets
- **SendGrid** for OTP email delivery — API key stored securely as secrets
- **Role-based access control** with separate user_roles table (member, merchant, admin)
- **Row-level security** policies for data isolation between roles
- **System settings table** for admin-configurable values (platform fee %, etc.)

---

## Design Approach
- **Mobile-first responsive design** — QR scanning and payments are primarily mobile activities
- Clean, modern UI with the existing shadcn/ui component library
- Bottom navigation bar for member mobile experience
- Dashboard layouts for merchant and admin on desktop
- Currency: **MYR (RM)**

