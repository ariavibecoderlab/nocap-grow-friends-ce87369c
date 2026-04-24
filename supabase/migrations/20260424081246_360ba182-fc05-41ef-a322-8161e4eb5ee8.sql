-- =========================================================================
-- v1.4 ADDITIVE CHANGES — no modifications to existing tables/columns/RLS
-- =========================================================================

-- 1. Add optional columns to api_applications
ALTER TABLE public.api_applications
  ADD COLUMN IF NOT EXISTS scopes jsonb NOT NULL DEFAULT '["read","charge"]'::jsonb,
  ADD COLUMN IF NOT EXISTS webhook_subscriptions jsonb DEFAULT NULL;

COMMENT ON COLUMN public.api_applications.scopes IS
  'v1.4: List of permission scopes the app is allowed to use. Defaults preserve v1.3 behavior.';
COMMENT ON COLUMN public.api_applications.webhook_subscriptions IS
  'v1.4: List of webhook event names this app subscribes to. NULL = receive all (v1.3 behavior).';

-- =========================================================================
-- 2. payment_links — hosted checkout links
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.payment_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id uuid NOT NULL REFERENCES public.api_applications(id) ON DELETE CASCADE,
  merchant_user_id uuid NOT NULL,
  branch_id uuid REFERENCES public.merchant_branches(id) ON DELETE SET NULL,
  order_id uuid REFERENCES public.marketplace_orders(id) ON DELETE SET NULL,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'MYR',
  description text,
  status text NOT NULL DEFAULT 'active',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  paid_at timestamptz,
  transaction_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_links_app_id ON public.payment_links(app_id);
CREATE INDEX IF NOT EXISTS idx_payment_links_merchant ON public.payment_links(merchant_user_id);
CREATE INDEX IF NOT EXISTS idx_payment_links_status ON public.payment_links(status);
CREATE INDEX IF NOT EXISTS idx_payment_links_expires ON public.payment_links(expires_at);

ALTER TABLE public.payment_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active payment links by id"
  ON public.payment_links
  FOR SELECT
  TO anon, authenticated
  USING (status = 'active' AND expires_at > now());

CREATE POLICY "Merchants can view own payment links"
  ON public.payment_links
  FOR SELECT
  TO authenticated
  USING (auth.uid() = merchant_user_id);

CREATE POLICY "Merchants can update own payment links"
  ON public.payment_links
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = merchant_user_id);

CREATE POLICY "Admins can manage all payment links"
  ON public.payment_links
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_payment_links_updated_at
  BEFORE UPDATE ON public.payment_links
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- 3. inventory_reservations — soft holds for AI-assisted checkout
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.inventory_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id uuid NOT NULL REFERENCES public.api_applications(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.marketplace_products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES public.marketplace_product_variants(id) ON DELETE CASCADE,
  quantity integer NOT NULL CHECK (quantity > 0),
  reference text,
  status text NOT NULL DEFAULT 'active',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  released_at timestamptz,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_reservations_app ON public.inventory_reservations(app_id);
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_product ON public.inventory_reservations(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_variant ON public.inventory_reservations(variant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_active ON public.inventory_reservations(status, expires_at);

ALTER TABLE public.inventory_reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants can view reservations for own products"
  ON public.inventory_reservations
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.marketplace_products p
    JOIN public.marketplace_stores s ON s.id = p.store_id
    WHERE p.id = inventory_reservations.product_id
      AND s.merchant_user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage all reservations"
  ON public.inventory_reservations
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- =========================================================================
-- 4. webhook_deliveries — log of outbound webhook attempts
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id uuid NOT NULL REFERENCES public.api_applications(id) ON DELETE CASCADE,
  event text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  target_url text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  status_code integer,
  attempt_count integer NOT NULL DEFAULT 0,
  last_error text,
  signature text,
  delivered_at timestamptz,
  next_retry_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_app ON public.webhook_deliveries(app_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_event ON public.webhook_deliveries(event);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON public.webhook_deliveries(status, next_retry_at);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_created ON public.webhook_deliveries(created_at DESC);

ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants can view own webhook deliveries"
  ON public.webhook_deliveries
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.api_applications a
    WHERE a.id = webhook_deliveries.app_id
      AND a.merchant_user_id = auth.uid()
  ));

CREATE POLICY "Admins can view all webhook deliveries"
  ON public.webhook_deliveries
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));