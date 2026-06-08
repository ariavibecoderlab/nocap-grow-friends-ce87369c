-- Atomic stock decrement RPC
-- Updates stock_quantity only if sufficient stock exists.
-- Returns the new stock_quantity, or NULL if stock was insufficient (order should be rejected).

CREATE OR REPLACE FUNCTION decrement_stock(p_product_id uuid, p_qty int)
RETURNS int
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE marketplace_products
  SET stock_quantity = stock_quantity - p_qty
  WHERE id = p_product_id
    AND status = 'active'
    AND stock_quantity >= p_qty
  RETURNING stock_quantity;
$$;

-- Grant execute to service_role (edge functions use service role)
GRANT EXECUTE ON FUNCTION decrement_stock(uuid, int) TO service_role;
