
User confirmed: ship Phases 1+2 first (live editor + templates/blocks), replace existing form-based builder entirely, and enforce Draft vs Published from v1. Will also queue Phases 3-5 as follow-ups.

Key technical decisions:
- New folder `src/components/merchant/storefront-builder/` replacing `StorePageBuilder.tsx`
- Schema additions: `marketplace_stores.draft_layout JSONB`, `draft_theme JSONB`, `published_at TIMESTAMPTZ`, `published_layout` (rename current `page_layout`) — keep `page_layout` as the live/published one to avoid breaking `StorePage.tsx` reads
- Live preview via iframe → `/store/:slug?preview=draft&token=...` with a short-lived preview token (since draft data isn't public)
- DnD via `@dnd-kit/core` + `@dnd-kit/sortable`
- Reuses existing theme system in `src/lib/storeThemes.ts` and `ImageUploadField`

# Storefront Builder v2 — Implementation Plan

## Phase 1 — Live Split-Screen Editor (v1 ship)

**New page**: `/merchant/storefront/builder` (replaces the in-tab `StorePageBuilder` inside `MerchantStorePages.tsx`)

**Layout** (desktop ≥1024px):
```text
┌──────────────────────────────────────────────────────────┐
│ Toolbar: [◀ Back] Store Name  [Desktop|Tablet|Mobile]    │
│          [Undo][Redo]  [Save Draft] [Publish ▾]          │
├────────────────────┬─────────────────────────────────────┤
│ Sections (sortable)│                                      │
│ ┌─ Hero        ⋮ │                                      │
│ ├─ Featured    ⋮ │       Live Preview (iframe)          │
│ ├─ About       ⋮ │       responsive frame               │
│ └─ + Add       ⋮ │                                      │
│                    │                                      │
│ Properties Panel   │                                      │
│ (selected block)   │                                      │
└────────────────────┴─────────────────────────────────────┘
```
Mobile (<1024px): tabs switch between Editor / Preview.

**Components**:
- `BuilderLayout.tsx` — root layout, viewport state
- `BuilderToolbar.tsx` — viewport switcher, undo/redo, save/publish, "View live"
- `SectionsPanel.tsx` — sortable list (`@dnd-kit/sortable`), add/duplicate/hide/delete
- `BlockPropertiesPanel.tsx` — dynamic form per block type
- `LivePreviewFrame.tsx` — iframe with viewport-sized wrapper (1280, 768, 390 px)
- `useBuilderState.ts` — Zustand-style hook with undo/redo history (last 50 states), debounced auto-save (10s)

**Live preview mechanism**:
- Iframe loads `/store/:slug?preview=draft&token=<jwt>`
- `StorePage.tsx` detects `?preview=draft`, validates token via edge function, reads `draft_layout` instead of `page_layout`
- Builder posts `{type: 'BUILDER_UPDATE', layout, theme}` via `postMessage` on every edit; preview applies in-memory without refetch

## Phase 2 — Templates & Block Library (v1 ship)

**Starter Templates** (one-click apply theme + sample blocks + sample copy):
1. Fashion Boutique
2. Restaurant / F&B
3. Services / Bookings
4. Electronics / Tech
5. Minimal Portfolio
6. Bold Promo

Stored as TS constants in `src/lib/storeTemplates.ts`. First-time users see template picker modal; existing stores can apply via toolbar "Apply Template".

**Block Gallery** (visual "Add Section" with thumbnails):
- Hero Banner, Hero Slideshow, Featured Products, Product Grid by Category, Banner Carousel, Text Block, Image + Text, Testimonials, FAQ Accordion, Newsletter Signup, About, CTA Banner, Custom HTML
- Each block has a thumbnail, label, description, and default content

**Inline image picker** (replaces URL paste): tabs for "Upload" (existing `ImageUploadField`) | "From products" (pulls `marketplace_products.images`) | "From media library" (lists prior uploads in `builder/<storeId>` folder).

## Phase 5 (pulled into v1) — Draft vs Published

**Schema migration**:
```sql
ALTER TABLE marketplace_stores
  ADD COLUMN draft_layout JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN draft_theme JSONB,
  ADD COLUMN draft_updated_at TIMESTAMPTZ,
  ADD COLUMN published_at TIMESTAMPTZ;
```
- `page_layout` stays as the **published** layout (read by storefront)
- `draft_layout` is what the builder edits
- Auto-save writes to `draft_layout`; "Publish" copies `draft_layout → page_layout` and stamps `published_at`
- Toolbar shows badge: "Draft has unpublished changes" when `draft_updated_at > published_at`

**Edge function**: `builder-preview-token` — issues a short-lived (5 min) signed token bound to `(store_id, merchant_user_id)` so the iframe can read draft data without exposing it publicly. `StorePage` validates via a new `get_draft_layout` RPC.

## Phases 3 & 4 (follow-up after v1)

**Phase 3 — Theme Customizer**: live color pickers, 8 curated font pairs, border radius slider, "Match my logo" (canvas color extraction), save custom theme.

**Phase 4 — Unified Storefront Hub**: consolidate Pages / Theme / Menus / Domain & SEO / Checkout into a single `/merchant/storefront` shell with left sub-nav. Always-visible "View live" + "Share preview link".

## Files to Create / Modify

**Create** (~12 files):
- `src/pages/MerchantStorefrontBuilder.tsx`
- `src/components/merchant/storefront-builder/{BuilderLayout,BuilderToolbar,SectionsPanel,BlockPropertiesPanel,LivePreviewFrame,TemplatePickerModal,BlockGallery,InlineImagePicker}.tsx`
- `src/components/merchant/storefront-builder/blocks/` — one renderer config per block type
- `src/hooks/useBuilderState.ts`
- `src/lib/storeTemplates.ts`
- `supabase/functions/builder-preview-token/index.ts`

**Modify**:
- `src/App.tsx` — add `/merchant/storefront/builder` route
- `src/components/merchant/MerchantStorePages.tsx` — replace embedded `StorePageBuilder` with "Open Builder" CTA linking to new page
- `src/pages/StorePage.tsx` — handle `?preview=draft&token=...`, accept postMessage updates, render new block types
- Delete: `src/components/merchant/StorePageBuilder.tsx`

**Migration**: schema additions above + RPC `get_draft_layout(store_id, token)`.

## Build Order
1. Schema migration (draft columns) + preview token edge function
2. Builder shell + state hook + toolbar
3. Sections panel with DnD + properties panel
4. Live preview iframe + postMessage bridge + StorePage draft mode
5. Block gallery + new block types in renderer
6. Template picker + 6 starter templates
7. Inline image picker
8. Replace MerchantStorePages tab, delete old builder, ship
