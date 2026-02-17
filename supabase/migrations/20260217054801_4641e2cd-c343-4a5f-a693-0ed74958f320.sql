
-- Table to store temporary OAuth authorization codes
CREATE TABLE public.api_authorization_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  app_id UUID NOT NULL REFERENCES public.api_applications(id),
  user_id UUID NOT NULL,
  scopes JSONB NOT NULL DEFAULT '["balance", "charge"]'::jsonb,
  redirect_uri TEXT NOT NULL,
  state TEXT,
  is_used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '10 minutes')
);

-- Enable RLS
ALTER TABLE public.api_authorization_codes ENABLE ROW LEVEL SECURITY;

-- Users can insert codes for themselves (when they approve consent)
CREATE POLICY "Users can insert own codes"
ON public.api_authorization_codes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view own codes
CREATE POLICY "Users can view own codes"
ON public.api_authorization_codes
FOR SELECT
USING (auth.uid() = user_id);

-- Index for fast code lookup during exchange
CREATE INDEX idx_auth_codes_code ON public.api_authorization_codes(code);
CREATE INDEX idx_auth_codes_expires ON public.api_authorization_codes(expires_at);
