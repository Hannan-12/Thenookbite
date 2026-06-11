-- Milestone 1: Staff accounts + POS auth
-- Run this in the Supabase SQL editor.

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

-- service role can do everything (admin creates/reads staff)
drop policy if exists "staff service all" on public.staff;
create policy "staff service all" on public.staff
  using (true) with check (true);

-- ─────────────────────────────────────────────
-- Add staff_id to orders
-- ─────────────────────────────────────────────
alter table public.orders
  add column if not exists staff_id uuid references public.staff(id) on delete set null;

create index if not exists orders_staff_idx on public.orders (staff_id);
