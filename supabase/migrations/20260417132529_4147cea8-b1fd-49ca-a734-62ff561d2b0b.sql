-- Add draft columns to marketplace_stores
ALTER TABLE public.marketplace_stores
  ADD COLUMN IF NOT EXISTS draft_layout JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS draft_theme JSONB,
  ADD COLUMN IF NOT EXISTS draft_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

-- Preview tokens table for secure draft preview
CREATE TABLE IF NOT EXISTS public.marketplace_store_preview_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.marketplace_stores(id) ON DELETE CASCADE,
  merchant_user_id UUID NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '10 minutes'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_preview_tokens_hash ON public.marketplace_store_preview_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_preview_tokens_expires ON public.marketplace_store_preview_tokens(expires_at);

ALTER TABLE public.marketplace_store_preview_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants can manage own preview tokens"
ON public.marketplace_store_preview_tokens
FOR ALL
TO authenticated
USING (auth.uid() = merchant_user_id)
WITH CHECK (auth.uid() = merchant_user_id);

CREATE POLICY "Admins can manage all preview tokens"
ON public.marketplace_store_preview_tokens
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- RPC to fetch draft store data using a preview token (publicly callable, validates token internally)
CREATE OR REPLACE FUNCTION public.get_store_draft(p_store_id UUID, p_token TEXT)
RETURNS TABLE(
  store_id UUID,
  draft_layout JSONB,
  draft_theme JSONB,
  store_name TEXT,
  slug TEXT,
  logo_url TEXT,
  banner_url TEXT,
  description TEXT,
  theme_id TEXT,
  theme_overrides JSONB
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_token_hash TEXT;
  v_valid BOOLEAN;
BEGIN
  v_token_hash := encode(extensions.digest(p_token, 'sha256'), 'hex');

  SELECT EXISTS (
    SELECT 1 FROM public.marketplace_store_preview_tokens
    WHERE store_id = p_store_id
      AND token_hash = v_token_hash
      AND expires_at > now()
  ) INTO v_valid;

  IF NOT v_valid THEN
    RAISE EXCEPTION 'Invalid or expired preview token';
  END IF;

  RETURN QUERY
  SELECT
    s.id AS store_id,
    s.draft_layout,
    s.draft_theme,
    s.store_name,
    s.slug,
    s.logo_url,
    s.banner_url,
    s.description,
    COALESCE((s.theme_overrides->>'theme_id')::text, 'classic') AS theme_id,
    s.theme_overrides
  FROM public.marketplace_stores s
  WHERE s.id = p_store_id;
END;
$$;

-- Cleanup expired preview tokens
CREATE OR REPLACE FUNCTION public.cleanup_preview_tokens()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  DELETE FROM public.marketplace_store_preview_tokens WHERE expires_at < now();
$$;