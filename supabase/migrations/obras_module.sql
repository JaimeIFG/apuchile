-- ============================================================
-- Módulo Ejecución de Obras — APUchile
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- Tabla principal de obras
create table if not exists public.obras (
  id              uuid default gen_random_uuid() primary key,
  user_id         uuid references auth.users(id) on delete cascade not null,
  nombre          text not null,
  -- Estado general
  estado_obra     text default 'En ejecución',  -- En licitación | En ejecución | Paralizada | Recepcionada | Liquidada
  -- Información básica
  region          text,
  mandante        text,
  unidad_tecnica  text,
  ito             text,   -- Inspector Técnico de Obra
  contratista     text,
  rut_contratista text,
  -- Decreto/Contrato
  numero_decreto  text,
  fecha_decreto   date,
  numero_contrato text,
  fecha_contrato  date,
  -- Plazos
  plazo_dias      integer,
  fecha_inicio    date,
  fecha_termino_contractual date,
  fecha_termino_real        date,
  -- Montos
  presupuesto_oficial numeric(18,2),
  monto_contrato      numeric(18,2),
  -- Link opcional a proyecto APU
  proyecto_id     uuid,
  -- Metadata
  notas           text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- Documentos (Banco de Datos — 15 categorías)
create table if not exists public.obra_documentos (
  id            uuid default gen_random_uuid() primary key,
  obra_id       uuid references public.obras(id) on delete cascade not null,
  categoria     text not null,  -- Actas | Bases | Decretos | Orden de Compra | Contratos y Modificaciones |
                                -- Caución de Garantías | Estados de Pago | Oficios | Contratista |
                                -- Multas | Recepciones | Liquidaciones | Contraloría | Carta Gantt y Planos | Varios
  nombre        text not null,
  descripcion   text,
  fecha         date,
  archivo_url   text,
  archivo_nombre text,
  archivo_size  bigint,
  created_at    timestamptz default now()
);

-- Estados de Pago
create table if not exists public.obra_estados_pago (
  id                  uuid default gen_random_uuid() primary key,
  obra_id             uuid references public.obras(id) on delete cascade not null,
  nombre              text not null,
  tipo                text,   -- Certificado | Estado de Pago | Retención | Anticipo
  fecha               date,
  monto               numeric(18,2),
  numero_oficio       text,
  numero_estado_pago  text,
  unidad_pago         text,
  archivo_url         text,
  archivo_nombre      text,
  created_at          timestamptz default now()
);

-- Cauciones / Garantías (con semáforo por días a vencimiento)
create table if not exists public.obra_garantias (
  id                uuid default gen_random_uuid() primary key,
  obra_id           uuid references public.obras(id) on delete cascade not null,
  tipo              text,   -- Seriedad Oferta | Fiel Cumplimiento | Anticipo | Correcta Ejecución | Otra
  descripcion       text,
  monto             numeric(18,2),
  entidad           text,   -- Banco o institución
  numero_documento  text,
  fecha_emision     date,
  fecha_vencimiento date,
  estado            text default 'Vigente',  -- Vigente | Vencida | Ejecutada | Devuelta
  created_at        timestamptz default now()
);

-- Bitácora
create table if not exists public.obra_bitacora (
  id          uuid default gen_random_uuid() primary key,
  obra_id     uuid references public.obras(id) on delete cascade not null,
  fecha       date default current_date,
  tipo        text default 'Observación',  -- Observación | Avance | Problema | Reunión | Hito
  descripcion text not null,
  autor       text,
  user_id     uuid references auth.users(id),
  created_at  timestamptz default now()
);

-- ── RLS Policies ────────────────────────────────────────────

alter table public.obras              enable row level security;
alter table public.obra_documentos    enable row level security;
alter table public.obra_estados_pago  enable row level security;
alter table public.obra_garantias     enable row level security;
alter table public.obra_bitacora      enable row level security;

-- obras: solo el dueño puede ver/editar
create policy "obras_owner" on public.obras
  for all using (auth.uid() = user_id);

-- sub-tablas: acceso por join a obra
create policy "obra_documentos_owner" on public.obra_documentos
  for all using (
    exists (select 1 from public.obras where id = obra_id and user_id = auth.uid())
  );

create policy "obra_estados_pago_owner" on public.obra_estados_pago
  for all using (
    exists (select 1 from public.obras where id = obra_id and user_id = auth.uid())
  );

create policy "obra_garantias_owner" on public.obra_garantias
  for all using (
    exists (select 1 from public.obras where id = obra_id and user_id = auth.uid())
  );

create policy "obra_bitacora_owner" on public.obra_bitacora
  for all using (
    exists (select 1 from public.obras where id = obra_id and user_id = auth.uid())
  );

-- ── Índices ────────────────────────────────────────────────
create index if not exists idx_obras_user_id         on public.obras(user_id);
create index if not exists idx_obra_documentos_obra  on public.obra_documentos(obra_id);
create index if not exists idx_obra_ep_obra          on public.obra_estados_pago(obra_id);
create index if not exists idx_obra_garantias_obra   on public.obra_garantias(obra_id);
create index if not exists idx_obra_bitacora_obra    on public.obra_bitacora(obra_id);
