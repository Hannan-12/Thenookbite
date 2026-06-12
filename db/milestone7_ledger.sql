-- Milestone 7: Ledger / Purchase & Billing

-- Vendors
create table if not exists public.vendors (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  phone       text,
  category    text,
  notes       text,
  created_at  timestamptz default now()
);

-- Purchases (stock bought from vendors)
create table if not exists public.purchases (
  id          uuid primary key default gen_random_uuid(),
  vendor_id   uuid references public.vendors(id) on delete set null,
  vendor_name text not null,
  amount      int not null,
  description text,
  purchase_date date not null default current_date,
  created_at  timestamptz default now()
);

-- Expenses (operational costs: rent, utilities, salaries, etc.)
create table if not exists public.expenses (
  id          uuid primary key default gen_random_uuid(),
  category    text not null,
  amount      int not null,
  description text,
  expense_date date not null default current_date,
  created_at  timestamptz default now()
);

-- Indexes
create index if not exists idx_purchases_date   on public.purchases (purchase_date);
create index if not exists idx_purchases_vendor on public.purchases (vendor_id);
create index if not exists idx_expenses_date    on public.expenses (expense_date);
create index if not exists idx_expenses_cat     on public.expenses (category);

-- Enable RLS
alter table public.vendors   enable row level security;
alter table public.purchases enable row level security;
alter table public.expenses  enable row level security;
