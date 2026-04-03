-- 1. Create sequence for ticket numbers
CREATE SEQUENCE IF NOT EXISTS public.support_ticket_seq START 1;

-- 2. Create support_tickets table
CREATE TABLE public.support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_number TEXT NOT NULL DEFAULT 'TK-' || LPAD(nextval('public.support_ticket_seq')::text, 6, '0'),
  user_id UUID NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  assigned_to UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Create support_ticket_replies table
CREATE TABLE public.support_ticket_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_type TEXT NOT NULL DEFAULT 'user',
  message TEXT NOT NULL,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Indexes
CREATE INDEX idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX idx_support_tickets_assigned_to ON public.support_tickets(assigned_to);
CREATE INDEX idx_support_ticket_replies_ticket_id ON public.support_ticket_replies(ticket_id);

-- 5. Updated_at trigger
CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Enable RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_replies ENABLE ROW LEVEL SECURITY;

-- 7. RLS for support_tickets
CREATE POLICY "Users can view own tickets"
  ON public.support_tickets FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own tickets"
  ON public.support_tickets FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Support agents can view all tickets"
  ON public.support_tickets FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'support'));

CREATE POLICY "Support agents can update all tickets"
  ON public.support_tickets FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'support'));

CREATE POLICY "Admins can view all tickets"
  ON public.support_tickets FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 8. RLS for support_ticket_replies
CREATE POLICY "Users can view replies on own tickets"
  ON public.support_ticket_replies FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.support_tickets t
    WHERE t.id = ticket_id AND t.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert replies on own tickets"
  ON public.support_ticket_replies FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND sender_type = 'user'
    AND EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "Support agents can view all replies"
  ON public.support_ticket_replies FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'support'));

CREATE POLICY "Support agents can insert replies"
  ON public.support_ticket_replies FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND sender_type = 'agent'
    AND public.has_role(auth.uid(), 'support')
  );

-- 9. Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('support-attachments', 'support-attachments', false);

CREATE POLICY "Users can upload to own ticket folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'support-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own ticket files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'support-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Support agents can view all ticket files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'support-attachments' AND public.has_role(auth.uid(), 'support'));

CREATE POLICY "Support agents can upload ticket files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'support-attachments' AND public.has_role(auth.uid(), 'support'));

-- 10. Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_ticket_replies;

-- 11. Notification trigger
CREATE OR REPLACE FUNCTION public.notify_ticket_reply()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ticket RECORD;
BEGIN
  SELECT t.user_id, t.assigned_to, t.subject, t.ticket_number
  INTO ticket
  FROM public.support_tickets t
  WHERE t.id = NEW.ticket_id;

  IF NEW.sender_type = 'agent' THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      ticket.user_id,
      'Support Reply - ' || ticket.ticket_number,
      'A support agent replied to your ticket: ' || ticket.subject,
      'info',
      '/support-tickets/' || NEW.ticket_id
    );
  ELSIF NEW.sender_type = 'user' AND ticket.assigned_to IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      ticket.assigned_to,
      'Customer Reply - ' || ticket.ticket_number,
      'Customer replied to ticket: ' || ticket.subject,
      'info',
      '/support-portal/tickets/' || NEW.ticket_id
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_ticket_reply_notify
  AFTER INSERT ON public.support_ticket_replies
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_ticket_reply();