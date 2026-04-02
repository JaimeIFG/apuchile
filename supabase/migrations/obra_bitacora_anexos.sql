-- Tabla de anexos para entradas de bitácora
create table if not exists public.obra_bitacora_anexos (
  id          uuid default gen_random_uuid() primary key,
  bitacora_id uuid references public.obra_bitacora(id) on delete cascade not null,
  url         text not null,
  nombre      text not null,
  tipo        text,  -- "foto" | "documento" | "otro"
  created_at  timestamptz default now()
);

alter table public.obra_bitacora_anexos enable row level security;

create policy "obra_bitacora_anexos_owner" on public.obra_bitacora_anexos
  for all using (
    exists (
      select 1 from public.obra_bitacora b
      join public.obras o on b.obra_id = o.id
      where b.id = bitacora_id and o.user_id = auth.uid()
    )
  );

create index if not exists idx_obra_bitacora_anexos_bitacora on public.obra_bitacora_anexos(bitacora_id);
