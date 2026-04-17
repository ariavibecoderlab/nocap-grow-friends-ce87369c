
-- Distribution Audit RPC: returns the full trace for a single distribution transaction.
CREATE OR REPLACE FUNCTION public.get_distribution_trace(p_distribution_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dist record;
  v_branch_id uuid;
  v_branch record;
  v_member_id uuid;
  v_member record;
  v_sale_amount numeric;
  v_children jsonb;
  v_total_credited numeric := 0;
  v_cashback_total numeric := 0;
  v_commission_total numeric := 0;
  v_commission_pool numeric;
  v_expected_share numeric;
  v_result jsonb;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin role required';
  END IF;

  -- Parent distribution row
  SELECT id, user_id, type::text, amount, status::text, description, metadata, created_at, idempotency_key
    INTO v_dist
  FROM transactions
  WHERE id = p_distribution_id;

  IF v_dist IS NULL THEN
    RAISE EXCEPTION 'Distribution not found';
  END IF;

  v_branch_id := (v_dist.metadata->>'branch_id')::uuid;
  v_member_id := (v_dist.metadata->>'member_id')::uuid;
  v_sale_amount := COALESCE((v_dist.metadata->>'sale_amount')::numeric, 0);

  -- Branch + member lookups (best-effort)
  SELECT b.id, b.branch_name, b.commission_percent, b.merchant_user_id, b.owner_user_id, b.balance
    INTO v_branch
  FROM merchant_branches b WHERE b.id = v_branch_id;

  SELECT p.user_id, p.full_name, p.referral_code, au.email::text AS email
    INTO v_member
  FROM profiles p
  LEFT JOIN auth.users au ON au.id = p.user_id
  WHERE p.user_id = v_member_id;

  -- Children (cashback + commissions tied to this distribution)
  SELECT COALESCE(jsonb_agg(child ORDER BY (child->>'tier')::int NULLS FIRST, child->>'created_at'), '[]'::jsonb),
         COALESCE(SUM((child->>'amount')::numeric), 0),
         COALESCE(SUM((child->>'amount')::numeric) FILTER (WHERE child->>'type' = 'cashback'), 0),
         COALESCE(SUM((child->>'amount')::numeric) FILTER (WHERE child->>'type' = 'commission'), 0)
    INTO v_children, v_total_credited, v_cashback_total, v_commission_total
  FROM (
    SELECT jsonb_build_object(
      'id', t.id,
      'type', t.type::text,
      'amount', t.amount,
      'tier', (t.metadata->>'tier')::int,
      'recipient_user_id', t.user_id,
      'recipient_name', p.full_name,
      'recipient_email', au.email::text,
      'recipient_referral_code', p.referral_code,
      'description', t.description,
      'created_at', t.created_at,
      'status', t.status::text
    ) AS child
    FROM transactions t
    LEFT JOIN profiles p ON p.user_id = t.user_id
    LEFT JOIN auth.users au ON au.id = t.user_id
    WHERE t.reference_id = p_distribution_id
  ) sub;

  -- Expected math
  v_commission_pool := ROUND(v_sale_amount * COALESCE(v_branch.commission_percent, 0) / 100, 2);
  v_expected_share := CASE WHEN v_commission_pool > 0
                           THEN GREATEST(0.01, ROUND(v_commission_pool / 6, 2))
                           ELSE 0 END;

  -- Referral chain (up to 5 ancestors of the member)
  WITH chain AS (
    SELECT rt.tier, rt.ancestor_id, p.full_name, p.referral_code, au.email::text AS email
    FROM referral_tree rt
    LEFT JOIN profiles p ON p.user_id = rt.ancestor_id
    LEFT JOIN auth.users au ON au.id = rt.ancestor_id
    WHERE rt.user_id = v_member_id AND rt.tier BETWEEN 1 AND 5
    ORDER BY rt.tier
    LIMIT 5
  )
  SELECT jsonb_build_object(
    'distribution', jsonb_build_object(
      'id', v_dist.id,
      'amount', v_dist.amount,
      'status', v_dist.status,
      'description', v_dist.description,
      'created_at', v_dist.created_at,
      'idempotency_key', v_dist.idempotency_key,
      'recipient_user_id', v_dist.user_id,
      'metadata', v_dist.metadata
    ),
    'sale', jsonb_build_object(
      'sale_amount', v_sale_amount,
      'commission_percent', COALESCE(v_branch.commission_percent, 0),
      'commission_pool_expected', v_commission_pool,
      'expected_share_per_slot', v_expected_share
    ),
    'branch', CASE WHEN v_branch IS NULL THEN NULL ELSE jsonb_build_object(
      'id', v_branch.id,
      'branch_name', v_branch.branch_name,
      'commission_percent', v_branch.commission_percent,
      'merchant_user_id', v_branch.merchant_user_id,
      'owner_user_id', v_branch.owner_user_id,
      'balance', v_branch.balance
    ) END,
    'member', CASE WHEN v_member IS NULL THEN NULL ELSE jsonb_build_object(
      'user_id', v_member.user_id,
      'full_name', v_member.full_name,
      'referral_code', v_member.referral_code,
      'email', v_member.email
    ) END,
    'referral_chain', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'tier', tier, 'ancestor_id', ancestor_id, 'full_name', full_name,
      'referral_code', referral_code, 'email', email
    )) FROM chain), '[]'::jsonb),
    'children', v_children,
    'totals', jsonb_build_object(
      'cashback_credited', v_cashback_total,
      'commission_credited', v_commission_total,
      'total_credited', v_total_credited,
      'distribution_amount', v_dist.amount,
      'unallocated', GREATEST(v_commission_pool - v_total_credited, 0),
      'reconciled', ABS(v_dist.amount - v_total_credited) < 0.001
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- List recent distributions for the audit table
CREATE OR REPLACE FUNCTION public.list_distribution_audit(
  p_limit int DEFAULT 50,
  p_search text DEFAULT NULL,
  p_from timestamptz DEFAULT NULL,
  p_to timestamptz DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  created_at timestamptz,
  amount numeric,
  sale_amount numeric,
  branch_id uuid,
  branch_name text,
  member_id uuid,
  member_name text,
  member_referral_code text,
  source text,
  status text,
  child_count bigint,
  child_total numeric,
  reconciled boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
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
  )
  SELECT id, created_at, amount, sale_amount, branch_id, branch_name, member_id,
    member_name, member_referral_code, source, status, child_count, child_total,
    ABS(amount - child_total) < 0.001 AS reconciled
  FROM enriched
  WHERE p_search IS NULL OR p_search = ''
     OR branch_name ILIKE '%' || p_search || '%'
     OR member_name ILIKE '%' || p_search || '%'
     OR member_referral_code ILIKE '%' || p_search || '%'
     OR id::text ILIKE '%' || p_search || '%'
  ORDER BY created_at DESC
  LIMIT p_limit;
$$;
