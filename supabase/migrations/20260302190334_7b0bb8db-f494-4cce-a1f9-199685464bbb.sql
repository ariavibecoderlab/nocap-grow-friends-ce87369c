
-- 1. Audit trail table
CREATE TABLE public.wallet_balance_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL,
  user_id uuid NOT NULL,
  wallet_type text NOT NULL,
  branch_id uuid,
  old_balance numeric NOT NULL DEFAULT 0,
  new_balance numeric NOT NULL,
  delta numeric NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  changed_by uuid
);

ALTER TABLE public.wallet_balance_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit log"
  ON public.wallet_balance_audit FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Index for reconciliation queries
CREATE INDEX idx_wallet_audit_user ON public.wallet_balance_audit(user_id, changed_at DESC);
CREATE INDEX idx_wallet_audit_wallet ON public.wallet_balance_audit(wallet_id, changed_at DESC);

-- 2. Trigger function for audit logging (fires on UPDATE and INSERT)
CREATE OR REPLACE FUNCTION public.log_wallet_balance_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.wallet_balance_audit
      (wallet_id, user_id, wallet_type, branch_id, old_balance, new_balance, delta, changed_by)
    VALUES
      (NEW.id, NEW.user_id, NEW.wallet_type, NEW.branch_id, 0, NEW.balance, NEW.balance, auth.uid());
  ELSIF TG_OP = 'UPDATE' AND OLD.balance IS DISTINCT FROM NEW.balance THEN
    INSERT INTO public.wallet_balance_audit
      (wallet_id, user_id, wallet_type, branch_id, old_balance, new_balance, delta, changed_by)
    VALUES
      (NEW.id, NEW.user_id, NEW.wallet_type, NEW.branch_id, OLD.balance, NEW.balance, NEW.balance - OLD.balance, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_wallet_balance_audit
  AFTER INSERT OR UPDATE ON public.wallets
  FOR EACH ROW
  EXECUTE FUNCTION public.log_wallet_balance_change();

-- 3. Atomic debit_wallet RPC
CREATE OR REPLACE FUNCTION public.debit_wallet(
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
    AND balance >= p_amount
    AND (p_branch_id IS NULL OR branch_id = p_branch_id)
  RETURNING balance INTO new_bal;

  IF new_bal IS NULL THEN
    RAISE EXCEPTION 'Insufficient balance or wallet not found';
  END IF;
  RETURN new_bal;
END;
$$;

-- 4. Atomic credit_wallet RPC
CREATE OR REPLACE FUNCTION public.credit_wallet(
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
    RAISE EXCEPTION 'Credit amount must be positive';
  END IF;

  UPDATE wallets
  SET balance = balance + p_amount,
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

-- 5. Reconciliation function
CREATE OR REPLACE FUNCTION public.reconcile_wallet_balances()
RETURNS TABLE(
  user_id uuid,
  wallet_type text,
  branch_id uuid,
  wallet_balance numeric,
  computed_balance numeric,
  drift numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH tx_totals AS (
    SELECT t.user_id,
      SUM(CASE
        WHEN t.type IN ('top_up','transfer_in','refund','cashback','commission') THEN t.amount
        WHEN t.type IN ('payment','transfer_out','withdrawal') THEN -t.amount
        ELSE 0
      END) AS computed
    FROM transactions t
    WHERE t.status = 'completed'
    GROUP BY t.user_id
  )
  SELECT w.user_id, w.wallet_type, w.branch_id, w.balance AS wallet_balance,
    COALESCE(tt.computed, 0) AS computed_balance,
    w.balance - COALESCE(tt.computed, 0) AS drift
  FROM wallets w
  LEFT JOIN tx_totals tt ON tt.user_id = w.user_id
  WHERE w.wallet_type = 'member'
    AND ABS(w.balance - COALESCE(tt.computed, 0)) > 0.001;
$$;
