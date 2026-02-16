
-- ============================================
-- API Applications: third-party apps linked to merchants/branches
-- ============================================
CREATE TABLE public.api_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  api_key TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  api_secret_hash TEXT NOT NULL,
  merchant_user_id UUID NOT NULL,
  branch_id UUID NOT NULL REFERENCES public.merchant_branches(id),
  webhook_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.api_applications ENABLE ROW LEVEL SECURITY;

-- Merchants see own apps
CREATE POLICY "Merchants can view own apps"
  ON public.api_applications FOR SELECT
  TO authenticated
  USING (auth.uid() = merchant_user_id);

CREATE POLICY "Merchants can insert own apps"
  ON public.api_applications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = merchant_user_id AND public.has_role(auth.uid(), 'merchant'));

CREATE POLICY "Merchants can update own apps"
  ON public.api_applications FOR UPDATE
  TO authenticated
  USING (auth.uid() = merchant_user_id);

-- Admins full access
CREATE POLICY "Admins can manage all apps"
  ON public.api_applications FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Public read for authorization flow (active apps only, limited columns enforced in code)
CREATE POLICY "Anyone can lookup active apps by api_key"
  ON public.api_applications FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Trigger for updated_at
CREATE TRIGGER update_api_applications_updated_at
  BEFORE UPDATE ON public.api_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- API Access Tokens: member authorizations for apps
-- ============================================
CREATE TABLE public.api_access_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  app_id UUID NOT NULL REFERENCES public.api_applications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  access_token_hash TEXT NOT NULL,
  scopes JSONB NOT NULL DEFAULT '["balance","charge"]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '90 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_used_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.api_access_tokens ENABLE ROW LEVEL SECURITY;

-- Members see own tokens
CREATE POLICY "Members can view own tokens"
  ON public.api_access_tokens FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Members can insert own tokens"
  ON public.api_access_tokens FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Members can update own tokens"
  ON public.api_access_tokens FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Members can delete own tokens"
  ON public.api_access_tokens FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can view all
CREATE POLICY "Admins can view all tokens"
  ON public.api_access_tokens FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Merchants can view tokens for their apps
CREATE POLICY "Merchants can view tokens for own apps"
  ON public.api_access_tokens FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.api_applications a
    WHERE a.id = api_access_tokens.app_id AND a.merchant_user_id = auth.uid()
  ));

-- ============================================
-- API Charges: payment requests from third-party apps
-- ============================================
CREATE TABLE public.api_charges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  app_id UUID NOT NULL REFERENCES public.api_applications(id),
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT,
  reference TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  transaction_id UUID REFERENCES public.transactions(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.api_charges ENABLE ROW LEVEL SECURITY;

-- Members see own charges
CREATE POLICY "Members can view own charges"
  ON public.api_charges FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Merchants see charges for their apps
CREATE POLICY "Merchants can view charges for own apps"
  ON public.api_charges FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.api_applications a
    WHERE a.id = api_charges.app_id AND a.merchant_user_id = auth.uid()
  ));

-- Admins can view all
CREATE POLICY "Admins can view all charges"
  ON public.api_charges FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Index for fast lookups
CREATE INDEX idx_api_applications_api_key ON public.api_applications(api_key);
CREATE INDEX idx_api_access_tokens_app_user ON public.api_access_tokens(app_id, user_id);
CREATE INDEX idx_api_charges_app_id ON public.api_charges(app_id);
CREATE INDEX idx_api_charges_user_id ON public.api_charges(user_id);
