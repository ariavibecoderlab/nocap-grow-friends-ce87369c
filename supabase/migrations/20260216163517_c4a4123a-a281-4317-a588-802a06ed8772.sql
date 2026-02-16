
-- Create API request logs table
CREATE TABLE public.api_request_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  app_id uuid NOT NULL,
  endpoint text NOT NULL,
  method text NOT NULL DEFAULT 'POST',
  status_code integer NOT NULL,
  request_body jsonb DEFAULT '{}'::jsonb,
  response_body jsonb DEFAULT '{}'::jsonb,
  user_id uuid,
  ip_address text,
  duration_ms integer,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.api_request_logs ENABLE ROW LEVEL SECURITY;

-- Merchants can view logs for their own apps
CREATE POLICY "Merchants can view logs for own apps"
ON public.api_request_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM api_applications a
    WHERE a.id = api_request_logs.app_id
    AND a.merchant_user_id = auth.uid()
  )
);

-- Admins can view all logs
CREATE POLICY "Admins can view all logs"
ON public.api_request_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Index for fast lookups
CREATE INDEX idx_api_request_logs_app_id ON public.api_request_logs (app_id, created_at DESC);

-- Auto-cleanup old logs (keep 30 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_api_logs()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  DELETE FROM public.api_request_logs WHERE created_at < now() - interval '30 days';
$$;
