-- Tabla de mensajes del chat por proyecto
CREATE TABLE IF NOT EXISTS proyecto_mensajes (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  proyecto_id uuid NOT NULL,
  user_id     uuid NOT NULL,
  nombre      text NOT NULL,
  mensaje     text NOT NULL,
  created_at  timestamptz DEFAULT now()
);

-- Índice para consultas por proyecto ordenadas por tiempo
CREATE INDEX IF NOT EXISTS idx_proyecto_mensajes_proyecto_id
  ON proyecto_mensajes(proyecto_id, created_at);

-- RLS
ALTER TABLE proyecto_mensajes ENABLE ROW LEVEL SECURITY;

-- Pueden leer mensajes: dueño del proyecto o colaboradores
CREATE POLICY "mensajes_select" ON proyecto_mensajes
  FOR SELECT USING (
    proyecto_id IN (
      SELECT id FROM proyectos WHERE user_id = auth.uid()
    ) OR
    proyecto_id IN (
      SELECT proyecto_id FROM proyecto_colaboradores WHERE user_id = auth.uid()
    )
  );

-- Pueden insertar: cualquier usuario autenticado (la lógica de quién pertenece al proyecto está en el frontend)
CREATE POLICY "mensajes_insert" ON proyecto_mensajes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Habilitar Realtime en la tabla
ALTER PUBLICATION supabase_realtime ADD TABLE proyecto_mensajes;
