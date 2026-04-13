
-- Marketplace banners for promotional carousel
CREATE TABLE public.marketplace_banners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID REFERENCES public.marketplace_stores(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  link_url TEXT,
  title TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.marketplace_banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active banners for live stores"
ON public.marketplace_banners FOR SELECT
USING (
  is_active = true AND (
    store_id IS NULL OR EXISTS (
      SELECT 1 FROM marketplace_stores s WHERE s.id = marketplace_banners.store_id AND s.status = 'live'
    )
  )
);

CREATE POLICY "Merchants can manage own banners"
ON public.marketplace_banners FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM marketplace_stores s
    WHERE s.id = marketplace_banners.store_id AND s.merchant_user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all banners"
ON public.marketplace_banners FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Product Q&A
CREATE TABLE public.marketplace_product_qa (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.marketplace_products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  question TEXT NOT NULL,
  answer TEXT,
  answered_by UUID,
  answered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.marketplace_product_qa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view Q&A for active products"
ON public.marketplace_product_qa FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can post questions"
ON public.marketplace_product_qa FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Merchants can answer questions on own products"
ON public.marketplace_product_qa FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM marketplace_products p
    JOIN marketplace_stores s ON s.id = p.store_id
    WHERE p.id = marketplace_product_qa.product_id AND s.merchant_user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all Q&A"
ON public.marketplace_product_qa FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Store follows
CREATE TABLE public.marketplace_store_follows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.marketplace_stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(store_id, user_id)
);

ALTER TABLE public.marketplace_store_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can follow stores"
ON public.marketplace_store_follows FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unfollow stores"
ON public.marketplace_store_follows FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can view own follows"
ON public.marketplace_store_follows FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Public can count followers"
ON public.marketplace_store_follows FOR SELECT
USING (true);
