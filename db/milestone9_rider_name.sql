-- Add rider_name to orders for delivery tracking
alter table public.orders
  add column if not exists rider_name text;

-- Backfill: POS orders created before the verified column existed have verified = NULL.
-- Mark them true so they appear in the kitchen display.
update public.orders
  set verified = true
  where source = 'pos' and verified is null;

-- Also mark old online orders that reached kitchen (already preparing/ready/completed) as verified
-- so they don't get stranded
update public.orders
  set verified = true
  where source = 'online' and status in ('preparing', 'ready', 'completed') and verified is null;
