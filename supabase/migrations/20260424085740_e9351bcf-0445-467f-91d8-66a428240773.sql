CREATE TABLE public.webhook_replay_idempotency (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id uuid NOT NULL REFERENCES public.api_applications(id) ON DELETE CASCADE,
  idempotency_key text NOT NULL,
  request_hash text NOT NULL,
  response_status integer NOT NULL,
  response_body jsonb NOT NULL,
  replay_id uuid,
  original_delivery_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  CONSTRAINT webhook_replay_idem_unique UNIQUE (app_id, idempotency_key)
);

CREATE INDEX idx_webhook_replay_idem_expires ON public.webhook_replay_idempotency(expires_at);

ALTER TABLE public.webhook_replay_idempotency ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all replay idempotency"
ON public.webhook_replay_idempotency
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Merchants can view own replay idempotency"
ON public.webhook_replay_idempotency
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM api_applications a
  WHERE a.id = webhook_replay_idempotency.app_id
    AND a.merchant_user_id = auth.uid()
));