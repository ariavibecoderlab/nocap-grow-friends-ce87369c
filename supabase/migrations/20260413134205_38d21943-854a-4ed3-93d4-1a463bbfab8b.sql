
-- Add page_layout and seo columns to marketplace_stores
ALTER TABLE public.marketplace_stores
  ADD COLUMN IF NOT EXISTS page_layout jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS seo jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Create marketplace_store_pages table
CREATE TABLE public.marketplace_store_pages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id uuid NOT NULL REFERENCES public.marketplace_stores(id) ON DELETE CASCADE,
  title text NOT NULL,
  slug text NOT NULL,
  content text NOT NULL DEFAULT '',
  seo jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_published boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(store_id, slug)
);

ALTER TABLE public.marketplace_store_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view published pages for live stores"
  ON public.marketplace_store_pages FOR SELECT
  USING (is_published = true AND EXISTS (
    SELECT 1 FROM marketplace_stores s WHERE s.id = store_id AND s.status = 'live'
  ));

CREATE POLICY "Merchants can manage own store pages"
  ON public.marketplace_store_pages FOR ALL
  USING (EXISTS (
    SELECT 1 FROM marketplace_stores s WHERE s.id = store_id AND s.merchant_user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage all store pages"
  ON public.marketplace_store_pages FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_store_pages_updated_at
  BEFORE UPDATE ON public.marketplace_store_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create marketplace_store_menus table
CREATE TABLE public.marketplace_store_menus (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id uuid NOT NULL REFERENCES public.marketplace_stores(id) ON DELETE CASCADE,
  label text NOT NULL,
  url text NOT NULL,
  position text NOT NULL DEFAULT 'header',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.marketplace_store_menus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view menus for live stores"
  ON public.marketplace_store_menus FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM marketplace_stores s WHERE s.id = store_id AND s.status = 'live'
  ));

CREATE POLICY "Merchants can manage own store menus"
  ON public.marketplace_store_menus FOR ALL
  USING (EXISTS (
    SELECT 1 FROM marketplace_stores s WHERE s.id = store_id AND s.merchant_user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage all store menus"
  ON public.marketplace_store_menus FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));
