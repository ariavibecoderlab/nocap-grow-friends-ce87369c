ALTER TABLE public.merchant_applications
  ADD COLUMN IF NOT EXISTS affiliate_commission_rate NUMERIC DEFAULT 10.00
  CHECK (affiliate_commission_rate >= 5.00 AND affiliate_commission_rate <= 30.00);

ALTER TABLE public.merchant_branches
  ADD COLUMN IF NOT EXISTS affiliate_commission_rate NUMERIC DEFAULT 10.00
  CHECK (affiliate_commission_rate >= 5.00 AND affiliate_commission_rate <= 30.00);

ALTER TABLE public.marketplace_stores
  ADD COLUMN IF NOT EXISTS brand_tier TEXT DEFAULT 'standard'
  CHECK (brand_tier IN ('standard', 'featured', 'verified'));

CREATE INDEX IF NOT EXISTS idx_marketplace_stores_brand_tier
  ON public.marketplace_stores(brand_tier) WHERE status = 'live';

ALTER TABLE public.marketplace_stores
  ADD COLUMN IF NOT EXISTS primary_category TEXT;

ALTER TABLE public.marketplace_stores
  ADD COLUMN IF NOT EXISTS affiliate_commission_rate NUMERIC DEFAULT 10.00
  CHECK (affiliate_commission_rate >= 5.00 AND affiliate_commission_rate <= 30.00);