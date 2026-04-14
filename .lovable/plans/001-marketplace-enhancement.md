# Plan #001 — Shopee + Shopify-Inspired Marketplace Enhancement (Revised)

**Status:** In Progress — Phase 11-15 Planned | **Created:** 2026-04-09 | **Revised:** 2026-04-14

## Current State

Marketplace has: product browsing with filters/sort, wishlist, infinite scroll, store pages with themes/branding, product detail with reviews and chat, cart/checkout with wallet payment, discount codes, order tracking, merchant product/order/review management, store settings (logo, banner, tagline, color, shipping), and store manager invitations.

---

## Phase 1 — High-Impact Quick Wins (Shopee-inspired)

| # | Feature | Key Work |
|---|---------|----------|
| 1 | **Flash Sales / Limited-Time Deals** | `marketplace_flash_sales` table, countdown timers, dedicated section on marketplace home |
| 2 | **Product Variants (Size, Color)** | `marketplace_product_variants` table, variant selector UI, cart/order stores selected variant |
| 3 | **"Sold" Count & Social Proof** | `sold_count` column on products, increment on order completion, "X sold" badge, "Best Selling" sort |
| 4 | **Category Chips** | Horizontal scrollable chip bar replacing dropdown filter |

## Phase 2 — Buyer Experience (Shopee-inspired)

| # | Feature | Key Work |
|---|---------|----------|
| 5 | **"Buy Now" Button** | Direct checkout path skipping cart |
| 6 | **Order Status Timeline** | Visual stepper, `marketplace_order_status_history` table for transition logs |
| 7 | **Buyer Review with Photos** | `review_images` jsonb column, photo upload/display in reviews |
| 8 | **Product Share Button** | Web Share API with clipboard fallback, referral tracking |
| 9 | **Saved Addresses** | `user_addresses` table, address picker at checkout |

## Phase 3 — Discovery & Engagement (Shopee-inspired)

| # | Feature | Key Work |
|---|---------|----------|
| 10 | **Banner Carousel** | Admin-managed `marketplace_banners`, auto-rotating on marketplace home |
| 11 | **"You May Also Like"** | Related products by category/store, Recently Viewed section |
| 12 | **Product Q&A** | `marketplace_product_qa` table, public Q&A on product page |
| 13 | **Store Following** | `marketplace_store_follows` table, follow button with count |

## Phase 4 — Merchant Tools (Shopee-inspired)

| # | Feature | Key Work |
|---|---------|----------|
| 14 | **Bulk Product Upload (CSV)** | CSV template download, edge function parser, progress + error reporting |
| 15 | **Store-Level Analytics Dashboard** | Revenue charts, top products, conversion metrics, `marketplace_product_views` table |
| 16 | **Voucher System** | Product-specific discounts, claimable vouchers on store pages |

## Phase 5 — Operational (Shopee-inspired)

| # | Feature | Key Work |
|---|---------|----------|
| 17 | **Multi-Store Cart Checkout** | Split cart into per-store sub-orders, single payment |
| 18 | **Return/Refund Request Flow** | `marketplace_return_requests` table, buyer request, merchant approve/reject, wallet refund |
| 19 | **Delivery Integration Placeholder** | Courier selection, tracking webhook |

---

## Phase 6 — Seller Store Builder (Shopify-inspired)

| # | Feature | Key Work |
|---|---------|----------|
| 20 | **Visual Store Page Builder** | Drag-and-drop section editor for the store page. Merchants arrange pre-built blocks (Hero Banner, Featured Products, Category Grid, Testimonials, About Us, Contact Form, Custom Text/Image, Video Embed). Stored as JSON layout in `marketplace_stores.page_layout` column. Live preview toggle. |
| 21 | **Theme Templates** | 5-6 pre-designed theme templates (Classic, Modern, Minimal, Bold, Boutique) with configurable fonts, colors, button styles, and corner radius. New `marketplace_store_themes` table for custom overrides. Each template defines default section arrangement. |
| 22 | **Custom Navigation / Menus** | Merchants create custom menus with links to categories, pages, or external URLs. `marketplace_store_menus` table. Header & footer menu support on storefront. |
| 23 | **Custom Pages (About, FAQ, Policy)** | Rich text page editor for merchants to create unlimited custom pages (About Us, FAQ, Shipping Policy, Terms). `marketplace_store_pages` table with slug-based routing under `/store/{slug}/{page-slug}`. |
| 24 | **Store-Level SEO Settings** | Meta title, description, OG image per store and per page. Stored in `marketplace_stores.seo` and `marketplace_store_pages.seo` jsonb columns. Auto-generated sitemap for each store. |

## Phase 7 — Seller Custom Domain & Independent Selling (Shopify-inspired)

| # | Feature | Key Work |
|---|---------|----------|
| 25 | **Custom Domain Mapping** | `marketplace_store_domains` table mapping custom domains to store slugs. DNS verification flow (CNAME/TXT record). Edge function or routing middleware to resolve domain → store. SSL handled by platform. Admin approval optional. |
| 26 | **Standalone Storefront Mode** | When accessed via custom domain, the store renders as a full standalone website (no marketplace header/footer, no NoCap branding). Own navigation, checkout, and order tracking. The store URL becomes the merchant's "own website". |
| 27 | **Store-Level Checkout Customization** | Merchants customize checkout flow appearance (logo, colors, thank-you message). Checkout still uses NoCap wallet but branded to the store. `marketplace_stores.checkout_settings` jsonb column. |
| 28 | **Store Announcements / Notification Bar** | Configurable top banner on storefront (e.g., "Free shipping over RM50", "Hari Raya Sale!"). `marketplace_stores.announcement` jsonb. Toggle on/off with scheduling. |

## Phase 8 — Seller Marketing & Growth Tools (Shopify-inspired)

| # | Feature | Key Work |
|---|---------|----------|
| 29 | **Abandoned Cart Recovery** | Track incomplete checkouts per store. `marketplace_abandoned_carts` table. Automated notification to buyer after 1hr / 24hr. Merchant can view abandoned cart list and manually nudge. |
| 30 | **Customer Database (Store CRM)** | `marketplace_store_customers` table aggregating buyer info per store (order count, total spent, last order date). Merchant can view customer list, search, and filter. Export to CSV. |
| 31 | **Email / Notification Campaigns** | Merchants send promotional notifications or emails to their store customers. `marketplace_store_campaigns` table. Template builder with product links. Requires customer opt-in. |
| 32 | **Discount Automation Rules** | Auto-apply discounts based on rules: cart value threshold, first-time buyer, specific product bundles, buy-X-get-Y. `marketplace_discount_rules` table extending existing discount codes. |
| 33 | **Product Bundles** | Merchants create product bundles at a combined discount price. `marketplace_product_bundles` and `marketplace_bundle_items` tables. Bundle displayed as a single product card with "Save X%" badge. |

## Phase 9 — Advanced Seller Dashboard (Shopify-inspired)

| # | Feature | Key Work |
|---|---------|----------|
| 34 | **Sales & Revenue Reports** | Detailed reporting: daily/weekly/monthly revenue, orders, average order value, top products, top customers. Filterable date range. Chart visualizations. Exportable to CSV/PDF. |
| 35 | **Inventory Alerts & Management** | Low stock threshold per product. Push notification when stock falls below threshold. Bulk stock update UI. Inventory history log. |
| 36 | **Order Fulfillment Pipeline** | Kanban-style board: Pending → Processing → Packed → Shipped → Delivered. Bulk print packing slips. Bulk status update. Estimated delivery date. |
| 37 | **Staff Accounts / Permissions** | Extend existing `marketplace_store_managers` with granular permissions (view-only, manage products, manage orders, manage settings). `marketplace_manager_permissions` table. |
| 38 | **Product SEO Per Item** | Per-product meta title, description, URL slug override. SEO score indicator. |

## Phase 10 — Multi-Channel & Advanced Features (Shopify-inspired)

| # | Feature | Key Work |
|---|---------|----------|
| 39 | **Social Media Product Sharing** | One-click share to WhatsApp, Facebook, Instagram with auto-generated product card image. Deep link back to product page or custom domain. |
| 40 | **Product Collections / Lookbooks** | Merchants curate themed collections (e.g., "Summer Essentials", "Gift Guide"). `marketplace_collections` and `marketplace_collection_items` tables. Collection page on storefront. |
| 41 | **Gift Cards** | Merchants sell store-specific digital gift cards. `marketplace_gift_cards` table with unique codes. Redeemable at checkout against store orders only. |
| 42 | **Product Import/Export** | Full product data export (JSON/CSV). Import from other platforms with field mapping. Bulk edit via spreadsheet re-upload. |
| 43 | **Store Blog / Content Pages** | Simple blog engine for merchants. `marketplace_store_blog_posts` table. Rich text editor with image upload. Blog section on storefront. SEO-optimized URLs. |

---

## Technical Summary

### Existing (no changes needed)
- Product CRUD, image uploads, store branding, discount codes, order management, reviews, chat, wallet payment, store managers

### New Database Objects (~18-22 new tables/columns)

**Tables:**
- `marketplace_flash_sales`, `marketplace_product_variants`
- `marketplace_order_status_history`, `user_addresses`
- `marketplace_banners`, `marketplace_product_qa`, `marketplace_store_follows`
- `marketplace_product_views`, `marketplace_return_requests`
- `marketplace_store_pages`, `marketplace_store_menus`, `marketplace_store_themes`
- `marketplace_store_domains`, `marketplace_abandoned_carts`
- `marketplace_store_customers`, `marketplace_store_campaigns`
- `marketplace_discount_rules`, `marketplace_product_bundles`, `marketplace_bundle_items`
- `marketplace_collections`, `marketplace_collection_items`
- `marketplace_gift_cards`, `marketplace_store_blog_posts`
- `marketplace_manager_permissions`

**Column additions:**
- `marketplace_products`: `sold_count`, `seo` jsonb
- `marketplace_stores`: `page_layout` jsonb, `seo` jsonb, `checkout_settings` jsonb, `announcement` jsonb
- `marketplace_reviews`: `review_images` jsonb
- `marketplace_store_pages`: `seo` jsonb

### Edge Functions (new)
- Flash sale engine, CSV bulk import, return/refund processing
- Abandoned cart notification scheduler
- Domain verification checker
- Campaign email sender

### Key Architecture Decisions
- Store page builder uses JSON-based layout (sections + blocks pattern, similar to Shopify's approach) — no code editor needed
- Custom domain routing resolved at edge function or routing middleware level
- Standalone storefront mode is a rendering flag — same React app, conditionally hiding marketplace chrome
- All enhancements are additive (no breaking changes to existing flows)

### Recommended Implementation Order
Phase 1-5 first (Shopee quick wins, ~4-6 weeks), then Phase 6-7 (Store Builder + Custom Domain, ~3-4 weeks), then Phase 8-10 based on merchant demand.
