-- Tabla de fotos de obra
create table if not exists public.obra_fotos (
  id         uuid default gen_random_uuid() primary key,
  obra_id    uuid references public.obras(id) on delete cascade not null,
  url        text not null,
  nombre     text,
  caption    text,
  created_at timestamptz default now()
);

alter table public.obra_fotos enable row level security;

create policy "obra_fotos_owner" on public.obra_fotos
  for all using (
    exists (select 1 from public.obras where id = obra_id and user_id = auth.uid())
  );

create index if not exists idx_obra_fotos_obra on public.obra_fotos(obra_id);
