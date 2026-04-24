ALTER TABLE public.webhook_deliveries
  ADD COLUMN IF NOT EXISTS secret_hash_fingerprint text;

CREATE INDEX IF NOT EXISTS webhook_deliveries_secret_fp_idx
  ON public.webhook_deliveries (secret_hash_fingerprint);

COMMENT ON COLUMN public.webhook_deliveries.secret_hash_fingerprint IS
  'SHA-256 hex digest of the api_secret_hash used to sign this delivery. Used by replay to detect secret rotation and refuse re-dispatch with a 409 instead of emitting an unverifiable signature.';