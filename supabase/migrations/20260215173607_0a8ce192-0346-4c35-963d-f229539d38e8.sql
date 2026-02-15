
-- Merchant applications table
CREATE TABLE public.merchant_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  business_name TEXT NOT NULL,
  business_registration_no TEXT,
  business_type TEXT,
  business_address TEXT,
  bank_name TEXT,
  bank_account_no TEXT,
  bank_account_holder TEXT,
  bank_verified BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.merchant_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own applications"
  ON public.merchant_applications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own applications"
  ON public.merchant_applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pending applications"
  ON public.merchant_applications FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Admins can view all applications"
  ON public.merchant_applications FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update applications"
  ON public.merchant_applications FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

-- Merchant branches table
CREATE TABLE public.merchant_branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_user_id UUID NOT NULL,
  branch_name TEXT NOT NULL,
  branch_address TEXT,
  commission_percent NUMERIC NOT NULL DEFAULT 5.00,
  is_active BOOLEAN NOT NULL DEFAULT true,
  qr_code_id TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.merchant_branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants can view own branches"
  ON public.merchant_branches FOR SELECT
  USING (auth.uid() = merchant_user_id);

CREATE POLICY "Merchants can insert own branches"
  ON public.merchant_branches FOR INSERT
  WITH CHECK (auth.uid() = merchant_user_id AND has_role(auth.uid(), 'merchant'));

CREATE POLICY "Merchants can update own branches"
  ON public.merchant_branches FOR UPDATE
  USING (auth.uid() = merchant_user_id);

CREATE POLICY "Admins can view all branches"
  ON public.merchant_branches FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all branches"
  ON public.merchant_branches FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

-- Public read for QR scanning (anyone can look up a branch by qr_code_id)
CREATE POLICY "Anyone can lookup branch by QR"
  ON public.merchant_branches FOR SELECT
  USING (true);

-- Dynamic QR codes (pre-filled amount)
CREATE TABLE public.merchant_qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES public.merchant_branches(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  description TEXT,
  is_used BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.merchant_qr_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Branch owners can manage QR codes"
  ON public.merchant_qr_codes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.merchant_branches mb
      WHERE mb.id = branch_id AND mb.merchant_user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can lookup QR code"
  ON public.merchant_qr_codes FOR SELECT
  USING (true);

-- Triggers for updated_at
CREATE TRIGGER update_merchant_applications_updated_at
  BEFORE UPDATE ON public.merchant_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_merchant_branches_updated_at
  BEFORE UPDATE ON public.merchant_branches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
