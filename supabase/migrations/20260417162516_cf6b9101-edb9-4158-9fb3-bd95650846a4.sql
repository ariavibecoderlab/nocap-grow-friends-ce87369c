CREATE OR REPLACE FUNCTION public.list_distribution_audit(
  p_limit integer DEFAULT 25,
  p_offset integer DEFAULT 0,
  p_search text DEFAULT NULL,
  p_from timestamp with time zone DEFAULT NULL,
  p_to timestamp with time zone DEFAULT NULL
)
RETURNS TABLE(
  id uuid, created_at timestamp with time zone, amount numeric, sale_amount numeric,
  branch_id uuid, branch_name text, member_id uuid, member_name text, member_referral_code text,
  source text, status text, child_count bigint, child_total numeric, reconciled boolean,
  total_count bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  WITH base AS (
    SELECT t.id, t.created_at, t.amount, t.status::text AS status, t.metadata,
      (t.metadata->>'branch_id')::uuid AS branch_id,
      (t.metadata->>'member_id')::uuid AS member_id,
      COALESCE((t.metadata->>'sale_amount')::numeric, 0) AS sale_amount,
      COALESCE(t.metadata->>'source', 'unknown') AS source
    FROM transactions t
    WHERE t.type::text = 'distribution'
      AND has_role(auth.uid(), 'admin'::app_role)
      AND (p_from IS NULL OR t.created_at >= p_from)
      AND (p_to IS NULL OR t.created_at <= p_to)
  ), enriched AS (
    SELECT b.*, mb.branch_name, p.full_name AS member_name, p.referral_code AS member_referral_code,
      (SELECT COUNT(*) FROM transactions c WHERE c.reference_id = b.id) AS child_count,
      (SELECT COALESCE(SUM(c.amount), 0) FROM transactions c WHERE c.reference_id = b.id) AS child_total
    FROM base b
    LEFT JOIN merchant_branches mb ON mb.id = b.branch_id
    LEFT JOIN profiles p ON p.user_id = b.member_id
  ), filtered AS (
    SELECT * FROM enriched
    WHERE p_search IS NULL OR p_search = ''
       OR branch_name ILIKE '%' || p_search || '%'
       OR member_name ILIKE '%' || p_search || '%'
       OR member_referral_code ILIKE '%' || p_search || '%'
       OR id::text ILIKE '%' || p_search || '%'
  ), counted AS (
    SELECT COUNT(*) AS total_count FROM filtered
  )
  SELECT f.id, f.created_at, f.amount, f.sale_amount, f.branch_id, f.branch_name, f.member_id,
    f.member_name, f.member_referral_code, f.source, f.status, f.child_count, f.child_total,
    ABS(f.amount - f.child_total) < 0.001 AS reconciled,
    c.total_count
  FROM filtered f CROSS JOIN counted c
  ORDER BY f.created_at DESC
  LIMIT p_limit OFFSET p_offset;
$function$;