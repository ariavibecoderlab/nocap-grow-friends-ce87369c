-- Rename wallet balance audit table to VA balance audit terminology if it still has the old name
ALTER TABLE IF EXISTS public.wallet_balance_audit RENAME TO va_balance_audit;

-- Rename supporting indexes if they still have old names
ALTER INDEX IF EXISTS public.idx_wallet_audit_user RENAME TO idx_va_audit_user;
ALTER INDEX IF EXISTS public.idx_wallet_audit_wallet RENAME TO idx_va_audit_wallet;

-- Remove old/new trigger before replacing its function dependency
DROP TRIGGER IF EXISTS trg_wallet_balance_audit ON public.wallets;
DROP TRIGGER IF EXISTS trg_va_balance_audit ON public.wallets;

-- Replace balance audit trigger function with VA naming
DROP FUNCTION IF EXISTS public.log_wallet_balance_change();

CREATE OR REPLACE FUNCTION public.log_va_balance_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.va_balance_audit
      (wallet_id, user_id, wallet_type, branch_id, old_balance, new_balance, delta, changed_by)
    VALUES
      (NEW.id, NEW.user_id, NEW.wallet_type, NEW.branch_id, 0, NEW.balance, NEW.balance, auth.uid());
  ELSIF TG_OP = 'UPDATE' AND OLD.balance IS DISTINCT FROM NEW.balance THEN
    INSERT INTO public.va_balance_audit
      (wallet_id, user_id, wallet_type, branch_id, old_balance, new_balance, delta, changed_by)
    VALUES
      (NEW.id, NEW.user_id, NEW.wallet_type, NEW.branch_id, OLD.balance, NEW.balance, NEW.balance - OLD.balance, auth.uid());
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_va_balance_audit
AFTER INSERT OR UPDATE OF balance ON public.wallets
FOR EACH ROW
EXECUTE FUNCTION public.log_va_balance_change();

-- Replace reconciliation RPC with VA naming and output column
DROP FUNCTION IF EXISTS public.reconcile_wallet_balances();

CREATE OR REPLACE FUNCTION public.reconcile_va_balances()
RETURNS TABLE(user_id uuid, wallet_type text, branch_id uuid, va_balance numeric, computed_balance numeric, drift numeric)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  SELECT w.user_id, w.wallet_type, w.branch_id, w.balance AS va_balance,
    COALESCE(tt.computed, 0) AS computed_balance,
    w.balance - COALESCE(tt.computed, 0) AS drift
  FROM wallets w
  LEFT JOIN tx_totals tt ON tt.user_id = w.user_id
  WHERE w.wallet_type = 'member'
    AND ABS(w.balance - COALESCE(tt.computed, 0)) > 0.001;
$function$;