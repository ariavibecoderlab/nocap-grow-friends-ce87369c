
-- Return/refund requests table
CREATE TABLE public.marketplace_return_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.marketplace_orders(id) ON DELETE CASCADE,
  order_item_id UUID REFERENCES public.marketplace_order_items(id),
  buyer_user_id UUID NOT NULL,
  store_id UUID NOT NULL REFERENCES public.marketplace_stores(id),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  merchant_note TEXT,
  refund_amount NUMERIC NOT NULL DEFAULT 0,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.marketplace_return_requests ENABLE ROW LEVEL SECURITY;

-- Buyers can create return requests for own orders
CREATE POLICY "Buyers can create return requests"
ON public.marketplace_return_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = buyer_user_id);

-- Buyers can view own return requests
CREATE POLICY "Buyers can view own return requests"
ON public.marketplace_return_requests
FOR SELECT
TO authenticated
USING (auth.uid() = buyer_user_id);

-- Merchants can view return requests for own stores
CREATE POLICY "Merchants can view store return requests"
ON public.marketplace_return_requests
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM marketplace_stores s
  WHERE s.id = marketplace_return_requests.store_id
  AND s.merchant_user_id = auth.uid()
));

-- Merchants can update (approve/reject) return requests
CREATE POLICY "Merchants can update store return requests"
ON public.marketplace_return_requests
FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM marketplace_stores s
  WHERE s.id = marketplace_return_requests.store_id
  AND s.merchant_user_id = auth.uid()
));

-- Admins full access
CREATE POLICY "Admins can manage all return requests"
ON public.marketplace_return_requests
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Updated_at trigger
CREATE TRIGGER update_return_requests_updated_at
BEFORE UPDATE ON public.marketplace_return_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
