
-- Fix self-referencing RLS policy with security definer function
CREATE OR REPLACE FUNCTION public.is_chat_participant(_user_id UUID, _store_id UUID, _product_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.marketplace_chat_messages
    WHERE store_id = _store_id
      AND product_id = _product_id
      AND sender_id = _user_id
  )
$$;

-- Drop the self-referencing policy
DROP POLICY IF EXISTS "Buyers can view own conversations" ON public.marketplace_chat_messages;

-- Recreate without self-reference
CREATE POLICY "Buyers can view own conversations"
ON public.marketplace_chat_messages
FOR SELECT
TO authenticated
USING (
  sender_id = auth.uid()
  OR is_chat_participant(auth.uid(), store_id, product_id)
);
