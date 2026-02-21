

# NoCap Internal Marketplace

## Overview
An internal marketplace where merchants sell products/services to NoCap members, with wallet-based payments, the same commission/affiliate engine, and a smooth mobile-first shopping experience.

---

## What You Get

### For Members (Shoppers)
- Browse all merchant stores from a central marketplace directory
- Search and filter products by category, price, and store
- Add items to cart, apply discount codes, and checkout with NoCap wallet
- Track order status and view receipts with merchant logo
- Rate and review purchased products

### For Merchants (Sellers)
- Create a branded online store with logo, banner, and custom theme
- Add unlimited products with images, categories, pricing, and stock tracking
- Set delivery charges (flat rate or free shipping above a threshold)
- Create dynamic discount codes (percentage or fixed, with expiry dates)
- Track all orders with status pipeline (Pending > Confirmed > Processing > Shipped > Delivered)
- Add tracking numbers for shipments
- Invite team members to help manage the store

---

## How It Works

```text
Member browses marketplace
       |
       v
Adds products to cart
       |
       v
Enters shipping address + applies discount code (optional)
       |
       v
Pays with NoCap Wallet (PIN required if >= RM100)
       |
       v
Wallet deducted --> Branch wallet credited (minus platform fee)
       |
       v
Same 6-Tier commission engine runs (cashback + referral tiers)
       |
       v
Merchant receives order notification + manages fulfillment
       |
       v
Member tracks order status + receives delivery updates
```

---

## New Pages

| Page | Who Sees It | What It Does |
|---|---|---|
| Marketplace Directory | All members | Grid of all live stores with search |
| Store Page | All members | Individual store with product grid, themed to merchant's brand |
| Product Detail | All members | Full product info, images, reviews, add-to-cart |
| Checkout | Logged-in members | Cart summary, address, discount code, wallet payment |
| Order Confirmation | Logged-in members | Receipt with merchant logo, order details, tracking |
| My Orders | Logged-in members | Order history with status tracking |
| Manage Dashboard | Merchants | Store stats: revenue, pending orders, product count |
| Manage Products | Merchants | Add/edit/delete products with image upload |
| Manage Orders | Merchants | Order list with status updates and tracking numbers |
| Manage Discounts | Merchants | Create/manage discount codes |
| Manage Settings | Merchants | Store branding, delivery charges, contact info |
| Manage Team | Merchants | Invite/remove store managers |

---

## Key Features

### Shopping Cart
- Stored locally on the device (no login needed to browse/add)
- Shows item count badge on the cart icon
- Slide-out drawer with quantity controls and running total

### Discount Codes
- Merchants create codes like "LAUNCH20" for 20% off
- Fixed amount or percentage discounts
- Optional minimum order amount and expiry date
- Maximum usage limits per code
- Applied at checkout, validated server-side

### Order Receipts
- Shows merchant logo prominently at the top
- Full breakdown: items, subtotal, discount, shipping, total
- Order number for reference
- Downloadable as PDF

### Order Tracking
- Status pipeline visible to both buyer and merchant
- Tracking number field for merchants to update
- Members see real-time status updates on their order page

### 3 Store Themes
- **Classic**: Clean white cards on dark background, 2-column grid
- **Bold**: Large hero banner, accent-colored highlights, featured products section
- **Minimal**: List layout, large typography, premium feel

All themes use the existing Black + Yellow color scheme with the merchant's chosen accent color.

---

## Database Changes (8 new tables + 1 new table for discounts)

1. **marketplace_stores** -- already exists, will add discount-related settings
2. **marketplace_categories** -- already exists
3. **marketplace_products** -- already exists
4. **marketplace_orders** -- already exists
5. **marketplace_order_items** -- already exists
6. **marketplace_store_managers** -- already exists
7. **marketplace_reviews** -- already exists
8. **marketplace_discount_codes** (NEW) -- code, type (percent/fixed), value, min order, max uses, expiry, active status

All existing marketplace tables are already created with proper security policies. Only the discount codes table needs to be added.

---

## Payment Engine

Uses the exact same logic as the existing `process-payment` edge function:
- Deduct from member's wallet
- Credit merchant's branch wallet
- Apply platform fee from system settings
- Run 6-tier commission distribution (1/6 cashback + 5/6 across referral tiers)
- PIN required for amounts at or above the configured threshold
- Unclaimed tier commissions return to branch wallet

One new edge function (`process-marketplace-order`) handles:
- Stock validation and atomic decrement
- Discount code validation and application
- Wallet payment with commission engine
- Order + order items creation
- Notification to merchant

---

## Navigation

- New "Shop" quick action button on the member Dashboard (alongside Pay, Top Up, Transfer, Referral)
- New "Marketplace" tab in the Merchant Dashboard
- Cart icon with badge in the marketplace header
- "My Orders" accessible from the member's profile/settings page

---

## Implementation Phases

### Phase 1: Database + Storage
- Create discount_codes table with RLS
- Verify existing marketplace tables and policies

### Phase 2: Merchant Store Setup
- Store creation wizard
- Settings page (logo, banner, delivery charges, theme)
- Marketplace tab in Merchant Dashboard

### Phase 3: Product Management
- Product CRUD with image uploads
- Category management
- Stock tracking

### Phase 4: Discount Codes
- Merchant discount code CRUD
- Validation logic in edge function

### Phase 5: Public Storefront
- Marketplace directory page
- Themed store pages
- Product detail pages
- Cart context + drawer

### Phase 6: Checkout + Payment
- Checkout page with address, discount code, wallet payment
- `process-marketplace-order` edge function
- Order confirmation with merchant logo receipt

### Phase 7: Order Management
- Merchant order management with status pipeline
- Tracking number entry
- Member "My Orders" page
- Real-time order status updates

### Phase 8: Team + Reviews
- Store manager invitations
- Product reviews and ratings

---

## Technical Details

### New Edge Function: `process-marketplace-order`
- Validates stock for all cart items
- Validates and applies discount code (if provided)
- Processes wallet payment using same commission engine as `process-payment`
- Atomically decrements stock quantities
- Creates order + order items records
- Sends notifications
- Returns order confirmation with receipt data

### New Database Table: `marketplace_discount_codes`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| store_id | uuid FK | |
| code | text | e.g. "LAUNCH20", unique per store |
| discount_type | text | 'percentage' or 'fixed' |
| discount_value | numeric | e.g. 20 for 20% or 5.00 for RM5 |
| min_order_amount | numeric | nullable, minimum order to apply |
| max_uses | integer | nullable, total usage limit |
| used_count | integer | default 0 |
| expires_at | timestamptz | nullable |
| is_active | boolean | default true |
| created_at | timestamptz | |

### New Components
| Component | Purpose |
|---|---|
| StoreCard | Store tile for directory |
| ProductCard | Product card with add-to-cart |
| CartDrawer | Slide-out cart panel |
| CartContext | localStorage-backed cart state |
| ThemeWrapper | Applies merchant's theme |
| OrderStatusBadge | Colored status chip |
| PaymentSummary | Checkout breakdown with discount |
| OrderReceipt | Receipt card with merchant logo |
| DiscountCodeInput | Input + apply button at checkout |

### Storage
Uses existing `marketplace-assets` public bucket for store logos, banners, and product images.

