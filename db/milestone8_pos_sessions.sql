-- TNB: POS Sessions — track each cashier login as a session
-- Run in Supabase SQL Editor

-- ─────────────────────────────────────────────
-- pos_sessions table
-- ─────────────────────────────────────────────
create table if not exists public.pos_sessions (
  id          uuid primary key default gen_random_uuid(),
  staff_id    uuid not null references public.staff(id) on delete cascade,
  started_at  timestamptz not null default now(),
  ended_at    timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists idx_pos_sessions_staff     on public.pos_sessions (staff_id);
create index if not exists idx_pos_sessions_started   on public.pos_sessions (started_at desc);

alter table public.pos_sessions enable row level security;

drop policy if exists "pos_sessions service all" on public.pos_sessions;
create policy "pos_sessions service all" on public.pos_sessions
  using (true) with check (true);

-- ─────────────────────────────────────────────
-- session_id on orders
-- ─────────────────────────────────────────────
alter table public.orders
  add column if not exists session_id uuid references public.pos_sessions(id) on delete set null;

create index if not exists idx_orders_session on public.orders (session_id);

-- source + verified columns (if not already added via previous migration)
alter table public.orders
  add column if not exists source   text default 'online',
  add column if not exists verified boolean default false;
