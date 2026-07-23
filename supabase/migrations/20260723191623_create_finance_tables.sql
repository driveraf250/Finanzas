-- Transactions table
create table if not exists public.transactions (
    id text primary key,
    type text not null check (type in ('income', 'expense')),
    amount numeric not null check (amount > 0),
    category text not null,
    date date not null,
    description text not null,
    created_at timestamptz not null default now()
);

alter table public.transactions enable row level security;

create policy "Allow all access to transactions"
    on public.transactions
    for all
    to anon
    using (true)
    with check (true);

-- Goals table
create table if not exists public.goals (
    id text primary key,
    name text not null,
    target numeric not null check (target > 0),
    current numeric not null default 0 check (current >= 0),
    created_at timestamptz not null default now()
);

alter table public.goals enable row level security;

create policy "Allow all access to goals"
    on public.goals
    for all
    to anon
    using (true)
    with check (true);