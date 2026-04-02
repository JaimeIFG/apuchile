-- ============================================================
-- Bucket de Storage para archivos de Obras
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- Crear el bucket (si no existe)
insert into storage.buckets (id, name, public)
values ('obras-docs', 'obras-docs', true)
on conflict (id) do nothing;

-- Policy: usuarios autenticados pueden subir archivos
create policy "obras_docs_upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'obras-docs');

-- Policy: acceso público para leer (URLs públicas funcionan)
create policy "obras_docs_read" on storage.objects
  for select using (bucket_id = 'obras-docs');

-- Policy: el dueño puede eliminar sus archivos
create policy "obras_docs_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'obras-docs' and auth.uid()::text = (storage.foldername(name))[1]);
