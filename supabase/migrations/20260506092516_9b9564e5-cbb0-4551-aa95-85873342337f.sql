
-- Restrict public branch lookup to only safe QR-validation fields
DROP POLICY IF EXISTS "Anyone can lookup branch by QR" ON public.merchant_branches;

-- SECURITY DEFINER function returns only the fields needed for QR payment flow.
-- Hides: balance, commission_percent, owner_user_id, addresses, etc.
CREATE OR REPLACE FUNCTION public.lookup_branch_for_qr(p_lookup text)
RETURNS TABLE(
  id uuid,
  branch_name text,
  merchant_user_id uuid,
  is_active boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.id, b.branch_name, b.merchant_user_id, b.is_active
  FROM public.merchant_branches b
  WHERE b.is_active = true
    AND (
      b.id::text = p_lookup
      OR b.qr_code_id = p_lookup
    )
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_branch_for_qr(text) TO anon, authenticated;
