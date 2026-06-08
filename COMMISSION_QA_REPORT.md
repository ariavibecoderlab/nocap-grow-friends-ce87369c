# NOcap — Cashback & Commission QA Report
**Date:** 2026-06-06
**Functions reviewed:** `process-marketplace-order`, `process-payment`
**DB reviewed:** `merchant_branches.commission_percent`, `referral_tree`, `system_settings`

---

## How It's Supposed to Work (per CLAUDE.md)

For every purchase, the branch's `commission_percent` forms a pool that is split into **6 equal shares**:

| Recipient | Share |
|---|---|
| Buyer (cashback) | 1/6 of pool |
| Tier 1 referrer | 1/6 of pool |
| Tier 2 referrer | 1/6 of pool |
| Tier 3 referrer | 1/6 of pool |
| Tier 4 referrer | 1/6 of pool |
| Tier 5 referrer | 1/6 of pool |
| Platform (admin) | 1.5% of total (separate, on top) |
| Branch | Remainder |

---

## ✅ Simulation Results — RM100 Order, 10% Commission, Full 5-Tier Tree

```
feeAmount (platform):  RM 2.00    (2% — see bug #1)
commissionPool:        RM 10.00   (10% of RM100)
branchCredit:          RM 88.00   (net - pool)

process-marketplace-order (FLOOR rounding):
  Buyer cashback:      RM 1.66  ← 1/6 of RM10
  Tier 1–5 each:       RM 1.66
  Branch:              RM 88.00
  Platform fee:        RM 2.00
  ─────────────────────────────
  Total out:           RM 99.96  ← RM0.04 MISSING (dust)

process-payment (ROUND rounding):
  Buyer cashback:      RM 1.67  ← 1/6 of RM10
  Tier 1–5 each:       RM 1.67
  Branch:              RM 88.00
  Platform fee:        RM 2.00
  ─────────────────────────────
  Total out:           RM 100.02 ← RM0.02 OVER-DISTRIBUTED
```

---

## 🔴 BUG #1 — Platform Fee Default is 2%, Should Be 1.5%

**Files:** `process-marketplace-order/index.ts:290`, `process-payment/index.ts:202`

```ts
const platformFeePercent = feeSetting ? Number(feeSetting.value) : 2.0;  // ← wrong default
```

Both functions default to **2%** when `platform_fee_percent` is not found in `system_settings`. CLAUDE.md specifies **1.5%**. If the key is missing from the DB, every transaction overcharges by 0.5%.

**Fix:** Change default to `1.5`.

**Immediate check:** Run this in Supabase SQL editor:
```sql
SELECT key, value FROM system_settings WHERE key = 'platform_fee_percent';
```
If it returns nothing, insert the row:
```sql
INSERT INTO system_settings (key, value) VALUES ('platform_fee_percent', '1.5');
```

---

## 🔴 BUG #2 — Rounding Inconsistency Between Functions (FLOOR vs ROUND)

**Files:** `process-marketplace-order/index.ts:296-297` vs `process-payment/index.ts:208-209`

`process-marketplace-order` uses `Math.floor` — **under-distributes** and loses dust:
```ts
const cashbackShare = Math.floor((commissionPool / 6) * 100) / 100;  // FLOOR
const tierShare     = Math.floor((commissionPool / 6) * 100) / 100;
```

`process-payment` uses `Math.round` — **over-distributes** by a fraction:
```ts
const baseShare = Math.round((commissionPool / 6) * 100) / 100;  // ROUND
```

Neither function is correct. The dust or over-distribution amount per transaction is small (≤RM0.04) but accumulates at scale.

**Fix (both functions):** Calculate 5 tier shares and derive cashback as the remainder to ensure the pool is always exactly consumed:

```ts
const tierShare    = Math.floor((commissionPool / 6) * 100) / 100;
const cashbackShare = Math.round((commissionPool - 5 * tierShare) * 100) / 100; // absorbs dust
```

This gives the buyer cashback the extra cent(s) and ensures total always equals commissionPool.

---

## 🔴 BUG #3 — `process-marketplace-order` Missing Min Cashback Guard

**File:** `process-marketplace-order/index.ts:296`

`process-payment` has a minimum cashback guard:
```ts
const cashbackShare = commissionPool > 0 ? Math.max(0.01, baseShare) : 0;  // ✅
```

`process-marketplace-order` does NOT:
```ts
const cashbackShare = Math.floor((commissionPool / 6) * 100) / 100;  // no minimum
```

For very small orders where `commissionPool / 6 < 0.01`, cashback rounds down to RM0.00 — the buyer gets nothing even though a commission pool exists.

**Fix:** Apply the same guard:
```ts
const cashbackShare = commissionPool > 0 ? Math.max(0.01, Math.floor((commissionPool / 6) * 100) / 100) : 0;
```

---

## 🟡 BUG #4 — Stock Decrement is Non-Atomic (Oversell Risk)

**File:** `process-marketplace-order/index.ts:381-385`

```ts
// Reads stock first, then writes the pre-read value minus qty
await supabase.from('marketplace_products')
  .update({ stock_quantity: product.stock_quantity - item.quantity })
  .eq('id', item.product_id);
```

**Race condition:** If two buyers order the last item simultaneously, both read `stock_quantity = 1`, both write `0`, and two orders succeed — **oversell**.

Note: The soft reservation system (`inventory_reservations`) mitigates this IF buyers use the cart reserve flow, but checkout can be called directly without reservations.

**Fix:** Use an atomic decrement with a stock guard. Add this RPC to a migration:
```sql
CREATE OR REPLACE FUNCTION decrement_stock(p_product_id uuid, p_qty int)
RETURNS int LANGUAGE sql AS $$
  UPDATE marketplace_products
  SET stock_quantity = stock_quantity - p_qty
  WHERE id = p_product_id AND stock_quantity >= p_qty
  RETURNING stock_quantity;
$$;
```
Then in the edge function:
```ts
const { data: newStock } = await supabase.rpc('decrement_stock', {
  p_product_id: item.product_id, p_qty: item.quantity
});
if (newStock === null) throw new Error(`${product.name} is out of stock`);
```

---

## 🟡 BUG #5 — Unclaimed Commission Dust Not Returned to Branch

**File:** `process-marketplace-order/index.ts:440-468`

When ancestors are missing, unclaimed tier shares are correctly returned to branch:
```ts
unclaimedCommission += (5 - ancestors.length) * tierShare;
```

However, the **rounding dust** (from FLOOR — the RM0.04 gap) is never accounted for in `unclaimedCommission`. It's simply lost. With Bug #2 fixed (cashback absorbs dust), this becomes a non-issue.

---

## ✅ What Works Correctly

| Check | Result |
|---|---|
| Commission pool formula matches DB migration | ✅ Both use `amount × percent / 100` |
| `commission_percent` stored as whole number (e.g. 10 = 10%) | ✅ Confirmed in migrations |
| Buyer debit uses atomic `debit_wallet` RPC | ✅ |
| Branch / tier credits use `credit_wallet` RPC | ✅ |
| Referral tree lookup (tiers 1–5, ascending) | ✅ |
| Unclaimed tiers (partial tree) returned to branch | ✅ |
| No referral ancestors → all 5 tier shares to branch | ✅ |
| Admin platform fee credited to admin wallet | ✅ |
| Buyer wallet debited before any credits | ✅ |
| process-payment and process-marketplace-order: same commission logic structure | ✅ (minor differences noted above) |

---

## Fix Priority

| # | Bug | File(s) | Action |
|---|---|---|---|
| 1 | Platform fee default 2% → should be 1.5% | Both functions + system_settings | Check DB first; fix default fallback |
| 2 | FLOOR vs ROUND rounding — dust lost or over-distributed | `process-marketplace-order:296` & `process-payment:208` | Fix both to use remainder method |
| 3 | No min cashback guard in marketplace order | `process-marketplace-order:296` | Add `Math.max(0.01, ...)` |
| 4 | Non-atomic stock decrement (oversell risk) | `process-marketplace-order:381` | Add `decrement_stock` RPC |
| 5 | Rounding dust not returned to branch | Resolved by fixing #2 | — |
