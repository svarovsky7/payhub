-- Функция для удаления файлов из Storage при удалении записей из attachments
-- Эта функция должна быть выполнена с правами service_role

CREATE OR REPLACE FUNCTION delete_storage_files()
RETURNS TRIGGER AS $$
DECLARE
  storage_result INT;
BEGIN
  -- Логируем удаление для отладки
  RAISE NOTICE 'Deleting file from storage: %', OLD.storage_path;

  -- Здесь мы просто записываем путь к файлу
  -- Фактическое удаление из Storage происходит в приложении
  -- так как Postgres функции не имеют прямого доступа к Storage API

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Создаем триггер, который будет вызываться перед удалением записи
CREATE TRIGGER before_attachment_delete
  BEFORE DELETE ON attachments
  FOR EACH ROW
  EXECUTE FUNCTION delete_storage_files();

-- Добавляем индекс для быстрого поиска файлов по invoice_id
CREATE INDEX IF NOT EXISTS idx_invoice_attachments_invoice_id ON invoice_attachments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_attachments_storage_path ON attachments(storage_path);

-- Комментарий к таблице для документирования логики удаления
COMMENT ON TABLE attachments IS 'Таблица для хранения метаданных прикрепленных файлов. При удалении записи, файлы из Storage должны удаляться приложением через handleDelete функцию.';