
-- Create marketplace_discount_codes table
CREATE TABLE public.marketplace_discount_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id uuid NOT NULL REFERENCES public.marketplace_stores(id) ON DELETE CASCADE,
  code text NOT NULL,
  discount_type text NOT NULL DEFAULT 'percentage',
  discount_value numeric NOT NULL DEFAULT 0,
  min_order_amount numeric,
  max_uses integer,
  used_count integer NOT NULL DEFAULT 0,
  expires_at timestamp with time zone,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(store_id, code)
);

-- Enable RLS
ALTER TABLE public.marketplace_discount_codes ENABLE ROW LEVEL SECURITY;

-- Admins can manage all discount codes
CREATE POLICY "Admins can manage all discount codes"
  ON public.marketplace_discount_codes FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Merchants can manage own store discount codes
CREATE POLICY "Merchants can manage own discount codes"
  ON public.marketplace_discount_codes FOR ALL
  USING (EXISTS (
    SELECT 1 FROM marketplace_stores s
    WHERE s.id = marketplace_discount_codes.store_id
      AND s.merchant_user_id = auth.uid()
  ));

-- Store managers can view discount codes
CREATE POLICY "Managers can view discount codes"
  ON public.marketplace_discount_codes FOR SELECT
  USING (is_store_manager(auth.uid(), store_id));

-- Public can view active codes for live stores (needed for checkout validation)
CREATE POLICY "Public can view active discount codes for live stores"
  ON public.marketplace_discount_codes FOR SELECT
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM marketplace_stores s
      WHERE s.id = marketplace_discount_codes.store_id
        AND s.status = 'live'
    )
  );
