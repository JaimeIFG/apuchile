-- Modificaciones de contrato
create table if not exists public.obra_modificaciones (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid references public.obras(id) on delete cascade not null,
  numero int,
  tipo text not null, -- 'Aumento de Obras' | 'Disminución de Obras' | 'Ampliación de Plazo' | 'Mixta'
  descripcion text,
  monto_modificacion numeric default 0,
  dias_adicionales int default 0,
  fecha date,
  decreto text,
  created_at timestamptz default now()
);
alter table public.obra_modificaciones enable row level security;
drop policy if exists "auth modificaciones" on public.obra_modificaciones;
create policy "auth modificaciones" on public.obra_modificaciones for all using (auth.role() = 'authenticated');

-- Recepciones
create table if not exists public.obra_recepciones (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid references public.obras(id) on delete cascade not null,
  tipo text not null, -- 'Provisoria' | 'Definitiva'
  fecha_solicitud date,
  fecha_recepcion date,
  estado text default 'Solicitada',
  observaciones text,
  acta_url text,
  acta_nombre text,
  inspector text,
  created_at timestamptz default now()
);
alter table public.obra_recepciones enable row level security;
drop policy if exists "auth recepciones" on public.obra_recepciones;
create policy "auth recepciones" on public.obra_recepciones for all using (auth.role() = 'authenticated');
