-- Critical scale fixes for 100k users
-- CRIT-6: Missing indexes on transactions and referral_tree tables
-- CRIT-3: Atomic withdrawal submission RPC

-- ── Indexes ────────────────────────────────────────────────────────────────

-- Most-queried pattern: all pages fetching user transactions ordered by date
CREATE INDEX IF NOT EXISTS idx_transactions_user_created
  ON public.transactions(user_id, created_at DESC);

-- Dashboard/analytics: filter by type + status per user
CREATE INDEX IF NOT EXISTS idx_transactions_user_type_status
  ON public.transactions(user_id, type, status);

-- Commission distribution: referral tree ancestor lookups per payer
CREATE INDEX IF NOT EXISTS idx_referral_tree_user_tier
  ON public.referral_tree(user_id, tier ASC);

-- Referral page: count downline per ancestor
CREATE INDEX IF NOT EXISTS idx_referral_tree_ancestor_tier
  ON public.referral_tree(ancestor_id, tier ASC);

-- Marketplace product search by store + status
CREATE INDEX IF NOT EXISTS idx_marketplace_products_store_status
  ON public.marketplace_products(store_id, status)
  WHERE status = 'active';

-- Marketplace orders by user (column is buyer_user_id, not user_id)
CREATE INDEX IF NOT EXISTS idx_marketplace_orders_user_created
  ON public.marketplace_orders(buyer_user_id, created_at DESC);

-- ── Atomic withdrawal submission ────────────────────────────────────────────
-- Replaces client-side insert in Withdraw.tsx
-- Atomically: checks balance, debits wallet, inserts withdrawal_request
-- Returns: { success, request_id, new_balance, error }

CREATE OR REPLACE FUNCTION public.request_withdrawal(
  p_user_id   UUID,
  p_amount    NUMERIC,
  p_bank_name TEXT,
  p_account_no TEXT,
  p_account_holder TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet_id    UUID;
  v_balance      NUMERIC;
  v_min_amount   NUMERIC := 10.00;
  v_request_id   UUID;
  v_new_balance  NUMERIC;
  v_min_setting  system_settings%ROWTYPE;
  v_existing_pending INT;
BEGIN
  -- Get min withdrawal amount from settings
  SELECT * INTO v_min_setting FROM system_settings WHERE key = 'min_withdrawal_amount' LIMIT 1;
  IF FOUND THEN v_min_amount := v_min_setting.value::NUMERIC; END IF;

  -- Validate amount
  IF p_amount < v_min_amount THEN
    RETURN json_build_object('success', false, 'error', format('Minimum withdrawal is RM %.2f', v_min_amount));
  END IF;

  -- Check for existing pending request
  SELECT COUNT(*) INTO v_existing_pending
  FROM withdrawal_requests
  WHERE user_id = p_user_id AND status = 'pending';
  IF v_existing_pending > 0 THEN
    RETURN json_build_object('success', false, 'error', 'You already have a pending withdrawal request');
  END IF;

  -- Lock the wallet row and check balance atomically
  SELECT id, balance INTO v_wallet_id, v_balance
  FROM wallets
  WHERE user_id = p_user_id AND wallet_type = 'member'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Wallet not found');
  END IF;

  IF v_balance < p_amount THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  -- Atomically debit the wallet (locks funds during pending period)
  UPDATE wallets
  SET balance = balance - p_amount
  WHERE id = v_wallet_id
  RETURNING balance INTO v_new_balance;

  -- Insert withdrawal request
  INSERT INTO withdrawal_requests (user_id, amount, bank_name, bank_account_no, bank_account_holder, status)
  VALUES (p_user_id, p_amount, p_bank_name, p_account_no, p_account_holder, 'pending')
  RETURNING id INTO v_request_id;

  -- Record the debit transaction
  INSERT INTO transactions (user_id, type, amount, status, description, metadata)
  VALUES (
    p_user_id, 'withdrawal', p_amount, 'pending',
    format('Withdrawal request RM %.2f to %s', p_amount, p_bank_name),
    jsonb_build_object('withdrawal_request_id', v_request_id, 'bank_name', p_bank_name, 'account_no', p_account_no)
  );

  RETURN json_build_object(
    'success', true,
    'request_id', v_request_id,
    'new_balance', v_new_balance
  );
END;
$$;

-- Grant execute to authenticated users only
REVOKE ALL ON FUNCTION public.request_withdrawal FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_withdrawal TO authenticated;

-- ── CRIT-2: Atomic branch balance increment ─────────────────────────────────
-- Replaces non-atomic SELECT balance / UPDATE balance = old + new in process-payment
CREATE OR REPLACE FUNCTION public.increment_branch_balance(
  p_branch_id UUID,
  p_amount    NUMERIC
)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE merchant_branches
  SET balance = COALESCE(balance, 0) + p_amount
  WHERE id = p_branch_id;
$$;

-- Only service-role (edge functions) should call this
REVOKE ALL ON FUNCTION public.increment_branch_balance FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_branch_balance TO service_role;
