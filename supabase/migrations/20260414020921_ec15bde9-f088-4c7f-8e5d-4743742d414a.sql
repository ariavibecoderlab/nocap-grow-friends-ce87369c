
-- 1. Collections
CREATE TABLE public.marketplace_collections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.marketplace_stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.marketplace_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all collections" ON public.marketplace_collections FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Merchants can manage own collections" ON public.marketplace_collections FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM marketplace_stores s WHERE s.id = marketplace_collections.store_id AND s.merchant_user_id = auth.uid()));
CREATE POLICY "Public can view active collections" ON public.marketplace_collections FOR SELECT TO public
  USING (is_active = true AND EXISTS (SELECT 1 FROM marketplace_stores s WHERE s.id = marketplace_collections.store_id AND s.status = 'live'));

-- 2. Collection items
CREATE TABLE public.marketplace_collection_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id UUID NOT NULL REFERENCES public.marketplace_collections(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.marketplace_products(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(collection_id, product_id)
);
ALTER TABLE public.marketplace_collection_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all collection items" ON public.marketplace_collection_items FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Merchants can manage own collection items" ON public.marketplace_collection_items FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM marketplace_collections c JOIN marketplace_stores s ON s.id = c.store_id
    WHERE c.id = marketplace_collection_items.collection_id AND s.merchant_user_id = auth.uid()
  ));
CREATE POLICY "Public can view active collection items" ON public.marketplace_collection_items FOR SELECT TO public
  USING (EXISTS (SELECT 1 FROM marketplace_collections c WHERE c.id = marketplace_collection_items.collection_id AND c.is_active = true));

-- 3. Gift cards
CREATE TABLE public.marketplace_gift_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.marketplace_stores(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE DEFAULT upper(substr(md5(random()::text), 1, 12)),
  initial_balance NUMERIC NOT NULL DEFAULT 0,
  current_balance NUMERIC NOT NULL DEFAULT 0,
  buyer_user_id UUID,
  recipient_email TEXT,
  recipient_name TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  purchased_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  redeemed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.marketplace_gift_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all gift cards" ON public.marketplace_gift_cards FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Merchants can manage own store gift cards" ON public.marketplace_gift_cards FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM marketplace_stores s WHERE s.id = marketplace_gift_cards.store_id AND s.merchant_user_id = auth.uid()));
CREATE POLICY "Buyers can view own gift cards" ON public.marketplace_gift_cards FOR SELECT TO authenticated
  USING (auth.uid() = buyer_user_id);

-- 4. Blog posts
CREATE TABLE public.marketplace_store_blog_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.marketplace_stores(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  featured_image TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE,
  seo JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(store_id, slug)
);
ALTER TABLE public.marketplace_store_blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all blog posts" ON public.marketplace_store_blog_posts FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Merchants can manage own blog posts" ON public.marketplace_store_blog_posts FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM marketplace_stores s WHERE s.id = marketplace_store_blog_posts.store_id AND s.merchant_user_id = auth.uid()));
CREATE POLICY "Public can view published blog posts" ON public.marketplace_store_blog_posts FOR SELECT TO public
  USING (is_published = true AND EXISTS (SELECT 1 FROM marketplace_stores s WHERE s.id = marketplace_store_blog_posts.store_id AND s.status = 'live'));

-- Triggers
CREATE TRIGGER update_collections_updated_at BEFORE UPDATE ON public.marketplace_collections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_gift_cards_updated_at BEFORE UPDATE ON public.marketplace_gift_cards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_blog_posts_updated_at BEFORE UPDATE ON public.marketplace_store_blog_posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
