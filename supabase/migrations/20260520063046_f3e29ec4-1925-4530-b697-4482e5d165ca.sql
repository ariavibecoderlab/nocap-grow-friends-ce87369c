
CREATE OR REPLACE FUNCTION public.get_connected_app_names(p_app_ids uuid[])
RETURNS TABLE(id uuid, name text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.id, a.name
  FROM public.api_applications a
  WHERE a.id = ANY(p_app_ids)
    AND a.is_active = true
    AND EXISTS (
      SELECT 1 FROM public.api_access_tokens t
      WHERE t.app_id = a.id AND t.user_id = auth.uid()
    );
$$;

REVOKE ALL ON FUNCTION public.get_connected_app_names(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_connected_app_names(uuid[]) TO authenticated;
