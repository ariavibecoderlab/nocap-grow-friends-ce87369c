

# Store Design Upgrade — Shopify-Grade Storefront

## Current State
The StorePage is functional but minimal: a single banner image, store info, flat product grid, and basic search. It lacks the visual richness and conversion-optimized layout of modern Shopify stores.

## Proposed Improvements

### 1. Hero Carousel / Slideshow
Replace the static 160px banner with a full-width hero carousel (280px mobile, 400px desktop) supporting multiple slides. Each slide has a headline, subtitle, and CTA button. Merchants configure slides via their existing `page_layout` JSONB (new section type: `hero_slideshow`). Auto-advances with dots and swipe support.

### 2. Featured Collection Row
A horizontal scrollable section below the hero showing featured products in a larger card format with "Shop Now" CTAs. Uses the existing `is_featured` flag. Title like "Best Sellers" or configurable via page_layout.

### 3. Category Grid with Images
Replace the plain text category chips with a visual grid (2-3 columns) showing category name over a background image. Requires adding an optional `image_url` column to `marketplace_categories`. Falls back to accent-colored cards if no image.

### 4. Trust/Social Proof Strip
A horizontal bar below the hero showing key metrics: "500+ Products", "4.8★ Rating", "Free Shipping over RM50", store follower count. Builds buyer confidence.

### 5. "New Arrivals" Section
Auto-generated section showing the 4-8 most recently added products, sorted by `created_at DESC`. No merchant configuration needed.

### 6. Testimonials / Reviews Carousel
Pull top-rated reviews from the store's products and display them in a horizontal carousel with star ratings, buyer names, and product thumbnails.

### 7. Newsletter / CTA Banner
A mid-page promotional banner (configurable via page_layout) with gradient background, heading, and action button — e.g., "Join our community" or "Shop the Sale".

### 8. Improved Product Grid
- Add hover overlay with quick-view button
- Show discount badges ("20% OFF") for products with flash sale prices
- Larger cards on desktop (3-col instead of 4-col for store pages)
- "Load more" or infinite scroll instead of showing everything

### 9. Sticky Header on Scroll
When scrolling past the hero, show a compact sticky header with store logo, name, search icon, and cart — similar to Shopify's Dawn theme.

### 10. Enhanced Footer
Structured footer with store description, quick links (from existing menu system), social media icons, and "Powered by NoCap" branding.

## Technical Approach

| Change | Files | DB Migration |
|--------|-------|-------------|
| Hero Carousel | New `StoreHeroCarousel.tsx`, update `StorePage.tsx` | No (uses existing `page_layout` JSONB) |
| Category Grid | New `StoreCategoryGrid.tsx`, update `StorePage.tsx` | Add `image_url` to `marketplace_categories` |
| Trust Strip | New `StoreTrustStrip.tsx` | No |
| New Arrivals | Inline in `StorePage.tsx` | No |
| Reviews Carousel | New `StoreReviewsCarousel.tsx` | No |
| CTA Banner | New section type in `StorePage.tsx` | No |
| Sticky Header | New `StoreHeader.tsx` | No |
| Enhanced Footer | New `StoreFooter.tsx` | No |
| Product Grid upgrades | Update `ProductCard.tsx`, `StorePage.tsx` | No |
| Merchant page builder | Update `StorePageBuilder.tsx` to support new section types | No |

All new components will respect the existing theme CSS variable system (`--store-bg`, `--store-accent`, etc.) so they work across all 5 theme presets.

## Priority Order
1. Hero Carousel + Sticky Header (biggest visual impact)
2. Category Grid + Trust Strip + New Arrivals
3. Reviews Carousel + CTA Banner + Footer
4. Product Card hover effects + pagination

