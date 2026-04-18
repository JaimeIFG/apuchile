-- ============================================================
-- MIGRACIÓN: Sistema de colaboración APUchile
-- Ejecutar en Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Tabla de colaboradores de proyectos
CREATE TABLE IF NOT EXISTS proyecto_colaboradores (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  proyecto_id uuid NOT NULL,
  user_id     uuid NOT NULL,
  email       text NOT NULL,
  rol         text NOT NULL DEFAULT 'editar', -- visualizar | editar | administrar
  invited_by  uuid,
  joined_at   timestamptz DEFAULT now(),
  UNIQUE(proyecto_id, user_id)
);

-- 2. Tabla de invitaciones con código temporal
CREATE TABLE IF NOT EXISTS proyecto_invitaciones (
  id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  proyecto_id         uuid NOT NULL,
  email               text NOT NULL,
  codigo              text NOT NULL,
  rol                 text NOT NULL DEFAULT 'editar',
  invited_by          uuid,
  proyecto_nombre     text,
  invitado_por_nombre text,
  expires_at          timestamptz NOT NULL,
  usado               boolean DEFAULT false,
  created_at          timestamptz DEFAULT now()
);

-- 3. RLS proyecto_colaboradores
ALTER TABLE proyecto_colaboradores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "colabs_select" ON proyecto_colaboradores
  FOR SELECT USING (
    user_id = auth.uid() OR
    invited_by = auth.uid() OR
    proyecto_id IN (SELECT id FROM proyectos WHERE user_id = auth.uid())
  );

CREATE POLICY "colabs_insert" ON proyecto_colaboradores
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "colabs_delete" ON proyecto_colaboradores
  FOR DELETE USING (
    user_id = auth.uid() OR
    invited_by = auth.uid() OR
    proyecto_id IN (SELECT id FROM proyectos WHERE user_id = auth.uid())
  );

-- 4. RLS proyecto_invitaciones
-- IMPORTANTE: las invitaciones contienen códigos sensibles. El acceso vía
-- SELECT queda cerrado al cliente; la validación de código se hace
-- exclusivamente en el backend con el SERVICE_ROLE_KEY (que bypassa RLS).
-- Así evitamos que un usuario autenticado cualquiera liste códigos/emails
-- de invitaciones de otros proyectos.
ALTER TABLE proyecto_invitaciones ENABLE ROW LEVEL SECURITY;

-- Dueño del proyecto o quien invitó puede listar sus propias invitaciones.
CREATE POLICY "invites_select" ON proyecto_invitaciones
  FOR SELECT USING (
    invited_by = auth.uid() OR
    proyecto_id IN (SELECT id FROM proyectos WHERE user_id = auth.uid())
  );

-- Solo el dueño del proyecto o un administrador colaborador puede crear invitaciones.
-- (La validación fina se hace en la API; RLS exige al menos pertenecer al proyecto).
CREATE POLICY "invites_insert" ON proyecto_invitaciones
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND (
      proyecto_id IN (SELECT id FROM proyectos WHERE user_id = auth.uid()) OR
      proyecto_id IN (
        SELECT proyecto_id FROM proyecto_colaboradores
        WHERE user_id = auth.uid() AND rol = 'administrar'
      )
    )
  );

-- Actualizar (marcar como usada) solo el dueño/invitador. El flujo normal
-- de aceptación se hace en el backend con service_role.
CREATE POLICY "invites_update" ON proyecto_invitaciones
  FOR UPDATE USING (
    invited_by = auth.uid() OR
    proyecto_id IN (SELECT id FROM proyectos WHERE user_id = auth.uid())
  );

-- 5. Permitir que colaboradores lean proyectos compartidos
CREATE POLICY "proyectos_colabs_select" ON proyectos
  FOR SELECT USING (
    user_id = auth.uid() OR
    id IN (SELECT proyecto_id FROM proyecto_colaboradores WHERE user_id = auth.uid())
  );
