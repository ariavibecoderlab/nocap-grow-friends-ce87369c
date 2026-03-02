
CREATE OR REPLACE FUNCTION public.get_referral_tier_counts(p_user_id uuid)
RETURNS TABLE(tier integer, count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT rt.tier, COUNT(*) as count
  FROM public.referral_tree rt
  WHERE rt.ancestor_id = p_user_id
  GROUP BY rt.tier
  ORDER BY rt.tier;
$$;
