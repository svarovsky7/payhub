-- Проверяем и настраиваем права доступа к Storage bucket 'attachments'

-- ВНИМАНИЕ: Этот скрипт отключает RLS для bucket 'attachments'
-- Это означает, что все аутентифицированные пользователи смогут читать/писать/удалять файлы
-- В продакшене рекомендуется настроить более строгие политики

-- Сначала проверяем существующие политики для storage.objects
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects';

-- Удаляем все существующие политики для bucket 'attachments'
DROP POLICY IF EXISTS "Allow authenticated users to upload files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to read files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete files" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own files" ON storage.objects;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON storage.objects;

-- Создаем новые политики для bucket 'attachments'

-- Политика для загрузки файлов (INSERT)
CREATE POLICY "Authenticated users can upload to attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'attachments');

-- Политика для чтения файлов (SELECT)
CREATE POLICY "Authenticated users can read from attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'attachments');

-- Политика для удаления файлов (DELETE)
CREATE POLICY "Authenticated users can delete from attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'attachments');

-- Политика для обновления файлов (UPDATE)
CREATE POLICY "Authenticated users can update in attachments"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'attachments')
WITH CHECK (bucket_id = 'attachments');

-- Альтернативный вариант: одна политика для всех операций
-- Раскомментируйте, если хотите использовать этот подход вместо отдельных политик выше

-- CREATE POLICY "Allow all operations for authenticated users on attachments"
-- ON storage.objects FOR ALL
-- TO authenticated
-- USING (bucket_id = 'attachments')
-- WITH CHECK (bucket_id = 'attachments');

-- Проверяем права на bucket
SELECT * FROM storage.buckets WHERE id = 'attachments';

-- Убеждаемся, что bucket существует и публичный доступ правильно настроен
UPDATE storage.buckets
SET
  public = false, -- Bucket не должен быть публичным
  avif_autodetection = false,
  file_size_limit = 52428800, -- 50MB лимит на файл
  allowed_mime_types = NULL -- Разрешаем все типы файлов
WHERE id = 'attachments';

-- Создаем bucket если он не существует
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('attachments', 'attachments', false, 52428800, NULL)
ON CONFLICT (id) DO NOTHING;

-- Выводим финальный статус политик
SELECT
  'Final policies for attachments bucket' as info,
  policyname,
  cmd,
  permissive
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND qual::text LIKE '%attachments%';