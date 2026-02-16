
-- Add wallet_type to wallets table
ALTER TABLE public.wallets ADD COLUMN wallet_type text NOT NULL DEFAULT 'member';
ALTER TABLE public.wallets ADD COLUMN branch_id uuid REFERENCES public.merchant_branches(id) ON DELETE SET NULL;

-- Mark all existing wallets as 'member'
UPDATE public.wallets SET wallet_type = 'member' WHERE wallet_type = 'member';

-- Add unique constraint: one wallet per user+type+branch combo
CREATE UNIQUE INDEX wallets_user_type_branch_unique 
ON public.wallets (user_id, wallet_type, COALESCE(branch_id, '00000000-0000-0000-0000-000000000000'));

-- Create merchant wallets for existing merchants
INSERT INTO public.wallets (user_id, wallet_type, balance)
SELECT ur.user_id, 'merchant', 0
FROM public.user_roles ur
WHERE ur.role = 'merchant'
ON CONFLICT DO NOTHING;

-- Create branch wallets from existing branch balances
INSERT INTO public.wallets (user_id, wallet_type, branch_id, balance)
SELECT mb.owner_user_id, 'branch', mb.id, mb.balance
FROM public.merchant_branches mb
WHERE mb.owner_user_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Add wallet_type to withdrawal_requests
ALTER TABLE public.withdrawal_requests ADD COLUMN wallet_type text NOT NULL DEFAULT 'member';

-- Update existing withdrawal requests: if branch_id is set, it's a branch withdrawal
UPDATE public.withdrawal_requests SET wallet_type = 'branch' WHERE branch_id IS NOT NULL;
