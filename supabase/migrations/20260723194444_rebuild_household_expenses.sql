-- Drop previous personal finance tables (superseded by household expense control)
drop table if exists public.transactions cascade;
drop table if exists public.goals cascade;

-- Weekly household expenses
create table public.gastos (
    id uuid primary key default gen_random_uuid(),
    fecha date not null default current_date,
    moneda text not null default 'CRC' check (moneda in ('CRC', 'USD')),
    monto numeric not null check (monto > 0),
    monto_crc numeric not null check (monto_crc > 0),
    tipo text not null check (tipo in ('Comida', 'Transporte', 'Viaje', 'Gasolina', 'Otro')),
    detalle text not null,
    realizado_por text not null,
    cuenta text not null check (cuenta in ('Daniela', 'David', 'DyD', 'Crédito')),
    porcentaje_reembolso numeric not null default 50 check (porcentaje_reembolso >= 0),
    estado text not null default 'Pendiente' check (estado in ('Pendiente', 'Procesado')),
    procesado_por text,
    procesado_fecha timestamptz,
    procesado_detalle text,
    created_at timestamptz not null default now()
);

alter table public.gastos enable row level security;

create policy "Allow all access to gastos"
    on public.gastos
    for all
    to anon
    using (true)
    with check (true);

-- Zero-rate installment credits
create table public.creditos_tasa_cero (
    id uuid primary key default gen_random_uuid(),
    fecha date not null default current_date,
    moneda text not null default 'CRC' check (moneda in ('CRC', 'USD')),
    monto_original numeric not null check (monto_original > 0),
    monto_actual numeric not null check (monto_actual >= 0),
    cuota_mensual numeric not null check (cuota_mensual > 0),
    meses_totales integer not null check (meses_totales > 0),
    meses_pagados integer not null default 0 check (meses_pagados >= 0),
    tipo text not null check (tipo in ('Comida', 'Transporte', 'Viaje', 'Gasolina', 'Otro')),
    detalle text not null,
    realizado_por text not null,
    cuenta text not null check (cuenta in ('Daniela', 'David', 'DyD', 'Crédito')),
    created_at timestamptz not null default now()
);

alter table public.creditos_tasa_cero enable row level security;

create policy "Allow all access to creditos_tasa_cero"
    on public.creditos_tasa_cero
    for all
    to anon
    using (true)
    with check (true);