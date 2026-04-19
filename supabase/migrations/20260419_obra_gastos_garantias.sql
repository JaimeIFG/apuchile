-- ─── Tabla obra_gastos ────────────────────────────────────────────────────────
create table if not exists obra_gastos (
  id              uuid primary key default gen_random_uuid(),
  obra_id         uuid not null references obras(id) on delete cascade,
  user_id         uuid references auth.users(id),
  fecha           date,
  concepto        text not null,
  categoria       text default 'General',
  monto           numeric(14,2),
  proveedor       text,
  numero_factura  text,
  numero_oc       text,
  notas           text,
  archivo_url     text,
  archivo_nombre  text,
  created_at      timestamptz default now()
);

alter table obra_gastos enable row level security;

create policy "owner_gastos" on obra_gastos
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── Agregar archivo a obra_garantias ─────────────────────────────────────────
alter table obra_garantias
  add column if not exists archivo_url    text,
  add column if not exists archivo_nombre text;
