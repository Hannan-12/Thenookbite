-- TNB: All migrations in order — safe to run on a fresh or partial DB
-- Run this entire file in Supabase SQL Editor

-- ─────────────────────────────────────────────
-- customer_phone on orders
-- ─────────────────────────────────────────────
alter table public.orders
  add column if not exists customer_phone text;

create index if not exists idx_orders_customer_phone on public.orders (customer_phone);

-- ─────────────────────────────────────────────
-- staff table
-- ─────────────────────────────────────────────
create table if not exists public.staff (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  email       text not null,
  role        text not null default 'cashier'
                check (role in ('cashier', 'manager')),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

alter table public.staff enable row level security;

drop policy if exists "staff service all" on public.staff;
create policy "staff service all" on public.staff
  using (true) with check (true);

-- staff_id on orders
alter table public.orders
  add column if not exists staff_id uuid references public.staff(id) on delete set null;

create index if not exists orders_staff_idx on public.orders (staff_id);

-- ─────────────────────────────────────────────
-- staff: extra columns + attendance
-- ─────────────────────────────────────────────
alter table public.staff
  add column if not exists staff_type text not null default 'pos'
    check (staff_type in ('pos', 'non-pos')),
  add column if not exists pin char(4);

create table if not exists public.attendance (
  id          uuid primary key default gen_random_uuid(),
  staff_id    uuid not null references public.staff(id) on delete cascade,
  date        date not null default current_date,
  status      text not null default 'present'
                check (status in ('present', 'absent', 'late')),
  check_in    timestamptz,
  check_out   timestamptz,
  note        text,
  created_at  timestamptz not null default now(),
  unique(staff_id, date)
);

create index if not exists attendance_staff_idx on public.attendance (staff_id);
create index if not exists attendance_date_idx  on public.attendance (date);

alter table public.attendance enable row level security;

drop policy if exists "attendance service all" on public.attendance;
create policy "attendance service all" on public.attendance
  using (true) with check (true);

-- ─────────────────────────────────────────────
-- ingredients + recipes
-- ─────────────────────────────────────────────
create table if not exists public.ingredients (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  unit        text not null default 'g',
  created_at  timestamptz not null default now()
);

create table if not exists public.recipes (
  id              uuid primary key default gen_random_uuid(),
  menu_item_id    uuid not null references public.menu_items(id) on delete cascade,
  ingredient_id   uuid not null references public.ingredients(id) on delete cascade,
  quantity        numeric(10,2) not null default 1,
  created_at      timestamptz not null default now(),
  unique(menu_item_id, ingredient_id)
);

create index if not exists idx_recipes_menu_item on public.recipes (menu_item_id);
create index if not exists idx_recipes_ingredient on public.recipes (ingredient_id);

-- ─────────────────────────────────────────────
-- inventory: stock levels + movements
-- ─────────────────────────────────────────────
alter table public.ingredients
  add column if not exists stock_qty              numeric(10,2) not null default 0,
  add column if not exists low_stock_threshold    numeric(10,2) not null default 100,
  add column if not exists updated_at             timestamptz not null default now();

create table if not exists public.stock_movements (
  id            uuid primary key default gen_random_uuid(),
  ingredient_id uuid not null references public.ingredients(id) on delete cascade,
  qty_change    numeric(10,2) not null,
  reason        text not null default 'manual',
  order_id      uuid references public.orders(id) on delete set null,
  note          text,
  created_at    timestamptz not null default now()
);

create index if not exists idx_stock_movements_ingredient on public.stock_movements (ingredient_id);
create index if not exists idx_stock_movements_order      on public.stock_movements (order_id);

-- ─────────────────────────────────────────────
-- ledger: vendors, purchases, expenses
-- ─────────────────────────────────────────────
create table if not exists public.vendors (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  phone       text,
  category    text,
  notes       text,
  created_at  timestamptz default now()
);

create table if not exists public.purchases (
  id            uuid primary key default gen_random_uuid(),
  vendor_id     uuid references public.vendors(id) on delete set null,
  vendor_name   text not null,
  amount        int not null,
  description   text,
  purchase_date date not null default current_date,
  created_at    timestamptz default now()
);

create table if not exists public.expenses (
  id            uuid primary key default gen_random_uuid(),
  category      text not null,
  amount        int not null,
  description   text,
  expense_date  date not null default current_date,
  created_at    timestamptz default now()
);

create index if not exists idx_purchases_date   on public.purchases (purchase_date);
create index if not exists idx_purchases_vendor on public.purchases (vendor_id);
create index if not exists idx_expenses_date    on public.expenses (expense_date);
create index if not exists idx_expenses_cat     on public.expenses (category);

alter table public.vendors   enable row level security;
alter table public.purchases enable row level security;
alter table public.expenses  enable row level security;

drop policy if exists "vendors service all"   on public.vendors;
drop policy if exists "purchases service all" on public.purchases;
drop policy if exists "expenses service all"  on public.expenses;

create policy "vendors service all"   on public.vendors   using (true) with check (true);
create policy "purchases service all" on public.purchases using (true) with check (true);
create policy "expenses service all"  on public.expenses  using (true) with check (true);

-- ─────────────────────────────────────────────
-- POS sessions
-- ─────────────────────────────────────────────
create table if not exists public.pos_sessions (
  id          uuid primary key default gen_random_uuid(),
  staff_id    uuid not null references auth.users(id) on delete cascade,
  started_at  timestamptz not null default now(),
  ended_at    timestamptz,
  created_at  timestamptz not null default now()
);

-- Fix FK if table was already created with staff reference
alter table public.pos_sessions
  drop constraint if exists pos_sessions_staff_id_fkey;
alter table public.pos_sessions
  add constraint pos_sessions_staff_id_fkey
  foreign key (staff_id) references auth.users(id) on delete cascade;

create index if not exists idx_pos_sessions_staff   on public.pos_sessions (staff_id);
create index if not exists idx_pos_sessions_started on public.pos_sessions (started_at desc);

alter table public.pos_sessions enable row level security;

drop policy if exists "pos_sessions service all" on public.pos_sessions;
create policy "pos_sessions service all" on public.pos_sessions
  using (true) with check (true);

alter table public.orders
  add column if not exists session_id uuid references public.pos_sessions(id) on delete set null,
  add column if not exists source     text default 'online',
  add column if not exists verified   boolean default false;

create index if not exists idx_orders_session on public.orders (session_id);
