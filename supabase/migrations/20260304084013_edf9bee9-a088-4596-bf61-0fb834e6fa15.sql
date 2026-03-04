
CREATE OR REPLACE FUNCTION public.get_deep_network_count(p_user_id uuid)
RETURNS TABLE(total_descendants bigint, tier5_count bigint, beyond_tier5 bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  WITH RECURSIVE descendant_chain AS (
    -- Direct referrals (depth 1)
    SELECT p.user_id, 1 AS depth
    FROM profiles p
    WHERE p.referred_by = (SELECT id FROM profiles WHERE user_id = p_user_id)
    
    UNION ALL
    
    -- Deeper levels
    SELECT p.user_id, dc.depth + 1
    FROM profiles p
    JOIN descendant_chain dc ON p.referred_by = (SELECT id FROM profiles WHERE user_id = dc.user_id)
    WHERE dc.depth < 20  -- safety cap
  ),
  total AS (
    SELECT COUNT(*) AS total_desc FROM descendant_chain
  ),
  in_tree AS (
    SELECT COUNT(*) AS tree_count FROM referral_tree WHERE ancestor_id = p_user_id
  )
  SELECT 
    total.total_desc AS total_descendants,
    in_tree.tree_count AS tier5_count,
    GREATEST(total.total_desc - in_tree.tree_count, 0) AS beyond_tier5
  FROM total, in_tree;
$$;
