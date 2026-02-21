
-- Add merchant reply columns to marketplace_reviews
ALTER TABLE public.marketplace_reviews
ADD COLUMN merchant_reply TEXT DEFAULT NULL,
ADD COLUMN replied_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Allow merchants to update reviews for their own store's products (to add replies)
CREATE POLICY "Merchants can reply to reviews on own products"
ON public.marketplace_reviews
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM marketplace_products p
    JOIN marketplace_stores s ON s.id = p.store_id
    WHERE p.id = marketplace_reviews.product_id
    AND s.merchant_user_id = auth.uid()
  )
);
