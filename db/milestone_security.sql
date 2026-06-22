-- Security & integrity fixes (Milestone 1 + 2 issues)
-- Run in Supabase SQL Editor

-- Issue #7: idempotency key on orders (prevents duplicate orders on network retry)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS idempotency_key text UNIQUE;

-- Issue #8: make attendance-photos bucket private (run this once, then update bucket settings in Supabase dashboard)
-- In Supabase Dashboard → Storage → attendance-photos → Settings → uncheck "Public bucket"

-- Issue #3: Atomic stock deduction RPC (eliminates read-then-write race condition)
-- Returns the new stock_qty, or NULL if ingredient not found.
-- Floor is 0 — stock cannot go negative.
CREATE OR REPLACE FUNCTION public.deduct_ingredient_stock(
  p_ingredient_id uuid,
  p_amount        numeric
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_qty numeric;
BEGIN
  UPDATE public.ingredients
  SET
    stock_qty  = GREATEST(0, stock_qty - p_amount),
    updated_at = now()
  WHERE id = p_ingredient_id
  RETURNING stock_qty INTO v_new_qty;

  RETURN v_new_qty; -- NULL if no row matched
END;
$$;

-- Issue #9: active_orders view so all report routes stop repeating .neq('status','cancelled')
CREATE OR REPLACE VIEW public.active_orders AS
  SELECT * FROM public.orders WHERE status != 'cancelled';

-- Grant SELECT on the view to the service role
GRANT SELECT ON public.active_orders TO service_role;
