# NOcap — UX Improvement Report
**Date:** 2026-06-06
**Scope:** Member flows, Marketplace (buyer), Merchant portal, Onboarding & auth
**Method:** Full source review of 54 pages + components

---

## Executive Summary

NOcap has a solid dark-mode foundation and good information architecture. The main UX gaps are:
1. **Auth friction** — email-first flow with no social login or phone option creates drop-off for Malaysian users
2. **Member dashboard** — data-dense but missing motivational nudges (how close am I to my next reward?)
3. **Referral flow** — powerful feature buried in navigation; needs more surface area and celebration moments
4. **Marketplace** — missing key trust signals and discovery features buyers expect
5. **Merchant portal** — 6 sections × 30+ nav items is overwhelming; needs progressive disclosure

---

## 1. Onboarding & Auth

### Current State
- Single email-first flow: enter email → system checks if new/existing → shows registration fields inline
- Referral code is **mandatory** for registration (no code = no account)
- Login happens via a Dialog popup, not a dedicated step

### Issues & Recommendations

**🔴 High impact**

**1.1 — Mandatory referral code blocks organic signups**
New users who hear about NOcap but don't have a referral code cannot register. This is intentional for exclusivity but should have a fallback — a public "platform code" for non-referred signups.
- *Recommendation:* Auto-fill a default platform referral code (e.g. `NOCAP`) when none is provided, so users can still register but are placed under the platform tree.

**1.2 — Registration form appears inline without warning**
When a new email is entered, 3 extra fields appear below with only a tiny message "This email is not registered." Users don't know they've switched from login to registration mode.
- *Recommendation:* Show a clear visual state change — a distinct header ("Create your account"), a step indicator, or an animation that makes the mode switch obvious.

**1.3 — Password dialog pops up in a modal**
After entering email, the password prompt appears in a Dialog overlay rather than inline on the page. This is jarring — feels like the page is fighting itself.
- *Recommendation:* Replace the password Dialog with an inline step — animate the password field appearing below the email, keeping the user in one coherent flow (like how Shopify/Linear handle it).

**🟡 Medium impact**

**1.4 — No phone number / OTP login option**
Malaysian users strongly prefer phone-based login (WhatsApp OTP or SMS). Email + password is a higher-friction mental model for the target demographic.
- *Recommendation:* Add phone + OTP as an alternative login method alongside email. Use Supabase phone auth.

**1.5 — No PIN setup prompt after first login**
Users are redirected straight to Dashboard after registration. The OnboardingChecklist on Dashboard shows "Set PIN" as a pending item, but there's no immediate nudge.
- *Recommendation:* After account creation, redirect to `/set-pin` with a welcome message before the dashboard. This removes friction for the first real payment.

**1.6 — Feature pills on the auth page are generic**
"Instant Cashback · Refer & Earn · 5-Tier Rewards" are correct but don't show numbers. "Earn up to 10% cashback" or "Your referrals earn you RM every day" would convert better.
- *Recommendation:* Replace static pills with dynamic social proof or specific numbers pulled from `system_settings`.

---

## 2. Member Dashboard

### Current State
- Wallet balance card with Top Up / Withdraw CTAs
- 5 quick action buttons (Pay, Top Up, Transfer, Shop, Orders)
- 4 stat cards (Direct referrals, Network, Cashback, Commission)
- CashbackRewardsCard component
- Referral code share card
- Merchant CTA
- Last 5 transactions

### Issues & Recommendations

**🔴 High impact**

**2.1 — Cashback and commission amounts show total lifetime, not this month**
The 4 stat cards show all-time totals. Users have no sense of recent momentum or whether their network is growing.
- *Recommendation:* Add a "This month" toggle or subtitle showing monthly earnings. Even just "+RM X this month" below the total would create a sense of progress.

**2.2 — Quick actions lack contextual state**
The 5 quick action buttons are always the same regardless of user state. A new user with RM0 balance shouldn't see "Pay" as prominently as "Top Up".
- *Recommendation:* Surface the most relevant action first. If balance is RM0, make "Top Up" the primary highlighted button. If there are pending orders, highlight "Orders" with a badge count.

**2.3 — Referral code card is static — no gamification**
The referral code card just shows the code + Share button. It doesn't show how many people joined today, how close the user is to their next reward, or a visual of their referral tree.
- *Recommendation:* Add a mini progress bar: "3 of 5 direct referrals — 2 more to unlock [Benefit X]". Show "+1 new referral today" if applicable.

**🟡 Medium impact**

**2.4 — No summary of unclaimed/pending cashback**
Users can't tell if cashback is pending or settled without digging into transactions. This creates anxiety — "did I get my cashback?"
- *Recommendation:* Show a "Pending cashback" line below the balance, e.g. "RM 3.40 processing". Tap it to see the breakdown.

**2.5 — Transaction list shows only 5 items with no filter**
Recent Activity is limited to 5 transactions with no type filter. Cashback gets mixed with payments, making it hard to see earnings at a glance.
- *Recommendation:* Add filter chips above the list: "All · Cashback · Payments · Transfers". The active filter persists until changed.

**2.6 — Balance visibility toggle state doesn't persist**
Tapping the eye icon hides the balance but it resets on every page refresh. Sensitive users (who hide balance in public) have to hide it every time.
- *Recommendation:* Persist `showBalance` to `localStorage`.

---

## 3. Referral Page

### Current State
- Full-featured 1827-line page with tree visualization, stats, tier breakdown, QR code sharing
- Shows referral network depth, earnings per tier, leaderboard

### Issues & Recommendations

**🔴 High impact**

**3.1 — Referral page is hard to find**
It's accessible via Dashboard → referral card or bottom nav, but there's no proactive nudge. Most users won't discover it unless they already know what they're looking for.
- *Recommendation:* Add a persistent "Invite friends, earn more" banner on the Dashboard when direct referral count < 3. Make it dismissible after 3 direct referrals.

**3.2 — No celebration moment on new referral join**
When someone joins using a user's referral code, there's no notification or visual highlight. The referral count just silently increments.
- *Recommendation:* Add a push notification "🎉 Ahmad just joined using your referral code! You'll earn from their purchases." Use the existing notification system.

**🟡 Medium impact**

**3.3 — QR code sharing doesn't include a branded preview**
The referral QR links to `/auth?ref=CODE` but when shared on WhatsApp or social, it shows a bare URL without any preview image.
- *Recommendation:* Add Open Graph meta tags to the auth page dynamically when `?ref=` is present: "Join [User Name]'s NOcap network and earn cashback."

**3.4 — Tier tree is shown but tier earnings aren't compared**
Users see how many people are in each tier but can't quickly tell which tier earns them the most money.
- *Recommendation:* Add a simple bar chart or percentage breakdown showing "Tier 2 generated 43% of your commission this month." This motivates users to grow deeper tiers.

---

## 4. Top Up & Withdraw

### Issues & Recommendations

**🟡 Medium impact**

**4.1 — Top Up success state depends on URL parameters**
After RaudhahPay redirects back, the success detection reads URL params (`status=success`, `paid=true`). If the redirect is slow or the user navigates away and back, they miss the confirmation.
- *Recommendation:* Also listen on the `wallets` realtime channel (already wired in Dashboard) and show a toast "Your top-up of RM X was successful" when the balance increases — regardless of URL state.

**4.2 — Withdraw page shows all historical requests by default**
The withdrawal history shows every request ever made in a single list. For active users this becomes a long scroll before they can create a new request.
- *Recommendation:* Default to showing only "Active" requests (pending, processing, approved). Add a "History" tab for settled/rejected ones.

**4.3 — No estimated processing time on withdrawal**
After submitting a withdrawal, users don't know when to expect the money. "Submitted" with no timeline creates support tickets.
- *Recommendation:* Add copy beneath the submitted state: "Bank transfers typically arrive within 1 business day. You'll be notified when it's settled."

**4.4 — No minimum withdrawal amount shown upfront**
Users discover the minimum amount only after typing a number below it. The field should show "Min RM X" as placeholder text.

---

## 5. Marketplace (Buyer)

### Current State
- Infinite scroll product grid with category filters, search, flash sale countdown
- StorePage with product grid and store info
- ProductDetail with images, reviews, add to cart
- Cart, Checkout, OrderConfirmation, MyOrders

### Issues & Recommendations

**🔴 High impact**

**5.1 — No cashback preview on product cards**
Product cards show price but not "Earn RM X cashback" which is NOcap's core differentiator. Buyers don't know they're earning on every purchase until after checkout.
- *Recommendation:* Show a small cashback chip on each product card: `💰 Earn RM 1.20` calculated from `price × branch.commission_percent / 6`. This is the strongest conversion driver — surface it prominently.

**5.2 — Empty cart has no product suggestions**
When the cart is empty, users see only a "Browse Marketplace" button. There's no product recommendation or "Recently viewed" section.
- *Recommendation:* Show 4 trending/promoted products in the empty cart screen. These are already fetched via `marketplace_products` with `is_promoted = true`.

**5.3 — No order tracking after checkout**
MyOrders shows status (pending, processing, shipped, delivered) but has no visual progress stepper. Users with a "processing" order can't tell where it is.
- *Recommendation:* Add a 4-step order progress stepper at the top of each order detail: Order Placed → Confirmed → Shipped → Delivered. Highlight the current step.

**🟡 Medium impact**

**5.4 — Product search is not in bottom nav**
Search is accessible from the Marketplace header but not from the bottom navigation. Users who want to search from any screen must navigate to Marketplace first.
- *Recommendation:* Add a Search icon to the bottom nav, or make the top search bar sticky across all marketplace screens.

**5.5 — No "Buy Again" shortcut in MyOrders**
Repeat purchases (common in F&B and consumables) require the user to navigate back to the store, find the product, and add to cart again.
- *Recommendation:* Add a "Buy Again" button on completed orders that pre-fills the cart with the same items.

**5.6 — Checkout doesn't show cashback preview**
The order summary at checkout shows subtotal, shipping, and total — but not the cashback the user will receive. This is a missed conversion moment.
- *Recommendation:* Add a "You'll earn RM X cashback" line in the order summary, highlighted in the secondary (green/gold) colour.

**5.7 — Flash sale countdown doesn't explain the discount**
The `FlashSaleCountdown` component shows a timer but doesn't show what percentage or amount is being discounted versus the original price. Users don't know if the deal is worth it.
- *Recommendation:* Show original price struck through beside the sale price, and the discount percentage badge on the product card.

---

## 6. Merchant Portal

### Current State
- 6 navigation sections with 30+ menu items
- Covers: QR codes, products, orders, live shopping, analytics, finance, marketing, storefront, settings

### Issues & Recommendations

**🔴 High impact**

**6.1 — 30-item navigation is overwhelming for new merchants**
A new merchant landing on the dashboard sees 6 collapsed sections with 30+ items. There's no guided setup path — they're expected to discover the workflow themselves.
- *Recommendation:* Add a "Getting Started" section that appears for merchants with < 5 completed actions: (1) Create store, (2) Add first product, (3) Set up QR code, (4) Make first sale, (5) Set up withdrawal. Collapse or dim the full navigation until setup is done.

**6.2 — No at-a-glance revenue on the merchant homepage**
When a merchant opens their dashboard, they land on the QR tab. There's no revenue summary, pending orders count, or "today's sales" visible without navigating to Analytics.
- *Recommendation:* Add a sticky summary bar at the top of the merchant dashboard showing: Today's revenue, Pending orders count, Unread chat messages. This is the first thing a merchant needs every morning.

**6.3 — "Go Live" is buried in Operations nav**
Live shopping is a high-value differentiator but it's just one item in a list of 7 under Operations. Merchants who could use this feature may never find it.
- *Recommendation:* Promote "Go Live" as a primary CTA card on the merchant homepage, with a button "Start Live Session" and subscriber count or scheduled stream info.

**🟡 Medium impact**

**6.4 — Order fulfillment (Kanban) has no mobile-optimised swipe**
The `MerchantOrderKanban` component shows orders in kanban columns but on mobile the columns are narrow and hard to work with. Most merchants operate from phones.
- *Recommendation:* On mobile (< 640px), switch from horizontal kanban columns to a vertical list with swipeable status chips, or a tab per status (Pending / Processing / Shipped / Delivered).

**6.5 — Analytics page shows revenue chart but no comparison**
The SellerAnalytics chart shows revenue over time but with no comparison to previous period. Merchants can't tell if they're growing or declining without manually comparing numbers.
- *Recommendation:* Add a "vs last period" delta indicator next to each metric: "RM 1,240 revenue (+12% vs last week)".

**6.6 — Products page requires store selection before showing products**
`SellerProducts` starts with a store dropdown — if the merchant has only one store, this is unnecessary friction.
- *Recommendation:* Auto-select the store if there's only one. Skip the selection step entirely.

**6.7 — No low-stock alert on the dashboard**
The navigation has an "Inventory Alerts" item but it requires deliberate navigation. Merchants can unknowingly sell out-of-stock items before they notice.
- *Recommendation:* Show a red badge on the Merchant Dashboard header when any product stock < 5, with a direct link to the low-stock list.

**6.8 — Withdrawal flow for merchants shows same UI as members**
Merchant withdrawals come from branch wallets, not member wallets, but the UI is largely the same. The context is confusing — merchants expect to see business-specific language (disbursement, settlement) not personal wallet language.
- *Recommendation:* Create a merchant-specific withdrawal view that shows branch balance, pending disbursements, and uses business terminology ("Disburse Earnings" not "Withdraw").

---

## Priority Matrix

| Priority | Item | Screen | Effort |
|---|---|---|---|
| 🔴 P1 | Show cashback on product cards | Marketplace / ProductCard | Low |
| 🔴 P1 | Merchant daily revenue summary bar | MerchantDashboard | Medium |
| 🔴 P1 | Guided merchant setup checklist | MerchantDashboard | Medium |
| 🔴 P1 | Referral code mandatory — add fallback | Auth | Low |
| 🔴 P1 | Show cashback at checkout | Cart / Checkout | Low |
| 🟡 P2 | Persist balance hide/show preference | Dashboard | Low |
| 🟡 P2 | Transaction filter chips | Dashboard | Low |
| 🟡 P2 | "This month" toggle on earnings stats | Dashboard | Low |
| 🟡 P2 | Order progress stepper | MyOrders | Medium |
| 🟡 P2 | Estimated transfer time on Withdraw | Withdraw | Low |
| 🟡 P2 | Auto-select single store in SellerProducts | SellerProducts | Low |
| 🟡 P2 | vs-previous-period on analytics | SellerAnalytics | Medium |
| 🟡 P2 | Referral celebration notification | Referral / Notifications | Low |
| 🟢 P3 | Phone + OTP login | Auth | High |
| 🟢 P3 | Buy Again button | MyOrders | Low |
| 🟢 P3 | Merchant-specific withdrawal UI | MerchantDashboard | Medium |
| 🟢 P3 | Mobile kanban → vertical list | MerchantOrderKanban | Medium |
| 🟢 P3 | OG meta tags on referral links | Auth / index.html | Low |
