

# Build a Perfect Demo Store in the Marketplace

## Overview
Create a fully-featured example store called **"NoCap Demo Store"** under the test merchant account (azarul@brainybunch.com) to showcase every marketplace capability. The store will be accessible at `/store/nocap-demo-store`.

## What Gets Created (via database migration)

### 1. Store Record
- **Name**: NoCap Demo Store
- **Slug**: `nocap-demo-store`
- **Theme**: `boutique` (the most visually rich preset)
- **Tagline**: "Your One-Stop Lifestyle Shop"
- **Description**: Full paragraph about the store
- **Announcement bar**: Active with promotional text
- **SEO metadata**: meta_title, meta_description
- **Shipping**: RM 5 flat rate, free shipping above RM 50
- **Store score**: 85
- **Page layout**: Hero slideshow (3 slides with titles/CTAs), CTA banner section, About section, Testimonial
- **Theme overrides**: Custom accent color, pill buttons
- **Status**: `live`

### 2. Categories (5)
- Fashion, Electronics, Home & Living, Food & Beverages, Beauty

### 3. Products (12)
A diverse catalog across all categories with:
- Realistic names, descriptions, prices (RM 10-250 range)
- Stock quantities, SKUs
- Mix of `is_featured` flags (4 featured)
- Varied `sold_count` values for social proof
- Placeholder images using Unsplash URLs (free, no API key needed)
- Active status

### 4. Store Menus (6)
- Header: Shop All, New Arrivals, About Us
- Footer: FAQ, Shipping Policy, Contact Us

### 5. Banners (2)
- Store-level promotional banners with Unsplash images

### 6. Flash Sale (1)
- One product with a discount to demo the flash sale badge

## Technical Details

| Item | Approach |
|---|---|
| Data insertion | Single SQL migration with all INSERTs |
| Merchant account | azarul@brainybunch.com (`59dfea5c-...`) |
| Branch ID | `c75b84c6-b809-483e-a557-c92f4acc33d6` |
| Images | Unsplash direct URLs (no upload needed) |
| No code changes | Pure data — all UI components already exist |

## Result
After migration, the store will be live at:
**`/store/nocap-demo-store`**

Featuring: hero carousel, announcement bar, trust strip, category grid, featured products, new arrivals, all products grid, flash sale badges, store footer, sticky header, follow button, and store score badge — all working out of the box.

