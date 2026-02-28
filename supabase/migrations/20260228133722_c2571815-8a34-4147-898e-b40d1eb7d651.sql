
CREATE OR REPLACE FUNCTION public.get_all_user_emails()
 RETURNS TABLE(user_id uuid, email text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT au.id AS user_id, au.email::text
  FROM auth.users au
  WHERE has_role(auth.uid(), 'admin'::app_role);
$$;
