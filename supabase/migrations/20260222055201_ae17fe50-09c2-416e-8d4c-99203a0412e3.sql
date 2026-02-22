
-- Create chat messages table
CREATE TABLE public.marketplace_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.marketplace_stores(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.marketplace_products(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_type TEXT NOT NULL DEFAULT 'buyer' CHECK (sender_type IN ('buyer', 'merchant')),
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.marketplace_chat_messages ENABLE ROW LEVEL SECURITY;

-- Buyers can insert their own messages
CREATE POLICY "Buyers can insert own messages"
ON public.marketplace_chat_messages
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = sender_id AND sender_type = 'buyer');

-- Merchants can insert replies
CREATE POLICY "Merchants can insert replies"
ON public.marketplace_chat_messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_type = 'merchant' AND auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM public.marketplace_stores s
    WHERE s.id = marketplace_chat_messages.store_id AND s.merchant_user_id = auth.uid()
  )
);

-- Buyers can view messages in conversations they participate in
CREATE POLICY "Buyers can view own conversations"
ON public.marketplace_chat_messages
FOR SELECT
TO authenticated
USING (
  sender_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.marketplace_chat_messages m2
    WHERE m2.store_id = marketplace_chat_messages.store_id
      AND m2.product_id = marketplace_chat_messages.product_id
      AND m2.sender_id = auth.uid()
  )
);

-- Merchants can view all messages for their stores
CREATE POLICY "Merchants can view store messages"
ON public.marketplace_chat_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.marketplace_stores s
    WHERE s.id = marketplace_chat_messages.store_id AND s.merchant_user_id = auth.uid()
  )
);

-- Admins can manage all
CREATE POLICY "Admins can manage all chat messages"
ON public.marketplace_chat_messages
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.marketplace_chat_messages;

-- Create index for faster lookups
CREATE INDEX idx_chat_messages_store_product ON public.marketplace_chat_messages(store_id, product_id, sender_id);
CREATE INDEX idx_chat_messages_created ON public.marketplace_chat_messages(created_at);
