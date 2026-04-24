-- Audit log for inventory reservation lifecycle
CREATE TABLE public.inventory_reservation_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reservation_id UUID NOT NULL,
  product_id UUID NOT NULL,
  variant_id UUID,
  app_id UUID NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('created','expired','released','consumed')),
  quantity INTEGER NOT NULL,
  reference TEXT,
  note TEXT,
  occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_inv_res_events_product ON public.inventory_reservation_events(product_id, occurred_at DESC);
CREATE INDEX idx_inv_res_events_app ON public.inventory_reservation_events(app_id, occurred_at DESC);
CREATE INDEX idx_inv_res_events_reservation ON public.inventory_reservation_events(reservation_id, occurred_at);

ALTER TABLE public.inventory_reservation_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all reservation events"
  ON public.inventory_reservation_events FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage all reservation events"
  ON public.inventory_reservation_events FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Merchants can view events for own products"
  ON public.inventory_reservation_events FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.marketplace_products p
    JOIN public.marketplace_stores s ON s.id = p.store_id
    WHERE p.id = inventory_reservation_events.product_id
      AND s.merchant_user_id = auth.uid()
  ));

-- Trigger function: log lifecycle changes
CREATE OR REPLACE FUNCTION public.log_inventory_reservation_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.inventory_reservation_events
      (reservation_id, product_id, variant_id, app_id, event_type, quantity, reference)
    VALUES
      (NEW.id, NEW.product_id, NEW.variant_id, NEW.app_id, 'created', NEW.quantity, NEW.reference);
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status IN ('expired','released','consumed') THEN
      INSERT INTO public.inventory_reservation_events
        (reservation_id, product_id, variant_id, app_id, event_type, quantity, reference)
      VALUES
        (NEW.id, NEW.product_id, NEW.variant_id, NEW.app_id, NEW.status, NEW.quantity, NEW.reference);
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_inventory_reservation_event ON public.inventory_reservations;
CREATE TRIGGER trg_log_inventory_reservation_event
  AFTER INSERT OR UPDATE ON public.inventory_reservations
  FOR EACH ROW EXECUTE FUNCTION public.log_inventory_reservation_event();