

# Seller Portal — Knowledge Base for Merchants

## What Already Exists
- `/seller-manual` — A 1,000+ line **reference manual** organized by feature (Products, Orders, Analytics, etc.)
- The new Seller Portal will be different: **journey-based "How To" guides** with step-by-step walkthroughs, visual progress indicators, and practical tips

## Proposed Topics (12 Guides)

### Journey 1: Getting Started (Your First Sale)
1. **From Member to Merchant** — Register as merchant, submit documents, get approved
2. **Setting Up Your Store** — Choose theme, add logo/banner, configure store info
3. **Uploading Your First Products** — Add products, images, categories, variants
4. **Getting Your First Sale** — Share store link, process first order, fulfill & ship

### Journey 2: Marketing & Growth
5. **Running Discount Campaigns** — Create discount rules, percentage/fixed, min purchase
6. **Flash Sales & Collections** — Time-limited deals, curated product groups
7. **Product Bundles & Gift Cards** — Bundle offers, digital gift cards
8. **Recovering Abandoned Carts** — View abandoned carts, re-engage customers

### Journey 3: Operations & Finance
9. **Order Fulfillment Pipeline** — Kanban board, status updates, printing sales orders
10. **Managing Withdrawals & Settlement** — Request payouts, track settlement reports
11. **Customer Chat & Reviews** — Respond to inquiries, manage product reviews

### Journey 4: Advanced Features
12. **Store Customization & SEO** — Page builder, custom domain, blog, SEO settings
13. **Analytics & Sales Reports** — Dashboard metrics, revenue forecasts, CRM
14. **Staff Permissions & API Integration** — Multi-staff access, API apps, webhooks

## Page Design

- **Route**: `/seller-portal`
- **Layout**: Sidebar navigation (journey groups) + main content area
- Each guide has: numbered steps with icons, tip callouts, "Next Guide" navigation
- Search bar to filter guides by keyword
- Progress tracker showing which guides the user has read (localStorage)
- Responsive: sidebar collapses to top tabs on mobile
- Links back to the existing Seller Manual for detailed reference

## Technical Details

| Action | File | Migration? |
|--------|------|-----------|
| Create Seller Portal page | `src/pages/SellerPortal.tsx` | No |
| Create sidebar component | `src/components/seller-portal/SellerPortalSidebar.tsx` | No |
| Create guide content components | `src/components/seller-portal/GuideContent.tsx` | No |
| Add route `/seller-portal` | `src/App.tsx` | No |

All content is static (no database needed). Uses existing UI components (Card, Collapsible, Badge, Sidebar). Dark theme consistent with the rest of the app.

