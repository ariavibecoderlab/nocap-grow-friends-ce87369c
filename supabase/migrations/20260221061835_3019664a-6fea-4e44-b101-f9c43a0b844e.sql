
-- Create wishlist table for authenticated users
CREATE TABLE public.marketplace_wishlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES public.marketplace_products(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- Enable RLS
ALTER TABLE public.marketplace_wishlists ENABLE ROW LEVEL SECURITY;

-- Users can view their own wishlist
CREATE POLICY "Users can view own wishlist"
  ON public.marketplace_wishlists FOR SELECT
  USING (auth.uid() = user_id);

-- Users can add to own wishlist
CREATE POLICY "Users can add to own wishlist"
  ON public.marketplace_wishlists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can remove from own wishlist
CREATE POLICY "Users can delete from own wishlist"
  ON public.marketplace_wishlists FOR DELETE
  USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX idx_marketplace_wishlists_user_id ON public.marketplace_wishlists(user_id);
