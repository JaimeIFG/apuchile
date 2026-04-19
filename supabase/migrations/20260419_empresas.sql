-- ═══════════════════════════════════════════════════════════════
-- SISTEMA DE PERFILES DE EMPRESA / ORGANIZACIONES
-- ═══════════════════════════════════════════════════════════════

-- Tabla principal de empresas
create table if not exists empresas (
  id            uuid primary key default gen_random_uuid(),
  nombre        text not null,
  rut           text,
  giro          text,
  direccion     text,
  ciudad        text,
  telefono      text,
  email         text,
  logo_url      text,
  firma_url     text,
  firma_label   text,
  created_by    uuid not null references auth.users(id) on delete cascade,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- Miembros de la empresa (el creador se agrega automáticamente como admin)
create table if not exists empresa_miembros (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references empresas(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  email       text,
  rol         text not null default 'editor' check (rol in ('admin','editor','visor')),
  invited_by  uuid references auth.users(id),
  created_at  timestamptz default now(),
  unique(empresa_id, user_id)
);

-- Invitaciones pendientes (código de 8 chars, válido 10 minutos)
create table if not exists empresa_invitaciones (
  id                  uuid primary key default gen_random_uuid(),
  empresa_id          uuid not null references empresas(id) on delete cascade,
  email               text not null,
  codigo              text not null,
  rol                 text not null default 'editor',
  empresa_nombre      text,
  invitado_por_nombre text,
  expires_at          timestamptz not null,
  usado               boolean default false,
  created_at          timestamptz default now()
);

-- Agregar empresa_id a obras (para asociarla a un perfil empresa)
alter table obras
  add column if not exists empresa_id uuid references empresas(id) on delete set null;

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table empresas enable row level security;
alter table empresa_miembros enable row level security;
alter table empresa_invitaciones enable row level security;

-- Empresas: el creador y los miembros pueden leer; solo creador puede modificar
create policy "empresa_select" on empresas for select
  using (
    created_by = auth.uid()
    or id in (
      select empresa_id from empresa_miembros where user_id = auth.uid()
    )
  );

create policy "empresa_insert" on empresas for insert
  with check (created_by = auth.uid());

create policy "empresa_update" on empresas for update
  using (created_by = auth.uid());

create policy "empresa_delete" on empresas for delete
  using (created_by = auth.uid());

-- Miembros: miembros y creador de la empresa pueden ver; admin puede insertar/borrar
create policy "miembros_select" on empresa_miembros for select
  using (
    user_id = auth.uid()
    or empresa_id in (
      select id from empresas where created_by = auth.uid()
    )
    or empresa_id in (
      select empresa_id from empresa_miembros where user_id = auth.uid() and rol = 'admin'
    )
  );

create policy "miembros_insert" on empresa_miembros for insert
  with check (
    empresa_id in (
      select id from empresas where created_by = auth.uid()
    )
    or empresa_id in (
      select empresa_id from empresa_miembros where user_id = auth.uid() and rol = 'admin'
    )
  );

create policy "miembros_delete" on empresa_miembros for delete
  using (
    user_id = auth.uid()
    or empresa_id in (
      select id from empresas where created_by = auth.uid()
    )
    or empresa_id in (
      select empresa_id from empresa_miembros where user_id = auth.uid() and rol = 'admin'
    )
  );

-- Invitaciones: solo el creador/admin de la empresa puede leer y crear
create policy "invitaciones_select" on empresa_invitaciones for select
  using (
    empresa_id in (
      select id from empresas where created_by = auth.uid()
    )
    or empresa_id in (
      select empresa_id from empresa_miembros where user_id = auth.uid() and rol = 'admin'
    )
  );

create policy "invitaciones_insert" on empresa_invitaciones for insert
  with check (
    empresa_id in (
      select id from empresas where created_by = auth.uid()
    )
    or empresa_id in (
      select empresa_id from empresa_miembros where user_id = auth.uid() and rol = 'admin'
    )
  );

-- Obras: miembros de la empresa también pueden acceder a las obras de la empresa
drop policy if exists "obras_select" on obras;
create policy "obras_select" on obras for select
  using (
    user_id = auth.uid()
    or (
      empresa_id is not null and empresa_id in (
        select empresa_id from empresa_miembros where user_id = auth.uid()
      )
    )
    or (
      empresa_id is not null and empresa_id in (
        select id from empresas where created_by = auth.uid()
      )
    )
  );

-- Índices
create index if not exists idx_empresas_created_by on empresas(created_by);
create index if not exists idx_miembros_empresa_id on empresa_miembros(empresa_id);
create index if not exists idx_miembros_user_id on empresa_miembros(user_id);
create index if not exists idx_obras_empresa_id on obras(empresa_id);
