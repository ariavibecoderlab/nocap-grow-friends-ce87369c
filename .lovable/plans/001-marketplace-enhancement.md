# Plan #001 — Shopee-Inspired Marketplace Enhancement

**Status:** KIV (Keep In View)  
**Created:** 2026-04-09  

## Current State Summary

Marketplace already has: product browsing with filters/sort, wishlist, infinite scroll, store pages with themes, product detail with reviews and chat, cart/checkout with wallet payment, discount codes, order tracking, and merchant management tools.

## Phase 1 — High-Impact Quick Wins

1. **Flash Sales / Limited-Time Deals** — `marketplace_flash_sales` table, countdown timers, dedicated section
2. **Product Variants (Size, Color)** — `marketplace_product_variants` table, variant selector UI, cart/order integration
3. **"Sold" Count & Social Proof** — `sold_count` column, "X sold" badge, "Best Selling" sort
4. **Category Chips** — Horizontal scroll navigation replacing dropdown filter

## Phase 2 — Buyer Experience

5. **"Buy Now" Button** — Direct checkout skipping cart
6. **Order Status Timeline** — Visual stepper with `marketplace_order_status_history` table
7. **Buyer Review with Photos** — `review_images` column, photo upload/display
8. **Product Share Button** — Web Share API with referral tracking
9. **Saved Addresses** — `user_addresses` table, address picker at checkout

## Phase 3 — Discovery & Engagement

10. **Banner Carousel** — Admin-managed `marketplace_banners`, auto-rotating
11. **"You May Also Like"** — Related products, recently viewed section, co-occurrence
12. **Product Q&A** — `marketplace_product_qa` table, public Q&A on product page
13. **Store Following** — `marketplace_store_follows` table, follow button, notifications

## Phase 4 — Merchant Tools

14. **Bulk Product Upload (CSV)** — Template download, edge function parser
15. **Store-Level Analytics Dashboard** — Revenue charts, top products, conversion metrics
16. **Voucher System** — Product-specific discounts, claimable vouchers

## Phase 5 — Operational

17. **Multi-Store Cart Checkout** — Split cart into per-store sub-orders
18. **Return/Refund Request Flow** — `marketplace_return_requests` table, merchant approve/reject
19. **Delivery Integration Placeholder** — Courier selection, tracking webhook

## Technical Notes

- ~8-10 new tables, ~5 column additions
- Edge functions: flash sale engine, CSV import, return/refund processing
- Real-time: flash sale countdown, stock alerts
- All enhancements are additive (no breaking changes)
