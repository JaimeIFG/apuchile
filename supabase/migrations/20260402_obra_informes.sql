create table if not exists public.obra_informes (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid references public.obras(id) on delete cascade not null,
  tipo text not null, -- 'Semanal' | 'Mensual' | 'Final' | 'Especial'
  periodo_desde date,
  periodo_hasta date,
  datos_json jsonb default '{}',      -- datos generales de la obra snapshot
  partidas_json jsonb default '[]',   -- partidas con avance, estado, descripcion
  created_at timestamptz default now()
);
alter table public.obra_informes enable row level security;
drop policy if exists "auth informes" on public.obra_informes;
create policy "auth informes" on public.obra_informes for all using (auth.role() = 'authenticated');
