
-- ============================================================
-- MARKETPLACE MODULE — Phase 1: Database & Storage Foundation
-- ============================================================

-- 1. marketplace_stores
CREATE TABLE public.marketplace_stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_user_id uuid NOT NULL,
  branch_id uuid NOT NULL REFERENCES public.merchant_branches(id),
  store_name text NOT NULL,
  slug text UNIQUE NOT NULL,
  tagline text,
  description text,
  logo_url text,
  banner_url text,
  theme text NOT NULL DEFAULT 'classic',
  primary_color text NOT NULL DEFAULT '#FFD700',
  status text NOT NULL DEFAULT 'draft',
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  whatsapp text,
  email text,
  shipping_flat_rate numeric NOT NULL DEFAULT 0,
  free_shipping_min numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT marketplace_stores_theme_check CHECK (theme IN ('classic', 'bold', 'minimal')),
  CONSTRAINT marketplace_stores_status_check CHECK (status IN ('draft', 'live', 'paused'))
);

ALTER TABLE public.marketplace_stores ENABLE ROW LEVEL SECURITY;

-- 2. marketplace_categories
CREATE TABLE public.marketplace_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.marketplace_stores(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.marketplace_categories ENABLE ROW LEVEL SECURITY;

-- 3. marketplace_products
CREATE TABLE public.marketplace_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.marketplace_stores(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.marketplace_categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  price numeric NOT NULL DEFAULT 0,
  stock_quantity integer NOT NULL DEFAULT 0,
  sku text,
  weight_kg numeric,
  images jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  is_featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT marketplace_products_status_check CHECK (status IN ('active', 'draft', 'out_of_stock'))
);

ALTER TABLE public.marketplace_products ENABLE ROW LEVEL SECURITY;

-- 4. marketplace_orders
CREATE TABLE public.marketplace_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL,
  store_id uuid NOT NULL REFERENCES public.marketplace_stores(id),
  buyer_user_id uuid,
  buyer_name text NOT NULL,
  buyer_email text NOT NULL,
  buyer_phone text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  subtotal numeric NOT NULL DEFAULT 0,
  shipping_fee numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  platform_fee numeric NOT NULL DEFAULT 0,
  shipping_address text NOT NULL,
  tracking_number text,
  notes text,
  payment_method text NOT NULL DEFAULT 'online',
  payment_status text NOT NULL DEFAULT 'pending',
  transaction_id uuid,
  bill_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT marketplace_orders_status_check CHECK (status IN ('pending','confirmed','processing','shipped','delivered','completed','cancelled','refunded')),
  CONSTRAINT marketplace_orders_payment_method_check CHECK (payment_method IN ('nocap_wallet','online')),
  CONSTRAINT marketplace_orders_payment_status_check CHECK (payment_status IN ('pending','paid','failed'))
);

ALTER TABLE public.marketplace_orders ENABLE ROW LEVEL SECURITY;

-- 5. marketplace_order_items
CREATE TABLE public.marketplace_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.marketplace_orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.marketplace_products(id),
  product_name text NOT NULL,
  product_image text NOT NULL DEFAULT '',
  unit_price numeric NOT NULL DEFAULT 0,
  quantity integer NOT NULL DEFAULT 1,
  subtotal numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.marketplace_order_items ENABLE ROW LEVEL SECURITY;

-- 6. marketplace_store_managers
CREATE TABLE public.marketplace_store_managers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.marketplace_stores(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  invited_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT marketplace_store_managers_status_check CHECK (status IN ('pending','accepted','revoked')),
  UNIQUE(store_id, user_id)
);

ALTER TABLE public.marketplace_store_managers ENABLE ROW LEVEL SECURITY;

-- 7. marketplace_reviews
CREATE TABLE public.marketplace_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.marketplace_products(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.marketplace_orders(id) ON DELETE CASCADE,
  buyer_user_id uuid,
  rating integer NOT NULL,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT marketplace_reviews_rating_check CHECK (rating BETWEEN 1 AND 5)
);

ALTER TABLE public.marketplace_reviews ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- SECURITY DEFINER FUNCTION: is_store_manager
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_store_manager(_user_id uuid, _store_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.marketplace_store_managers
    WHERE user_id = _user_id
      AND store_id = _store_id
      AND status = 'accepted'
  )
$$;

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================
CREATE TRIGGER update_marketplace_stores_updated_at
  BEFORE UPDATE ON public.marketplace_stores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_marketplace_products_updated_at
  BEFORE UPDATE ON public.marketplace_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_marketplace_orders_updated_at
  BEFORE UPDATE ON public.marketplace_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- RLS POLICIES — marketplace_stores
-- ============================================================
CREATE POLICY "Public can view live stores"
  ON public.marketplace_stores FOR SELECT
  USING (status = 'live');

CREATE POLICY "Merchants can view own stores"
  ON public.marketplace_stores FOR SELECT
  USING (auth.uid() = merchant_user_id);

CREATE POLICY "Merchants can insert own stores"
  ON public.marketplace_stores FOR INSERT
  WITH CHECK (auth.uid() = merchant_user_id AND has_role(auth.uid(), 'merchant'::app_role));

CREATE POLICY "Merchants can update own stores"
  ON public.marketplace_stores FOR UPDATE
  USING (auth.uid() = merchant_user_id);

CREATE POLICY "Admins can manage all stores"
  ON public.marketplace_stores FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- RLS POLICIES — marketplace_categories
-- ============================================================
CREATE POLICY "Public can view categories for live stores"
  ON public.marketplace_categories FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.marketplace_stores s
    WHERE s.id = marketplace_categories.store_id AND s.status = 'live'
  ));

CREATE POLICY "Merchants can manage own categories"
  ON public.marketplace_categories FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.marketplace_stores s
    WHERE s.id = marketplace_categories.store_id AND s.merchant_user_id = auth.uid()
  ));

CREATE POLICY "Managers can view categories"
  ON public.marketplace_categories FOR SELECT
  USING (is_store_manager(auth.uid(), store_id));

CREATE POLICY "Admins can manage all categories"
  ON public.marketplace_categories FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- RLS POLICIES — marketplace_products
-- ============================================================
CREATE POLICY "Public can view active products in live stores"
  ON public.marketplace_products FOR SELECT
  USING (
    status = 'active' AND EXISTS (
      SELECT 1 FROM public.marketplace_stores s
      WHERE s.id = marketplace_products.store_id AND s.status = 'live'
    )
  );

CREATE POLICY "Merchants can manage own products"
  ON public.marketplace_products FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.marketplace_stores s
    WHERE s.id = marketplace_products.store_id AND s.merchant_user_id = auth.uid()
  ));

CREATE POLICY "Managers can view and update products"
  ON public.marketplace_products FOR SELECT
  USING (is_store_manager(auth.uid(), store_id));

CREATE POLICY "Managers can update product status"
  ON public.marketplace_products FOR UPDATE
  USING (is_store_manager(auth.uid(), store_id));

CREATE POLICY "Admins can manage all products"
  ON public.marketplace_products FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- RLS POLICIES — marketplace_orders
-- ============================================================
CREATE POLICY "Buyers can view own orders"
  ON public.marketplace_orders FOR SELECT
  USING (auth.uid() = buyer_user_id);

CREATE POLICY "Merchants can view orders for own stores"
  ON public.marketplace_orders FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.marketplace_stores s
    WHERE s.id = marketplace_orders.store_id AND s.merchant_user_id = auth.uid()
  ));

CREATE POLICY "Merchants can update orders for own stores"
  ON public.marketplace_orders FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.marketplace_stores s
    WHERE s.id = marketplace_orders.store_id AND s.merchant_user_id = auth.uid()
  ));

CREATE POLICY "Managers can view orders"
  ON public.marketplace_orders FOR SELECT
  USING (is_store_manager(auth.uid(), store_id));

CREATE POLICY "Managers can update order status"
  ON public.marketplace_orders FOR UPDATE
  USING (is_store_manager(auth.uid(), store_id));

CREATE POLICY "Admins can manage all orders"
  ON public.marketplace_orders FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- RLS POLICIES — marketplace_order_items
-- ============================================================
CREATE POLICY "Buyers can view own order items"
  ON public.marketplace_order_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.marketplace_orders o
    WHERE o.id = marketplace_order_items.order_id AND o.buyer_user_id = auth.uid()
  ));

CREATE POLICY "Merchants can view order items for own stores"
  ON public.marketplace_order_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.marketplace_orders o
    JOIN public.marketplace_stores s ON s.id = o.store_id
    WHERE o.id = marketplace_order_items.order_id AND s.merchant_user_id = auth.uid()
  ));

CREATE POLICY "Managers can view order items"
  ON public.marketplace_order_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.marketplace_orders o
    WHERE o.id = marketplace_order_items.order_id AND is_store_manager(auth.uid(), o.store_id)
  ));

CREATE POLICY "Admins can manage all order items"
  ON public.marketplace_order_items FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- RLS POLICIES — marketplace_store_managers
-- ============================================================
CREATE POLICY "Merchants can manage own store managers"
  ON public.marketplace_store_managers FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.marketplace_stores s
    WHERE s.id = marketplace_store_managers.store_id AND s.merchant_user_id = auth.uid()
  ));

CREATE POLICY "Managers can view own invitations"
  ON public.marketplace_store_managers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Managers can update own invitation status"
  ON public.marketplace_store_managers FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all managers"
  ON public.marketplace_store_managers FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- RLS POLICIES — marketplace_reviews
-- ============================================================
CREATE POLICY "Public can view reviews"
  ON public.marketplace_reviews FOR SELECT
  USING (true);

CREATE POLICY "Authenticated buyers can insert reviews"
  ON public.marketplace_reviews FOR INSERT
  WITH CHECK (auth.uid() = buyer_user_id);

CREATE POLICY "Admins can manage all reviews"
  ON public.marketplace_reviews FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- STORAGE BUCKET: marketplace-assets (public)
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('marketplace-assets', 'marketplace-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can view marketplace assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'marketplace-assets');

CREATE POLICY "Authenticated users can upload marketplace assets"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'marketplace-assets' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update own marketplace assets"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'marketplace-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own marketplace assets"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'marketplace-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX idx_marketplace_stores_slug ON public.marketplace_stores(slug);
CREATE INDEX idx_marketplace_stores_merchant ON public.marketplace_stores(merchant_user_id);
CREATE INDEX idx_marketplace_products_store ON public.marketplace_products(store_id);
CREATE INDEX idx_marketplace_products_status ON public.marketplace_products(status);
CREATE INDEX idx_marketplace_orders_store ON public.marketplace_orders(store_id);
CREATE INDEX idx_marketplace_orders_buyer ON public.marketplace_orders(buyer_user_id);
CREATE INDEX idx_marketplace_orders_bill ON public.marketplace_orders(bill_id);
CREATE INDEX idx_marketplace_orders_number ON public.marketplace_orders(order_number);
