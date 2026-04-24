-- Enforce that every webhook_deliveries row carries the signature used at first
-- dispatch, so replay can always verify integrity against it.
ALTER TABLE public.webhook_deliveries
  ALTER COLUMN signature SET NOT NULL;

ALTER TABLE public.webhook_deliveries
  DROP CONSTRAINT IF EXISTS webhook_deliveries_signature_nonempty;

ALTER TABLE public.webhook_deliveries
  ADD CONSTRAINT webhook_deliveries_signature_nonempty
  CHECK (length(signature) > 0);