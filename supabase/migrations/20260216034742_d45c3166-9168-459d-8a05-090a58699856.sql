
-- 1. Add 'branch' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'branch';

-- 2. Add owner_user_id and balance to merchant_branches
ALTER TABLE public.merchant_branches
  ADD COLUMN IF NOT EXISTS owner_user_id uuid DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS balance numeric NOT NULL DEFAULT 0.00;

-- 3. Add branch_id to withdrawal_requests (nullable, for branch withdrawals)
ALTER TABLE public.withdrawal_requests
  ADD COLUMN IF NOT EXISTS branch_id uuid DEFAULT NULL REFERENCES public.merchant_branches(id);

-- 4. RLS: Branch owners can view their own branches
CREATE POLICY "Branch owners can view own branches"
  ON public.merchant_branches
  FOR SELECT
  USING (auth.uid() = owner_user_id);

-- 5. Branch owners can update own branches (for QR management etc)
CREATE POLICY "Branch owners can update own branches"
  ON public.merchant_branches
  FOR UPDATE
  USING (auth.uid() = owner_user_id);

-- 6. Branch owners can manage QR codes for their branches
CREATE POLICY "Branch owners can manage own branch QR codes"
  ON public.merchant_qr_codes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM merchant_branches mb
      WHERE mb.id = merchant_qr_codes.branch_id
        AND mb.owner_user_id = auth.uid()
    )
  );

-- 7. Branch owners can view transactions related to their branch
-- Transactions have metadata with branch_id, but we also need a way to query
-- We'll handle this via edge functions / views

-- 8. Branch owners can insert withdrawal requests
-- Already covered by existing "Users can insert own withdrawal requests" policy

-- 9. Branch owners can view own withdrawal requests (already covered by existing policy)
