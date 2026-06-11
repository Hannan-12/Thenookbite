-- Milestone 5: Recipe Controls
-- Run this in Supabase SQL editor

-- Ingredients master list
create table if not exists public.ingredients (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  unit        text not null default 'g',  -- g, kg, ml, L, pcs, tbsp
  created_at  timestamptz not null default now()
);

-- Recipe: which ingredients go into each menu item
create table if not exists public.recipes (
  id              uuid primary key default gen_random_uuid(),
  menu_item_id    uuid not null references public.menu_items(id) on delete cascade,
  ingredient_id   uuid not null references public.ingredients(id) on delete cascade,
  quantity        numeric(10,2) not null default 1,
  created_at      timestamptz not null default now(),
  unique(menu_item_id, ingredient_id)
);

-- Indexes for fast lookups
create index if not exists idx_recipes_menu_item on public.recipes (menu_item_id);
create index if not exists idx_recipes_ingredient on public.recipes (ingredient_id);
