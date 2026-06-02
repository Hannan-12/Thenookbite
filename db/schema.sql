-- TNB (The Nook Bite) — Database Schema
-- Run this in the Supabase SQL editor.

-- ─────────────────────────────────────────────
-- profiles (extends Supabase auth.users)
-- ─────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  phone       text,
  created_at  timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- menu_items
-- ─────────────────────────────────────────────
create table if not exists public.menu_items (
  id          uuid primary key default gen_random_uuid(),
  sku         text unique not null,
  name        text not null,
  category    text not null,
  price       integer not null,            -- PKR, integer
  image_url   text,
  description text,
  available   boolean not null default true,
  sort_order  integer not null default 0,
  deal_price  integer,
  deal_label  text,
  created_at  timestamptz not null default now()
);

create index if not exists menu_items_category_idx on public.menu_items (category);
create index if not exists menu_items_available_idx on public.menu_items (available);

-- ─────────────────────────────────────────────
-- orders
-- ─────────────────────────────────────────────
create table if not exists public.orders (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references public.profiles(id) on delete set null,
  customer_name     text,
  table_number      text,
  status            text not null default 'pending'
                      check (status in ('pending','preparing','ready','completed')),
  payment_method    text not null
                      check (payment_method in ('cash','card')),
  payment_status    text not null default 'pending'
                      check (payment_status in ('pending','paid','failed')),
  stripe_session_id text,
  total             integer not null,       -- PKR, integer
  special_notes     text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_user_idx on public.orders (user_id);

-- ─────────────────────────────────────────────
-- order_items
-- ─────────────────────────────────────────────
create table if not exists public.order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders(id) on delete cascade,
  menu_item_id  uuid references public.menu_items(id) on delete set null,
  item_name     text not null,              -- denormalized
  item_price    integer not null,           -- denormalized, PKR
  quantity      integer not null default 1,
  created_at    timestamptz not null default now()
);

create index if not exists order_items_order_idx on public.order_items (order_id);

-- ─────────────────────────────────────────────
-- updated_at trigger for orders
-- ─────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────
alter table public.profiles    enable row level security;
alter table public.menu_items  enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;

-- menu_items: anyone can read (public menu)
drop policy if exists "menu public read" on public.menu_items;
create policy "menu public read" on public.menu_items
  for select using (true);

-- profiles: a user can read/update only their own row
drop policy if exists "profiles self read" on public.profiles;
create policy "profiles self read" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles self upsert" on public.profiles;
create policy "profiles self upsert" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update" on public.profiles
  for update using (auth.uid() = id);

-- orders: anyone may create (guest checkout); users read their own.
-- NOTE: the backend uses the service key and bypasses RLS for kitchen/admin reads.
drop policy if exists "orders public insert" on public.orders;
create policy "orders public insert" on public.orders
  for insert with check (true);

drop policy if exists "orders self read" on public.orders;
create policy "orders self read" on public.orders
  for select using (user_id is null or auth.uid() = user_id);

-- order_items: inserted alongside an order; readable with the order
drop policy if exists "order_items public insert" on public.order_items;
create policy "order_items public insert" on public.order_items
  for insert with check (true);

drop policy if exists "order_items read" on public.order_items;
create policy "order_items read" on public.order_items
  for select using (true);
