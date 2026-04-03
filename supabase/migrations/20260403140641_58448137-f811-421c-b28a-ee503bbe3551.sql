
-- SLA settings table
CREATE TABLE public.sla_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  priority text NOT NULL UNIQUE,
  first_response_minutes integer NOT NULL DEFAULT 60,
  resolution_minutes integer NOT NULL DEFAULT 1440,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.sla_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Support agents can view SLA settings"
  ON public.sla_settings FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'support'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage SLA settings"
  ON public.sla_settings FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Support agents can update SLA settings"
  ON public.sla_settings FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'support'::app_role));

-- Default SLA targets
INSERT INTO public.sla_settings (priority, first_response_minutes, resolution_minutes) VALUES
  ('urgent', 30, 240),
  ('high', 60, 480),
  ('medium', 240, 1440),
  ('low', 480, 2880);

-- Add first_response_at to support_tickets
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS first_response_at timestamp with time zone;

-- Trigger to auto-set first_response_at on first agent reply
CREATE OR REPLACE FUNCTION public.set_first_response_time()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  IF NEW.sender_type = 'agent' THEN
    UPDATE support_tickets
    SET first_response_at = NEW.created_at
    WHERE id = NEW.ticket_id
      AND first_response_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_first_response
  AFTER INSERT ON public.support_ticket_replies
  FOR EACH ROW
  EXECUTE FUNCTION public.set_first_response_time();
