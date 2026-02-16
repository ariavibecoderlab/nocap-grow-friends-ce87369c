-- Add metadata column to api_charges for tracking refund totals
ALTER TABLE public.api_charges ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;
