-- Órdenes de Compra por Obra
create table if not exists obra_ordenes_compra (
  id          uuid primary key default gen_random_uuid(),
  obra_id     uuid not null references obras(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,

  -- Identificación
  numero            text not null,
  fecha             date not null default current_date,
  estado            text not null default 'borrador' check (estado in ('borrador','emitida','anulada')),
  moneda            text not null default 'CLP',

  -- Proveedor
  proveedor_nombre    text,
  proveedor_rut       text,
  proveedor_direccion text,
  proveedor_contacto  text,
  proveedor_email     text,
  proveedor_telefono  text,

  -- Referencia y condiciones
  ref_obra          text,
  condicion_pago    text,
  plazo_entrega     text,
  lugar_entrega     text,
  observaciones     text,

  -- Firma
  firma_nombre  text,
  firma_cargo   text,
  firma_rut     text,

  -- Empresa emisora (snapshot al momento de emisión)
  empresa_nombre    text,
  empresa_rut       text,
  empresa_direccion text,
  empresa_telefono  text,
  empresa_email     text,

  -- Totales calculados
  subtotal  numeric(14,2) default 0,
  iva       numeric(14,2) default 0,
  total     numeric(14,2) default 0,

  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Ítems de la OC
create table if not exists obra_oc_items (
  id          uuid primary key default gen_random_uuid(),
  oc_id       uuid not null references obra_ordenes_compra(id) on delete cascade,
  orden       integer not null default 0,
  descripcion text not null,
  unidad      text,
  cantidad    numeric(12,4) default 1,
  precio_unitario numeric(14,2) default 0,
  total       numeric(14,2) default 0
);

-- RLS
alter table obra_ordenes_compra enable row level security;
alter table obra_oc_items enable row level security;

-- Política: solo el dueño puede ver/editar
create policy "owner_oc" on obra_ordenes_compra
  for all using (auth.uid() = user_id);

create policy "owner_oc_items" on obra_oc_items
  for all using (
    oc_id in (
      select id from obra_ordenes_compra where user_id = auth.uid()
    )
  );

-- Índices
create index if not exists idx_oc_obra_id on obra_ordenes_compra(obra_id);
create index if not exists idx_oc_items_oc_id on obra_oc_items(oc_id);
