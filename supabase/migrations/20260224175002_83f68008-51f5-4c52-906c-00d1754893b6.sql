
CREATE TABLE public.transactions_backup (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  type public.transaction_type NOT NULL,
  status public.transaction_status NOT NULL DEFAULT 'pending'::transaction_status,
  description text,
  reference_id uuid,
  fee_amount numeric DEFAULT 0.00,
  commission_amount numeric DEFAULT 0.00,
  net_amount numeric,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- No RLS needed - this is an admin-only backup table
ALTER TABLE public.transactions_backup ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view backup transactions"
ON public.transactions_backup
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));
