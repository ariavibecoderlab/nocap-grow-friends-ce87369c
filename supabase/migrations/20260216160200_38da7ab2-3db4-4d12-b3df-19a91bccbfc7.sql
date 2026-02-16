
-- Rate limit tracking table
CREATE TABLE public.rate_limit_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier text NOT NULL,
  endpoint text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for fast lookups by identifier + time window
CREATE INDEX idx_rate_limit_identifier_time ON public.rate_limit_requests (identifier, endpoint, created_at DESC);

-- Auto-cleanup: delete entries older than 1 hour
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  DELETE FROM public.rate_limit_requests WHERE created_at < now() - interval '1 hour';
$$;

-- Atomic rate limit check: returns true if request is allowed, false if rate limited
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier text,
  p_endpoint text,
  p_max_requests int DEFAULT 60,
  p_window_seconds int DEFAULT 60
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  request_count int;
  window_start timestamp with time zone;
BEGIN
  window_start := now() - (p_window_seconds || ' seconds')::interval;
  
  -- Count requests in current window
  SELECT count(*) INTO request_count
  FROM public.rate_limit_requests
  WHERE identifier = p_identifier
    AND endpoint = p_endpoint
    AND created_at >= window_start;
  
  -- If over limit, deny
  IF request_count >= p_max_requests THEN
    RETURN false;
  END IF;
  
  -- Record this request
  INSERT INTO public.rate_limit_requests (identifier, endpoint)
  VALUES (p_identifier, p_endpoint);
  
  -- Opportunistic cleanup (1% chance to avoid running every request)
  IF random() < 0.01 THEN
    PERFORM cleanup_rate_limits();
  END IF;
  
  RETURN true;
END;
$$;

-- Enable RLS but allow service role full access
ALTER TABLE public.rate_limit_requests ENABLE ROW LEVEL SECURITY;
