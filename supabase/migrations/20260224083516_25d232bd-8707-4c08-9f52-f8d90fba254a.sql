
CREATE OR REPLACE FUNCTION public.get_referral_emails(referral_user_ids uuid[])
RETURNS TABLE(user_id uuid, email text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT au.id AS user_id, au.email::text
  FROM auth.users au
  WHERE au.id = ANY(referral_user_ids)
    AND EXISTS (
      SELECT 1 FROM public.referral_tree rt
      WHERE rt.user_id = au.id
        AND rt.ancestor_id = auth.uid()
        AND rt.tier = 1
    );
$$;
