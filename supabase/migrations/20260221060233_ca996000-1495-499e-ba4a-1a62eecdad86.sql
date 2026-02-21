
CREATE OR REPLACE FUNCTION public.notify_order_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  merchant_uid UUID;
  store_name_val TEXT;
  status_label TEXT;
  buyer_msg TEXT;
  merchant_msg TEXT;
BEGIN
  -- Only fire when status actually changes
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get store info
  SELECT s.merchant_user_id, s.store_name
  INTO merchant_uid, store_name_val
  FROM marketplace_stores s
  WHERE s.id = NEW.store_id;

  status_label := initcap(NEW.status);

  -- Notify buyer
  IF NEW.buyer_user_id IS NOT NULL THEN
    buyer_msg := 'Your order #' || NEW.order_number || ' from ' || store_name_val || ' is now ' || status_label;
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (
      NEW.buyer_user_id,
      'Order ' || status_label,
      buyer_msg,
      CASE NEW.status
        WHEN 'confirmed' THEN 'success'
        WHEN 'shipped' THEN 'info'
        WHEN 'delivered' THEN 'success'
        WHEN 'cancelled' THEN 'error'
        ELSE 'info'
      END,
      '/my-orders'
    );
  END IF;

  -- Notify merchant (skip if merchant initiated the change — they already know)
  -- We still notify so they have a log; merchants can mark read
  IF merchant_uid IS NOT NULL THEN
    merchant_msg := 'Order #' || NEW.order_number || ' status changed to ' || status_label;
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (
      merchant_uid,
      'Order ' || status_label || ' — #' || NEW.order_number,
      merchant_msg,
      CASE NEW.status
        WHEN 'delivered' THEN 'success'
        WHEN 'cancelled' THEN 'error'
        ELSE 'info'
      END,
      '/merchant'
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Attach trigger on UPDATE of status column
CREATE TRIGGER trg_notify_order_status_change
  AFTER UPDATE OF status ON public.marketplace_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_order_status_change();
