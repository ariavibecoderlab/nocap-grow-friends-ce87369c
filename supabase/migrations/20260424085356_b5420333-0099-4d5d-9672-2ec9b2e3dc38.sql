-- Platform-wide webhook event toggle managed by admins
CREATE TABLE IF NOT EXISTS public.webhook_event_settings (
  event TEXT PRIMARY KEY,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.webhook_event_settings ENABLE ROW LEVEL SECURITY;

-- Admins manage; everyone authenticated can read (so merchants/UI can show status)
CREATE POLICY "Admins manage webhook event settings"
  ON public.webhook_event_settings FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Authenticated users can read webhook event settings"
  ON public.webhook_event_settings FOR SELECT
  TO authenticated
  USING (true);

-- Seed v1.4 catalog as enabled
INSERT INTO public.webhook_event_settings (event, description) VALUES
  ('charge.completed', 'Payment charge completed'),
  ('charge.failed', 'Payment charge failed'),
  ('charge.refunded', 'Charge refunded'),
  ('topup.completed', 'Wallet top-up completed'),
  ('topup.failed', 'Wallet top-up failed'),
  ('order.paid', 'Marketplace order paid'),
  ('order.shipped', 'Marketplace order shipped'),
  ('order.delivered', 'Marketplace order delivered'),
  ('order.cancelled', 'Marketplace order cancelled'),
  ('order.refunded', 'Marketplace order refunded'),
  ('payment_link.paid', 'Payment link completed'),
  ('payment_link.expired', 'Payment link expired'),
  ('inventory.reserved', 'Inventory reservation created'),
  ('inventory.released', 'Inventory reservation released')
ON CONFLICT (event) DO NOTHING;