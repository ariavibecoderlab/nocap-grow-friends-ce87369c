
ALTER TABLE public.withdrawal_requests
ADD COLUMN IF NOT EXISTS settled_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS settlement_ref text;
