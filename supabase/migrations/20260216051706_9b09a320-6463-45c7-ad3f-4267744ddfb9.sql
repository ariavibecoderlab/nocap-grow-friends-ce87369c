
-- Drop old unique constraint that only allows one wallet per user
ALTER TABLE public.wallets DROP CONSTRAINT wallets_user_id_key;

-- Add composite unique constraint to allow one wallet per user per type
-- For branch wallets, branch_id differentiates them
CREATE UNIQUE INDEX wallets_user_type_unique ON public.wallets (user_id, wallet_type) WHERE branch_id IS NULL;
CREATE UNIQUE INDEX wallets_branch_unique ON public.wallets (branch_id) WHERE branch_id IS NOT NULL;
