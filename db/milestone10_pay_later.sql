-- Pay Later: allow pay_later as payment method + track settlement
alter table public.orders
  add column if not exists settled_at timestamptz,
  add column if not exists settled_payment_method text;
