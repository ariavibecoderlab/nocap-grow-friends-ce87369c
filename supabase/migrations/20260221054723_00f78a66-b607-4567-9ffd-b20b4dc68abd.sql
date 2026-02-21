
-- Create a trigger function to notify merchants when new orders come in
CREATE OR REPLACE FUNCTION public.notify_merchant_new_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  merchant_uid UUID;
  store_name_val TEXT;
BEGIN
  -- Get the merchant user id and store name
  SELECT s.merchant_user_id, s.store_name
  INTO merchant_uid, store_name_val
  FROM marketplace_stores s
  WHERE s.id = NEW.store_id;

  IF merchant_uid IS NOT NULL THEN
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (
      merchant_uid,
      'New Order #' || NEW.order_number,
      NEW.buyer_name || ' placed an order for RM ' || ROUND(NEW.total_amount, 2) || ' on ' || store_name_val,
      'success',
      '/merchant'
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create the trigger on marketplace_orders
CREATE TRIGGER on_new_marketplace_order
  AFTER INSERT ON public.marketplace_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_merchant_new_order();
