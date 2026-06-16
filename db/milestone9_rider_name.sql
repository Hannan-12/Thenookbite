-- Add rider_name to orders for delivery tracking
alter table public.orders
  add column if not exists rider_name text;
