
-- 1. Add sold_count to marketplace_products
ALTER TABLE public.marketplace_products
ADD COLUMN IF NOT EXISTS sold_count integer NOT NULL DEFAULT 0;

-- 2. Create marketplace_flash_sales table
CREATE TABLE public.marketplace_flash_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.marketplace_products(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.marketplace_stores(id) ON DELETE CASCADE,
  flash_price numeric NOT NULL,
  original_price numeric NOT NULL,
  starts_at timestamp with time zone NOT NULL,
  ends_at timestamp with time zone NOT NULL,
  max_quantity integer NOT NULL DEFAULT 0,
  sold_quantity integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.marketplace_flash_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active flash sales for live stores"
ON public.marketplace_flash_sales FOR SELECT
USING (
  is_active = true
  AND starts_at <= now()
  AND ends_at > now()
  AND EXISTS (
    SELECT 1 FROM public.marketplace_stores s
    WHERE s.id = marketplace_flash_sales.store_id AND s.status = 'live'
  )
);

CREATE POLICY "Merchants can manage own flash sales"
ON public.marketplace_flash_sales FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.marketplace_stores s
    WHERE s.id = marketplace_flash_sales.store_id AND s.merchant_user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all flash sales"
ON public.marketplace_flash_sales FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_flash_sales_updated_at
BEFORE UPDATE ON public.marketplace_flash_sales
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Create marketplace_product_variants table
CREATE TABLE public.marketplace_product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.marketplace_products(id) ON DELETE CASCADE,
  variant_name text NOT NULL,
  variant_value text NOT NULL,
  price_adjustment numeric NOT NULL DEFAULT 0,
  stock_quantity integer NOT NULL DEFAULT 0,
  sku text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.marketplace_product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view variants for active products in live stores"
ON public.marketplace_product_variants FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.marketplace_products p
    JOIN public.marketplace_stores s ON s.id = p.store_id
    WHERE p.id = marketplace_product_variants.product_id
      AND p.status = 'active' AND s.status = 'live'
  )
);

CREATE POLICY "Merchants can manage own product variants"
ON public.marketplace_product_variants FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.marketplace_products p
    JOIN public.marketplace_stores s ON s.id = p.store_id
    WHERE p.id = marketplace_product_variants.product_id
      AND s.merchant_user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all variants"
ON public.marketplace_product_variants FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. Trigger to increment sold_count when order status changes to 'delivered'
CREATE OR REPLACE FUNCTION public.increment_sold_count_on_delivery()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'delivered' THEN
    UPDATE marketplace_products mp
    SET sold_count = mp.sold_count + oi.quantity
    FROM marketplace_order_items oi
    WHERE oi.order_id = NEW.id AND oi.product_id = mp.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_increment_sold_count
AFTER UPDATE ON public.marketplace_orders
FOR EACH ROW EXECUTE FUNCTION public.increment_sold_count_on_delivery();

-- Index for flash sales lookup
CREATE INDEX idx_flash_sales_active ON public.marketplace_flash_sales (is_active, starts_at, ends_at);
CREATE INDEX idx_flash_sales_product ON public.marketplace_flash_sales (product_id);
CREATE INDEX idx_product_variants_product ON public.marketplace_product_variants (product_id, sort_order);
