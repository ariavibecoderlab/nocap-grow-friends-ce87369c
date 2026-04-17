CREATE OR REPLACE FUNCTION public.get_store_draft(p_store_id uuid, p_token text)
 RETURNS TABLE(store_id uuid, draft_layout jsonb, draft_theme jsonb, store_name text, slug text, logo_url text, banner_url text, description text, theme_id text, theme_overrides jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    COALESCE(s.theme, 'classic') AS theme_id,
    COALESCE((s.settings->'theme_overrides')::jsonb, '{}'::jsonb) AS theme_overrides
  FROM public.marketplace_stores s
  WHERE s.id = p_store_id;
END;
$function$;