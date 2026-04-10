-- Ejecutar en el SQL Editor de Supabase

-- Tabla: notas rápidas desde la app móvil
CREATE TABLE IF NOT EXISTS notas_mobile (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  titulo      text,
  contenido   text NOT NULL,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE notas_mobile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notas propias" ON notas_mobile
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Tabla: fotos de bitácora desde la app móvil
CREATE TABLE IF NOT EXISTS bitacora_fotos (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  obra_id       uuid REFERENCES obras(id) ON DELETE SET NULL,
  url           text NOT NULL,
  storage_path  text NOT NULL,
  descripcion   text,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE bitacora_fotos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fotos propias" ON bitacora_fotos
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Bucket en Storage: obra-archivos (si no existe, créalo en Storage > New bucket)
-- Nombre: obra-archivos
-- Public: true (para que las URLs funcionen sin auth)
