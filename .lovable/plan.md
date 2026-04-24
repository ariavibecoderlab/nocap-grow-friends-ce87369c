

## Plan: OpenClaw Commerce API Extension (v1.4 — additive only)

Goal: Deliver the endpoints OpenClaw needs to ship the WhatsApp/Telegram AI sales assistant **without changing any existing v1.3 endpoint, request shape, response envelope, webhook payload, or auth flow**.

### Guiding rule — zero breaking changes

- No edits to: `api-charge`, `api-charge-status`, `api-refund`, `api-charges-list`, `api-balance`, `api-branches`, `api-authorize`, `api-token-exchange`, `api-revoke`, `api-app-info`, `api-topup`, `api-distribute`, `api-referral-*`, `api-cashback-history`, `api-register-app`, `api-regenerate-secret`.
- New endpoints live under new function names. New webhook events are added; existing `charge.*` events untouched.
- New auth mode (server-to-server app key) is **opt-in** via a new header — existing OAuth Bearer tokens keep working unchanged.
- Docs version bumps 1.3 → 1.4 with an "Additive — no breaking changes" banner.

### Phase 1 — P0 (blocks OpenClaw GA)

**1. Server-to-server merchant auth (additive)**
- New header pair accepted by new endpoints only: `X-Api-Key: mk_live_…` + `X-Api-Secret: …` (already issued via `api_applications`).
- Reuses existing `api_applications` row; no schema change beyond an optional `scopes text[]` column (default `['read']`).
- Existing `Authorization: Bearer <user_token>` continues to work everywhere it does today.

**2. Product Catalog API** (new edge functions)
- `GET /api-products` — list with `branch_id`, `status`, `page`, `limit`, sourced from `marketplace_products` (+ variants).
- `GET /api-products/{id}` — detail with variants, images, stock.
- `GET /api-products/search?q=` — wraps existing Postgres `tsvector` search RPC.

**3. Orders API** (new edge functions)
- `GET /api-orders` — paginated list, filters: `status`, `branch_id`, `customer_phone`, `from`, `to`.
- `GET /api-orders/{id}` — line items, shipping, fulfillment.
- `POST /api-orders` — creates a `marketplace_orders` row in `status='draft'`; optional `create_payment_link: true` returns a link inline.
- `PATCH /api-orders/{id}/status` — shipped/delivered/cancelled (writes `tracking_number`, `courier`).

**4. Hosted Payment Link** (new edge function + new public page)
- `POST /api-payment-links` → returns `{ url, expires_at, link_id }`.
- New route `/pay/:linkId` renders a hosted checkout page that runs the existing `process-marketplace-order` / `api-charge` flow (PIN entered on Nocap domain, not in chat).
- New table `payment_links (id, merchant_id, branch_id, order_id, amount, currency, status, expires_at, metadata)`.

**5. New webhook events (additive)**
- `product.created`, `product.updated`, `product.stock_changed`
- `order.created`, `order.paid`, `order.shipped`, `order.delivered`, `order.cancelled`, `order.refunded`
- `payment_link.paid`, `payment_link.expired`
- Same HMAC-SHA256 signing scheme as `charge.*`. Envelope adds `merchant_id` + `branch_id` (existing `charge.*` envelope unchanged).
- Delivered through the existing webhook dispatcher; merchants opt in per event (default: all subscribed for backward compat with current behavior on `charge.*`).

### Phase 2 — P1

**6. Customer Directory**
- `GET /api-customers?phone=+60…` (E.164 lookup)
- `GET /api-customers/{id}` and `GET /api-customers/{id}/orders`
- Read-only view over `profiles` + `marketplace_orders`, scoped to merchant's own order history (no cross-merchant data leak).

**7. Inventory reservation**
- `POST /api-inventory/reserve` (TTL default 900s) and `POST /api-inventory/release`.
- New table `inventory_reservations (id, variant_id, qty, expires_at, reference, app_id)`.
- Existing stock decrement on order completion remains the source of truth; reservations are a soft hold consumed at checkout.

**8. Webhook management**
- `GET/POST /api-webhooks/subscriptions` — per-event opt-in.
- Stored on `api_applications.webhook_subscriptions jsonb` (additive column; null = receive all, preserving v1.3 behavior).

### Phase 3 — P2

**9. Webhook replay**
- `POST /api-webhooks/events/{id}/replay` — re-deliver from `webhook_deliveries` log (new lightweight log table).

### Database changes (all additive)

- New tables: `payment_links`, `inventory_reservations`, `webhook_deliveries`.
- New columns (nullable, defaulted): `api_applications.scopes`, `api_applications.webhook_subscriptions`.
- No changes to existing columns or RLS on existing tables; new tables get their own RLS (merchant-owned reads, service-role writes from edge functions).

### Documentation deliverables

- `src/pages/ApiDocs.tsx` — new collapsible sections per endpoint with `ApiTryIt` blocks.
- `src/lib/generateApiGuidePdf.ts` — new chapters mirroring web docs.
- `public/nocap-api-integration-guide.md` — markdown sync.
- All bumped to **v1.4** with explicit "v1.3 endpoints unchanged" callout.

### Out of scope (this plan)

- Building the OpenClaw bot itself.
- Any change to the wallet, PIN, commission, or RaudhahPay flows.
- Migrating existing OAuth merchants to app-key auth (offered as opt-in).

### Rollout order

1. Auth + `api-products*` + `api-orders` (read) + docs
2. `api-orders` (write) + `api-payment-links` + hosted `/pay/:id` + new webhooks
3. `api-customers*` + inventory reservations + webhook subscriptions
4. Webhook replay

