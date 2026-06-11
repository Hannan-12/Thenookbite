-- Milestone 4: Shift & Attendance
-- Run this in the Supabase SQL editor AFTER milestone1_staff.sql

-- ─────────────────────────────────────────────
-- Add new columns to staff table
-- ─────────────────────────────────────────────
alter table public.staff
  add column if not exists staff_type text not null default 'pos'
    check (staff_type in ('pos', 'non-pos')),
  add column if not exists pin char(4);

-- ─────────────────────────────────────────────
-- attendance table
-- ─────────────────────────────────────────────
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
