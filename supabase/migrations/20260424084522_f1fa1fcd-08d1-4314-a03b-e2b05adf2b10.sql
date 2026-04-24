ALTER TABLE public.webhook_deliveries
  ADD COLUMN IF NOT EXISTS replayed_from_id UUID;

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_replayed_from
  ON public.webhook_deliveries(replayed_from_id)
  WHERE replayed_from_id IS NOT NULL;