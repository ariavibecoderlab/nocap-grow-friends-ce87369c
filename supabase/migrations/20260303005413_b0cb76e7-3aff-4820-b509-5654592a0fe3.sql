
ALTER TABLE public.transactions ADD COLUMN idempotency_key text;

CREATE UNIQUE INDEX idx_transactions_idempotency_key 
  ON public.transactions (idempotency_key) 
  WHERE idempotency_key IS NOT NULL;
