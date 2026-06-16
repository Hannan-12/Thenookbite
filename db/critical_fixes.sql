-- Critical fixes: add order_type, tip, delivery_address to orders
-- Run this in Supabase SQL Editor

alter table public.orders
  add column if not exists order_type      text not null default 'dine-in'
    check (order_type in ('dine-in', 'takeaway', 'delivery')),
  add column if not exists tip             integer not null default 0,
  add column if not exists delivery_address text;
