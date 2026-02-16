
-- Add branch_id to notifications for branch-specific filtering
ALTER TABLE public.notifications ADD COLUMN branch_id uuid REFERENCES public.merchant_branches(id) DEFAULT NULL;

-- Add index for efficient filtering
CREATE INDEX idx_notifications_branch_id ON public.notifications(branch_id) WHERE branch_id IS NOT NULL;
