
-- Add 'distribution' to transaction_type enum
ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'distribution';

-- Create debit_wallet_allow_negative function (allows negative balance)
CREATE OR REPLACE FUNCTION public.debit_wallet_allow_negative(
  p_user_id uuid,
  p_wallet_type text,
  p_amount numeric,
  p_branch_id uuid DEFAULT NULL
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_bal numeric;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Debit amount must be positive';
  END IF;

  UPDATE wallets
  SET balance = balance - p_amount,
      updated_at = now()
  WHERE user_id = p_user_id
    AND wallet_type = p_wallet_type
    AND (p_branch_id IS NULL OR branch_id = p_branch_id)
  RETURNING balance INTO new_bal;

  IF new_bal IS NULL THEN
    RAISE EXCEPTION 'Wallet not found';
  END IF;
  RETURN new_bal;
END;
$$;
