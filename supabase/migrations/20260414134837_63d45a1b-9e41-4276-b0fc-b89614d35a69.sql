
-- Phase 12: Loyalty Points
CREATE TABLE public.marketplace_loyalty_points (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.marketplace_stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  points_balance INTEGER NOT NULL DEFAULT 0,
  total_earned INTEGER NOT NULL DEFAULT 0,
  total_redeemed INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (store_id, user_id)
);

ALTER TABLE public.marketplace_loyalty_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can view own loyalty points" ON public.marketplace_loyalty_points
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Merchants can view store loyalty points" ON public.marketplace_loyalty_points
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM marketplace_stores s WHERE s.id = store_id AND s.merchant_user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage all loyalty points" ON public.marketplace_loyalty_points
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Loyalty Transactions ledger
CREATE TABLE public.marketplace_loyalty_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.marketplace_stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  type TEXT NOT NULL DEFAULT 'earn',
  points INTEGER NOT NULL DEFAULT 0,
  order_id UUID REFERENCES public.marketplace_orders(id),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.marketplace_loyalty_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can view own loyalty transactions" ON public.marketplace_loyalty_transactions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Merchants can view store loyalty transactions" ON public.marketplace_loyalty_transactions
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM marketplace_stores s WHERE s.id = store_id AND s.merchant_user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage all loyalty transactions" ON public.marketplace_loyalty_transactions
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to earn loyalty points on delivery
CREATE OR REPLACE FUNCTION public.earn_loyalty_points_on_delivery()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  points_to_earn INTEGER;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'delivered' AND NEW.buyer_user_id IS NOT NULL THEN
    -- 1 point per RM spent
    points_to_earn := GREATEST(1, FLOOR(NEW.total_amount));

    INSERT INTO marketplace_loyalty_points (store_id, user_id, points_balance, total_earned)
    VALUES (NEW.store_id, NEW.buyer_user_id, points_to_earn, points_to_earn)
    ON CONFLICT (store_id, user_id)
    DO UPDATE SET
      points_balance = marketplace_loyalty_points.points_balance + points_to_earn,
      total_earned = marketplace_loyalty_points.total_earned + points_to_earn,
      updated_at = now();

    INSERT INTO marketplace_loyalty_transactions (store_id, user_id, type, points, order_id, description)
    VALUES (NEW.store_id, NEW.buyer_user_id, 'earn', points_to_earn, NEW.id, 'Points earned from order #' || NEW.order_number);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_earn_loyalty_points
AFTER UPDATE ON public.marketplace_orders
FOR EACH ROW EXECUTE FUNCTION public.earn_loyalty_points_on_delivery();

-- Phase 14: Store score column
ALTER TABLE public.marketplace_stores ADD COLUMN IF NOT EXISTS store_score NUMERIC DEFAULT 0;

-- Phase 14: Enhanced Chat - read receipts
ALTER TABLE public.marketplace_chat_messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.marketplace_chat_messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE;

-- Phase 15: Multi-Currency exchange rates
CREATE TABLE public.marketplace_exchange_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_currency TEXT NOT NULL DEFAULT 'MYR',
  to_currency TEXT NOT NULL,
  rate NUMERIC NOT NULL DEFAULT 1,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (from_currency, to_currency)
);

ALTER TABLE public.marketplace_exchange_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view exchange rates" ON public.marketplace_exchange_rates
  FOR SELECT TO public USING (true);

CREATE POLICY "Admins can manage exchange rates" ON public.marketplace_exchange_rates
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed default rates
INSERT INTO public.marketplace_exchange_rates (from_currency, to_currency, rate) VALUES
  ('MYR', 'USD', 0.21),
  ('MYR', 'SGD', 0.29);
