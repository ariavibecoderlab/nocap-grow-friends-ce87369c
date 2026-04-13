
-- 1. Order Status History table
CREATE TABLE public.marketplace_order_status_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.marketplace_orders(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.marketplace_order_status_history ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_order_status_history_order ON public.marketplace_order_status_history(order_id);

-- Buyers can view history for own orders
CREATE POLICY "Buyers can view own order history"
ON public.marketplace_order_status_history
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM marketplace_orders o
  WHERE o.id = marketplace_order_status_history.order_id
    AND o.buyer_user_id = auth.uid()
));

-- Merchants can view history for own store orders
CREATE POLICY "Merchants can view store order history"
ON public.marketplace_order_status_history
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM marketplace_orders o
  JOIN marketplace_stores s ON s.id = o.store_id
  WHERE o.id = marketplace_order_status_history.order_id
    AND s.merchant_user_id = auth.uid()
));

-- Admins full access
CREATE POLICY "Admins can manage all order history"
ON public.marketplace_order_status_history
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Auto-log status changes via trigger
CREATE OR REPLACE FUNCTION public.log_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO marketplace_order_status_history (order_id, old_status, new_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_order_status
AFTER UPDATE ON public.marketplace_orders
FOR EACH ROW
EXECUTE FUNCTION public.log_order_status_change();

-- 2. Review images column
ALTER TABLE public.marketplace_reviews
ADD COLUMN review_images JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 3. Saved Addresses table
CREATE TABLE public.user_addresses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  label TEXT NOT NULL DEFAULT 'Home',
  recipient_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address_line TEXT NOT NULL,
  city TEXT,
  state TEXT,
  postcode TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_user_addresses_user ON public.user_addresses(user_id);

CREATE POLICY "Users can view own addresses"
ON public.user_addresses FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own addresses"
ON public.user_addresses FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own addresses"
ON public.user_addresses FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own addresses"
ON public.user_addresses FOR DELETE
USING (auth.uid() = user_id);

-- Trigger to ensure only one default address per user
CREATE OR REPLACE FUNCTION public.ensure_single_default_address()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE user_addresses
    SET is_default = false
    WHERE user_id = NEW.user_id AND id != NEW.id AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_single_default_address
BEFORE INSERT OR UPDATE ON public.user_addresses
FOR EACH ROW
EXECUTE FUNCTION public.ensure_single_default_address();
