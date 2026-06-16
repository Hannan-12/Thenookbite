-- Fix pos_sessions.staff_id to reference auth.users instead of staff table
-- This allows the admin (owner) to open POS sessions without a staff row

-- Drop the old FK constraint and recreate pointing to auth.users
alter table public.pos_sessions
  drop constraint if exists pos_sessions_staff_id_fkey;

alter table public.pos_sessions
  add constraint pos_sessions_staff_id_fkey
  foreign key (staff_id) references auth.users(id) on delete cascade;
