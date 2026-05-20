-- Phase 2: Brand & Merchant Engine
-- Adds commission rate control per merchant, brand tier system, and primary category

-- Commission rate on merchant applications (5%-30%, default 10%)
ALTER TABLE public.merchant_applications
  ADD COLUMN IF NOT EXISTS affiliate_commission_rate NUMERIC DEFAULT 10.00
  CHECK (affiliate_commission_rate >= 5.00 AND affiliate_commission_rate <= 30.00);

-- Commission rate on branches (inherits or overrides merchant-level rate)
ALTER TABLE public.merchant_branches
  ADD COLUMN IF NOT EXISTS affiliate_commission_rate NUMERIC DEFAULT 10.00
  CHECK (affiliate_commission_rate >= 5.00 AND affiliate_commission_rate <= 30.00);

-- Brand tier on marketplace stores: standard → featured → verified
ALTER TABLE public.marketplace_stores
  ADD COLUMN IF NOT EXISTS brand_tier TEXT DEFAULT 'standard'
  CHECK (brand_tier IN ('standard', 'featured', 'verified'));

-- Partial index for fast featured/verified store queries
CREATE INDEX IF NOT EXISTS idx_marketplace_stores_brand_tier
  ON public.marketplace_stores(brand_tier) WHERE status = 'live';

-- Primary category tag (e.g. 'food', 'fashion', 'electronics', 'beauty', 'lifestyle')
ALTER TABLE public.marketplace_stores
  ADD COLUMN IF NOT EXISTS primary_category TEXT;

-- Carry commission rate from application → store on approval
-- (admin sets it on the application; migration ensures existing stores stay at 10% default)
ALTER TABLE public.marketplace_stores
  ADD COLUMN IF NOT EXISTS affiliate_commission_rate NUMERIC DEFAULT 10.00
  CHECK (affiliate_commission_rate >= 5.00 AND affiliate_commission_rate <= 30.00);
