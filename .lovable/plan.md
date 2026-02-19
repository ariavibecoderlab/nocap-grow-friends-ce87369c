
# NoCap Marketplace Module — Revised Full Plan

## Critical Architecture Decision: Public Customers + Dual Payment Model

Since customers can be **anyone worldwide** (not just NoCap members), the marketplace needs two payment paths:

1. **NoCap Wallet Payment** — for existing NoCap members who are logged in (instant, no fees to customer)
2. **Online Payment Gateway** — for public/guest customers who don't have a NoCap wallet (via RaudhahPay, which is already integrated in this project)

Both payment paths credit the **merchant's branch wallet** and distribute commissions through the existing engine. Guest orders are tracked without a NoCap user account.

---

## Who Can Do What

| Role | Access |
|---|---|
| **Merchant** | Create & manage their store, products, orders, team |
| **Store Manager** (invited NoCap member) | Manage products & update order statuses |
| **NoCap Member** (logged in) | Browse, pay with wallet or online payment |
| **Public Guest** (anyone worldwide) | Browse, pay via online payment gateway (no account needed) |

---

## URL Structure

```text
/marketplace                          Public directory of all live stores
/marketplace/:slug                    Public storefront (no login needed)
/marketplace/:slug/product/:id        Product detail page
/marketplace/:slug/checkout           Checkout page (guest or logged in)
/marketplace/:slug/order/:orderId     Order confirmation / tracking
/marketplace/my-orders                Logged-in member's order history
/marketplace/manage                   Merchant management hub (merchant only)
/marketplace/manage/products          Product CRUD
/marketplace/manage/orders            Order management
/marketplace/manage/settings          Store settings & theme
/marketplace/manage/team              Invite / remove managers
```

---

## Database Tables (8 new tables)

### `marketplace_stores`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| merchant_user_id | uuid | FK → auth.users |
| branch_id | uuid | FK → merchant_branches (payments go here) |
| store_name | text | |
| slug | text UNIQUE | URL handle e.g. "kedai-ali" |
| tagline | text | nullable |
| description | text | nullable |
| logo_url | text | nullable |
| banner_url | text | nullable |
| theme | text | 'classic' / 'bold' / 'minimal' |
| primary_color | text | hex string, default '#FFD700' |
| status | text | 'draft' / 'live' / 'paused' |
| settings | jsonb | UI toggle settings |
| whatsapp | text | nullable |
| email | text | nullable |
| shipping_flat_rate | numeric | default 0 |
| free_shipping_min | numeric | nullable |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### `marketplace_categories`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| store_id | uuid FK | |
| name | text | |
| sort_order | integer | default 0 |

### `marketplace_products`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| store_id | uuid FK | |
| category_id | uuid FK | nullable |
| name | text | |
| description | text | nullable |
| price | numeric | RM |
| stock_quantity | integer | default 0 |
| sku | text | nullable |
| weight_kg | numeric | nullable |
| images | jsonb | array of URLs |
| status | text | 'active' / 'draft' / 'out_of_stock' |
| is_featured | boolean | default false |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### `marketplace_orders`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| order_number | text UNIQUE | e.g. "ORD-20260219-0001" |
| store_id | uuid FK | |
| buyer_user_id | uuid | nullable (null = guest) |
| buyer_name | text | snapshot |
| buyer_email | text | snapshot |
| buyer_phone | text | snapshot |
| status | text | pending/confirmed/processing/shipped/delivered/completed/cancelled/refunded |
| subtotal | numeric | |
| shipping_fee | numeric | default 0 |
| total_amount | numeric | |
| platform_fee | numeric | |
| shipping_address | text | |
| tracking_number | text | nullable |
| notes | text | nullable |
| payment_method | text | 'nocap_wallet' / 'online' |
| payment_status | text | 'pending' / 'paid' / 'failed' |
| transaction_id | uuid | nullable FK → transactions |
| bill_id | text | nullable (RaudhahPay bill for online payment) |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### `marketplace_order_items`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| order_id | uuid FK | |
| product_id | uuid FK | |
| product_name | text | snapshot at order time |
| product_image | text | snapshot |
| unit_price | numeric | snapshot |
| quantity | integer | |
| subtotal | numeric | |

### `marketplace_store_managers`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| store_id | uuid FK | |
| user_id | uuid | the invited member |
| invited_by | uuid | the merchant |
| status | text | 'pending' / 'accepted' / 'revoked' |
| created_at | timestamptz | |

### `marketplace_reviews`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| product_id | uuid FK | |
| order_id | uuid FK | |
| buyer_user_id | uuid | nullable |
| rating | integer | 1-5 |
| comment | text | nullable |
| created_at | timestamptz | |

---

## RLS Policy Summary

- **Public SELECT**: live stores + active products are readable by everyone (no auth needed)
- **Merchants**: full CRUD on their own store, products, categories, orders
- **Managers**: can read/update orders and products for stores they manage (accepted status)
- **Buyers**: can read their own orders by `buyer_user_id` or via `bill_id` (for guests)
- **Admin**: full access to all tables

---

## New Storage Bucket

- `marketplace-assets` — public bucket for store logos, banners, product images

---

## Payment Flow Design

### Path A — NoCap Wallet (logged-in members)
```text
Checkout → Select "Pay with NoCap Wallet" → PIN if > RM100
→ process-marketplace-order edge function
→ Deduct buyer member wallet
→ Credit merchant branch wallet
→ Apply existing commission engine (fee, cashback, referral tiers)
→ Create order with payment_method='nocap_wallet', payment_status='paid'
```

### Path B — Online Payment (guest or member, worldwide)
```text
Checkout → Select "Pay Online" (card/FPX via RaudhahPay)
→ create-marketplace-bill edge function creates a RaudhahPay bill
→ Redirect customer to RaudhahPay payment page
→ On success: RaudhahPay webhook → marketplace-payment-webhook
→ Credit merchant branch wallet, update order status to paid
→ Order confirmation shown
```

---

## New Edge Functions (3)

### 1. `process-marketplace-order`
- Validates stock availability for all cart items
- Processes NoCap wallet payment (deducts buyer, credits merchant branch wallet)
- Applies platform fee + existing commission distribution (cashback, referral tiers)
- Atomically decrements stock quantities
- Creates `marketplace_orders` + `marketplace_order_items` records
- Sends notifications to buyer (if NoCap member) and merchant
- Enforces PIN for amounts ≥ RM 100
- Returns order confirmation

### 2. `create-marketplace-bill`
- Creates a RaudhahPay payment bill for the order amount
- Saves the bill_id to the order record
- Returns the RaudhahPay payment URL for redirect
- Uses existing `RAUDHAHPAY_API_KEY`, `RAUDHAHPAY_SECRET_KEY`, `RAUDHAHPAY_COLLECTION_CODE` secrets (already configured)

### 3. `marketplace-payment-webhook`
- Receives RaudhahPay payment success callback
- Validates bill_id matches an order
- Credits merchant branch wallet
- Applies platform fee and commission distribution
- Updates order `payment_status` to 'paid' and `status` to 'confirmed'
- Decrements stock
- Notifies merchant

---

## Frontend Pages & Components

### New Pages
| Path | File | Description |
|---|---|---|
| `/marketplace` | `src/pages/marketplace/MarketplaceDirectory.tsx` | Public grid of all live stores |
| `/marketplace/:slug` | `src/pages/marketplace/Storefront.tsx` | Themed storefront with product grid |
| `/marketplace/:slug/product/:id` | `src/pages/marketplace/ProductDetail.tsx` | Single product page with add-to-cart |
| `/marketplace/:slug/checkout` | `src/pages/marketplace/Checkout.tsx` | Cart + address + payment selection |
| `/marketplace/:slug/order/:orderId` | `src/pages/marketplace/OrderConfirmation.tsx` | Success + order tracking page |
| `/marketplace/my-orders` | `src/pages/marketplace/MyOrders.tsx` | NoCap member's purchase history |
| `/marketplace/manage` | `src/pages/marketplace/manage/ManageDashboard.tsx` | Merchant hub with stats |
| `/marketplace/manage/products` | `src/pages/marketplace/manage/ManageProducts.tsx` | Full product CRUD + image upload |
| `/marketplace/manage/orders` | `src/pages/marketplace/manage/ManageOrders.tsx` | Order list, status updates, tracking |
| `/marketplace/manage/settings` | `src/pages/marketplace/manage/ManageSettings.tsx` | Store identity + theme picker |
| `/marketplace/manage/team` | `src/pages/marketplace/manage/ManageTeam.tsx` | Invite/remove managers |

### New Components
| File | Purpose |
|---|---|
| `src/components/marketplace/StoreCard.tsx` | Store tile for directory listing |
| `src/components/marketplace/ProductCard.tsx` | Product card with add-to-cart button |
| `src/components/marketplace/CartDrawer.tsx` | Slide-out cart panel |
| `src/components/marketplace/ThemeWrapper.tsx` | Applies the selected theme (classic/bold/minimal) |
| `src/components/marketplace/OrderStatusBadge.tsx` | Coloured status chip |
| `src/components/marketplace/PaymentSelector.tsx` | Toggle between wallet / online pay |
| `src/contexts/CartContext.tsx` | localStorage-backed cart state |

### Merchant Dashboard Integration
A new **"Marketplace"** tab added to the existing `MerchantDashboard.tsx` tabs (after the "Logs" tab). Shows: store status, total marketplace revenue, pending orders count, shortcut button to `/marketplace/manage`.

---

## 3 Storefront Themes

All themes use existing Tailwind + the merchant's `primary_color` variable. No external CSS libraries needed.

| Theme | Layout | Feel |
|---|---|---|
| **Classic** | White background, card grid 2-col mobile / 3-col desktop | Clean, minimal, professional |
| **Bold** | Dark hero banner with merchant colour accents, featured product spotlight | Modern, energetic |
| **Minimal** | Full-width list layout, large typography, generous whitespace | Editorial, premium |

---

## Implementation Phases

### Phase 1 — Database & Storage Foundation
- Migration: all 7 new tables + RLS policies
- Create `marketplace-assets` public storage bucket
- Add `marketplace_store_managers` accepted-manager check function (security definer)

### Phase 2 — Merchant Store Setup
- Store creation wizard (slug, name, branch link, theme, colour)
- Store settings page (logo/banner upload, contact info, shipping rates)
- Marketplace tab in existing Merchant Dashboard

### Phase 3 — Product Management
- Product CRUD with up to 5 image uploads (to `marketplace-assets` bucket)
- Category management
- Stock status auto-update when quantity hits 0

### Phase 4 — Public Storefront (3 themes)
- `MarketplaceDirectory` page (public, no auth)
- `Storefront` page with theme switching
- `ProductDetail` page
- `CartContext` with localStorage persistence
- `CartDrawer` component

### Phase 5 — Checkout & Payments
- `Checkout` page with address form + guest buyer info fields
- Payment selector: "NoCap Wallet" (if logged in) vs "Pay Online" (always available)
- `process-marketplace-order` edge function (wallet payment)
- `create-marketplace-bill` edge function (online payment via RaudhahPay)
- `marketplace-payment-webhook` edge function (RaudhahPay callback)
- `OrderConfirmation` page

### Phase 6 — Order Management & Tracking
- Merchant `ManageOrders` page with status pipeline
- Tracking number entry
- Customer `MyOrders` page (NoCap members only)
- Guest order lookup by email + order number
- Realtime order status updates

### Phase 7 — Team Management & Marketplace Analytics
- `ManageTeam` page: invite by email, accept/revoke
- Marketplace revenue analytics in existing merchant analytics tab
- `MarketplaceDirectory` public page with search and category filter

---

## Security Considerations

- Stock decremented inside edge functions only (server-side), never from client
- Guest orders tied to email + order number for lookup (no auth required)
- NoCap wallet payment enforces existing PIN rules for amounts ≥ RM 100
- RaudhahPay webhook validates against known bill IDs (no arbitrary crediting)
- Merchants can only manage their own store; managers scoped by `marketplace_store_managers` table
- RLS prevents cross-store data leakage
- Public routes (storefront, products) only expose `status = 'live'` stores and `status = 'active'` products
