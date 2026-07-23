-- Allow 'Regalos' and 'Paseo' as valid tipo values on both tables

alter table public.gastos
    drop constraint gastos_tipo_check;

alter table public.gastos
    add constraint gastos_tipo_check
    check (tipo in ('Comida', 'Transporte', 'Viaje', 'Gasolina', 'Regalos', 'Paseo', 'Otro'));

alter table public.creditos_tasa_cero
    drop constraint creditos_tasa_cero_tipo_check;

alter table public.creditos_tasa_cero
    add constraint creditos_tasa_cero_tipo_check
    check (tipo in ('Comida', 'Transporte', 'Viaje', 'Gasolina', 'Regalos', 'Paseo', 'Otro'));
