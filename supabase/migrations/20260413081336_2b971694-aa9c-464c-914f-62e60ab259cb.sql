
-- Product views tracking for store analytics
CREATE TABLE public.marketplace_product_views (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.marketplace_products(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.marketplace_stores(id) ON DELETE CASCADE,
  user_id uuid,
  viewed_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_views_store ON public.marketplace_product_views(store_id);
CREATE INDEX idx_product_views_product ON public.marketplace_product_views(product_id);
CREATE INDEX idx_product_views_date ON public.marketplace_product_views(viewed_at);

ALTER TABLE public.marketplace_product_views ENABLE ROW LEVEL SECURITY;

-- Anyone can insert a view (anonymous browsing)
CREATE POLICY "Anyone can insert product views"
  ON public.marketplace_product_views FOR INSERT
  TO public
  WITH CHECK (true);

-- Merchants can view analytics for own stores
CREATE POLICY "Merchants can view own store product views"
  ON public.marketplace_product_views FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.marketplace_stores s
      WHERE s.id = marketplace_product_views.store_id
        AND s.merchant_user_id = auth.uid()
    )
  );

-- Admins can view all
CREATE POLICY "Admins can view all product views"
  ON public.marketplace_product_views FOR ALL
  TO public
  USING (has_role(auth.uid(), 'admin'::app_role));
