-- Tabla de partidas presupuestarias
create table if not exists public.obra_presupuesto (
  id          uuid default gen_random_uuid() primary key,
  obra_id     uuid references public.obras(id) on delete cascade not null,
  item        text,
  seccion     text,
  partida     text not null,
  unidad      text,
  cantidad    numeric,
  valor_unitario numeric,
  valor_total numeric,
  orden       int,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table public.obra_presupuesto enable row level security;

create policy "obra_presupuesto_owner" on public.obra_presupuesto
  for all using (
    exists (select 1 from public.obras where id = obra_id and user_id = auth.uid())
  );

create index if not exists idx_obra_presupuesto_obra on public.obra_presupuesto(obra_id);
create index if not exists idx_obra_presupuesto_orden on public.obra_presupuesto(orden);
