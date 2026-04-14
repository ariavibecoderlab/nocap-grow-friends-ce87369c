

# Make Seller Pages Desktop-Friendly (Responsive Layout)

## Pages & Menus Affected

| # | File | Page/Component | Current Width | New Width | What Changes |
|---|------|---------------|---------------|-----------|--------------|
| 1 | `src/pages/MerchantDashboard.tsx` | Merchant Dashboard (main seller hub) | `max-w-md` (448px) | `max-w-5xl` (1024px) | Header, stats grid, navigation, and all tab content areas widen; stats grid becomes `grid-cols-2 md:grid-cols-4` |
| 2 | `src/pages/MerchantRegister.tsx` | Merchant Registration form | `max-w-md` (448px) | `max-w-2xl` (672px) | Header and multi-step form container widen for comfortable desktop form layout |
| 3 | `src/pages/StorePage.tsx` | Public Store Page (buyer-facing) | `max-w-md` (448px) | `max-w-4xl` (896px) | Store header, product grid, tabs, and announcement area widen; product grid becomes responsive columns |
| 4 | `src/pages/StoreCustomPage.tsx` | Custom Store Pages | `max-w-md` (448px) | `max-w-4xl` (896px) | Custom page content and header widen |

### Components Inside MerchantDashboard (indirectly affected — they inherit the wider container)

These sub-components render inside the dashboard tabs and will automatically benefit from the wider parent container without code changes:

- **Operations**: QR Code, Shop/Products, Chat, Orders Kanban, Reviews, Returns
- **Finance**: Transactions, Withdrawals, Distributions, Sales Reports, Settlement
- **Marketing**: Discounts, Flash Sales, Gift Cards, Bundles, Collections, Abandoned Carts
- **Insights**: Analytics, Store Analytics, CRM, Blog
- **Storefront**: Domain, Pages, Menus, Page Builder, SEO, Checkout Settings, Announcements, Theme
- **Settings & Dev**: API Apps, API Logs, Inventory Alerts, Staff Permissions, Import/Export, Notification Prefs

### NOT Changed (already desktop-friendly or intentionally narrow)

- `src/pages/SellerManual.tsx` — already `max-w-6xl` with sidebar layout
- `src/components/merchant/MerchantNavigation.tsx` — flex-wrap adapts automatically
- Dialog modals in `MerchantDiscountRules.tsx` and `MerchantProductBundles.tsx` — `max-w-md` is correct for modal overlays

## Implementation Steps

1. **MerchantDashboard.tsx** — Replace ~5 instances of `max-w-md` with `max-w-5xl`; update stats grid to `grid-cols-2 md:grid-cols-4`
2. **MerchantRegister.tsx** — Replace ~4 instances of `max-w-md` with `max-w-2xl`
3. **StorePage.tsx** — Replace ~2 instances of `max-w-md` with `max-w-4xl`; make product grid responsive
4. **StoreCustomPage.tsx** — Replace ~2 instances of `max-w-md` with `max-w-4xl`

No new dependencies, no database changes, no new files needed.

