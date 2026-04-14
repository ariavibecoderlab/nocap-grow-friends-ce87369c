
-- Create marketplace_store_domains table
CREATE TABLE public.marketplace_store_domains (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.marketplace_stores(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  verification_status TEXT NOT NULL DEFAULT 'pending',
  verification_token TEXT NOT NULL DEFAULT encode(extensions.gen_random_bytes(16), 'hex'),
  verified_at TIMESTAMP WITH TIME ZONE,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  ssl_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(domain)
);

-- Enable RLS
ALTER TABLE public.marketplace_store_domains ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can manage all store domains"
  ON public.marketplace_store_domains FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Merchants can manage own store domains"
  ON public.marketplace_store_domains FOR ALL
  USING (EXISTS (
    SELECT 1 FROM marketplace_stores s
    WHERE s.id = marketplace_store_domains.store_id
      AND s.merchant_user_id = auth.uid()
  ));

CREATE POLICY "Public can view verified domains for live stores"
  ON public.marketplace_store_domains FOR SELECT
  USING (
    verification_status = 'verified'
    AND EXISTS (
      SELECT 1 FROM marketplace_stores s
      WHERE s.id = marketplace_store_domains.store_id
        AND s.status = 'live'
    )
  );

-- Add checkout_settings and announcement columns to marketplace_stores
ALTER TABLE public.marketplace_stores
  ADD COLUMN IF NOT EXISTS checkout_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS announcement JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Trigger for updated_at on domains
CREATE TRIGGER update_store_domains_updated_at
  BEFORE UPDATE ON public.marketplace_store_domains
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
