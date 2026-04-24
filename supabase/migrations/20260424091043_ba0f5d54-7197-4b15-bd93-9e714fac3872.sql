ALTER TABLE public.webhook_deliveries
  ADD COLUMN IF NOT EXISTS payload_hash text;

CREATE INDEX IF NOT EXISTS webhook_deliveries_payload_hash_idx
  ON public.webhook_deliveries (payload_hash);