
-- 1. Abandoned Carts
CREATE TABLE public.marketplace_abandoned_carts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES marketplace_stores(id) ON DELETE CASCADE,
  buyer_user_id UUID,
  buyer_email TEXT,
  buyer_name TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  recovery_status TEXT NOT NULL DEFAULT 'abandoned',
  reminded_at TIMESTAMPTZ,
  recovered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.marketplace_abandoned_carts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all abandoned carts" ON public.marketplace_abandoned_carts FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Merchants can view own store abandoned carts" ON public.marketplace_abandoned_carts FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM marketplace_stores s WHERE s.id = store_id AND s.merchant_user_id = auth.uid()));
CREATE POLICY "Merchants can update own store abandoned carts" ON public.marketplace_abandoned_carts FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM marketplace_stores s WHERE s.id = store_id AND s.merchant_user_id = auth.uid()));
CREATE POLICY "Buyers can insert own abandoned carts" ON public.marketplace_abandoned_carts FOR INSERT TO authenticated WITH CHECK (auth.uid() = buyer_user_id);
CREATE POLICY "Buyers can view own abandoned carts" ON public.marketplace_abandoned_carts FOR SELECT TO authenticated USING (auth.uid() = buyer_user_id);
CREATE POLICY "Anon can insert abandoned carts" ON public.marketplace_abandoned_carts FOR INSERT TO anon WITH CHECK (buyer_user_id IS NULL);

-- 2. Product Bundles
CREATE TABLE public.marketplace_product_bundles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES marketplace_stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  bundle_price NUMERIC NOT NULL DEFAULT 0,
  compare_price NUMERIC NOT NULL DEFAULT 0,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.marketplace_product_bundles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all bundles" ON public.marketplace_product_bundles FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Merchants can manage own bundles" ON public.marketplace_product_bundles FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM marketplace_stores s WHERE s.id = store_id AND s.merchant_user_id = auth.uid()));
CREATE POLICY "Public can view active bundles" ON public.marketplace_product_bundles FOR SELECT TO public USING (is_active = true AND EXISTS (SELECT 1 FROM marketplace_stores s WHERE s.id = store_id AND s.status = 'live'));

-- 3. Bundle Items
CREATE TABLE public.marketplace_bundle_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bundle_id UUID NOT NULL REFERENCES marketplace_product_bundles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES marketplace_products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.marketplace_bundle_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all bundle items" ON public.marketplace_bundle_items FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Merchants can manage own bundle items" ON public.marketplace_bundle_items FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM marketplace_product_bundles b JOIN marketplace_stores s ON s.id = b.store_id WHERE b.id = bundle_id AND s.merchant_user_id = auth.uid()));
CREATE POLICY "Public can view active bundle items" ON public.marketplace_bundle_items FOR SELECT TO public USING (EXISTS (SELECT 1 FROM marketplace_product_bundles b WHERE b.id = bundle_id AND b.is_active = true));

-- 4. Discount Automation Rules
CREATE TABLE public.marketplace_discount_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES marketplace_stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  rule_type TEXT NOT NULL DEFAULT 'quantity_discount',
  conditions JSONB NOT NULL DEFAULT '{}'::jsonb,
  discount_type TEXT NOT NULL DEFAULT 'percentage',
  discount_value NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 0,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.marketplace_discount_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all discount rules" ON public.marketplace_discount_rules FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Merchants can manage own discount rules" ON public.marketplace_discount_rules FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM marketplace_stores s WHERE s.id = store_id AND s.merchant_user_id = auth.uid()));
CREATE POLICY "Public can view active discount rules" ON public.marketplace_discount_rules FOR SELECT TO public USING (is_active = true AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at > now()) AND EXISTS (SELECT 1 FROM marketplace_stores s WHERE s.id = store_id AND s.status = 'live'));

-- 5. Store CRM Customers
CREATE TABLE public.marketplace_store_customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES marketplace_stores(id) ON DELETE CASCADE,
  buyer_user_id UUID,
  buyer_name TEXT NOT NULL,
  buyer_email TEXT NOT NULL,
  buyer_phone TEXT,
  total_orders INTEGER NOT NULL DEFAULT 0,
  total_spent NUMERIC NOT NULL DEFAULT 0,
  last_order_at TIMESTAMPTZ,
  tags TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(store_id, buyer_email)
);

ALTER TABLE public.marketplace_store_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all store customers" ON public.marketplace_store_customers FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Merchants can manage own store customers" ON public.marketplace_store_customers FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM marketplace_stores s WHERE s.id = store_id AND s.merchant_user_id = auth.uid()));

-- Index for performance
CREATE INDEX idx_abandoned_carts_store ON marketplace_abandoned_carts(store_id);
CREATE INDEX idx_abandoned_carts_status ON marketplace_abandoned_carts(recovery_status);
CREATE INDEX idx_bundles_store ON marketplace_product_bundles(store_id);
CREATE INDEX idx_discount_rules_store ON marketplace_discount_rules(store_id);
CREATE INDEX idx_store_customers_store ON marketplace_store_customers(store_id);
CREATE INDEX idx_store_customers_email ON marketplace_store_customers(store_id, buyer_email);
