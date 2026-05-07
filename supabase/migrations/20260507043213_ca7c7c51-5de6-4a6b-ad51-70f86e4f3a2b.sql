CREATE TABLE IF NOT EXISTS public.mobile_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  device_id TEXT,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mobile_push_tokens_user_id ON public.mobile_push_tokens(user_id);

ALTER TABLE public.mobile_push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own push tokens"
  ON public.mobile_push_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own push tokens"
  ON public.mobile_push_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own push tokens"
  ON public.mobile_push_tokens FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own push tokens"
  ON public.mobile_push_tokens FOR DELETE
  USING (auth.uid() = user_id);