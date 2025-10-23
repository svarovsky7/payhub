# Альтернативные названия проектов

## Описание

Новая функция позволяет связывать несколько альтернативных названий с одним проектом. Это полезно для проектов, которые могут быть известны под разными названиями или аббревиатурами.

## Структура БД

### Таблица `project_alternative_names`

```sql
CREATE TABLE project_alternative_names (
  id BIGINT PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  alternative_name VARCHAR(255) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

## Использование в интерфейсе

### На странице /admin/projects

1. **Колонка "Связанные названия"** - отображает все альтернативные названия проекта как теги
2. **При редактировании проекта**:
   - Нажать кнопку "Редактировать" на проекте
   - В поле "Связанные названия" можно:
     - Добавить новое название (кнопка "+ Добавить название")
     - Удалить существующее название
   - Сохранить изменения

### Импорт из Excel

1. Нажать кнопку "Загрузить из Excel"
2. Выбрать XLSX файл со следующей структурой:

| Код | Связанные названия |
|-----|-------------------|
| P-001 | Alt Name 1 |
| P-001 | Alt Name 2 |
| P-002 | Another Name |

**Структура:**
- **Код** - уникальный код проекта (обязательно)
- **Связанные названия** - альтернативное название проекта (обязательно)
- Одному коду может соответствовать **несколько строк** с разными названиями
- Система группирует строки по коду и создает/обновляет проект

### Экспорт в Excel

1. Нажать кнопку "Скачать в Excel"
2. Файл содержит все проекты со всеми альтернативными названиями, разделенными `;`

## Примеры

### Вручную через интерфейс
```
Основное название: "Офисное здание"
Альтернативные названия:
- Main Office Building
- ОЗ
- Офис
```

### Через Excel импорт
```
P-123	Строительный комплекс	Комплекс №1; СК-1; Complex	Новый объект
```

## SQL примеры

### Получить проект со всеми альтернативными названиями
```sql
SELECT 
  p.*,
  pan.alternative_name
FROM projects p
LEFT JOIN project_alternative_names pan ON p.id = pan.project_id
ORDER BY p.id, pan.sort_order;
```

### Поиск проекта по альтернативному названию
```sql
SELECT DISTINCT p.*
FROM projects p
WHERE p.id IN (
  SELECT project_id FROM project_alternative_names 
  WHERE alternative_name ILIKE '%поиск%'
) OR p.name ILIKE '%поиск%';
```

### Удалить альтернативное название
```sql
DELETE FROM project_alternative_names 
WHERE id = 123;
```

## Миграция

SQL скрипт находится в:
- `supabase/migrations/prod.sql` (последние строки)
- `supabase/ai_context/project_alternative_names_migration.sql` (отдельный файл)
