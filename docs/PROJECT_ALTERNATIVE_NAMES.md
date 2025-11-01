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

---

# Альтернативные названия контрагентов

## Описание

Функция позволяет хранить несколько названий под одним ИНН контрагента и выбирать основное название для отображения на портале.

## Структура БД

### Таблица `contractor_alternative_names`

```sql
CREATE TABLE public.contractor_alternative_names (
  id BIGSERIAL PRIMARY KEY,
  contractor_id INTEGER NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  alternative_name CHARACTER VARYING NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(contractor_id, alternative_name)
);
```

### Изменения в таблице `contractors`

```sql
ALTER TABLE public.contractors 
ADD COLUMN IF NOT EXISTS primary_name_id BIGINT REFERENCES public.contractor_alternative_names(id);
```

## Использование на странице /admin/contractors

### Управление названиями

1. Нажать кнопку **"Названия"** в строке контрагента
2. В модальном окне появится список всех названий
3. Для каждого названия:
   - **Радиокнопка** - выбрать как основное
   - **Удалить** - удалить название
4. **Добавить новое название** - ввести в поле и нажать Enter или "Добавить"

### Где используется основное название

Основное название отображается:
- На странице контрагентов (колонка "Основное название")
- При выборе контрагента в счётах
- При выборе контрагента в договорах
- При выборе контрагента в письмах

## Примеры

```
ИНН: 1234567890
Названия:
- ГРУППА КОМПАНИЙ СТИС
- ГРУППА КОМПАНИЙ СТИС ООО
- СТИС ГК ООО (основное ✓)
- СТИС ГРУППА КОМПАНИЙ
```

## SQL примеры

### Получить контрагента с основным названием

```sql
SELECT 
  c.*,
  can.alternative_name as primary_name
FROM contractors c
LEFT JOIN contractor_alternative_names can 
  ON c.id = can.contractor_id AND can.is_primary = true
ORDER BY c.name;
```

### Получить все названия контрагента

```sql
SELECT 
  contractor_id,
  alternative_name,
  is_primary
FROM contractor_alternative_names
WHERE contractor_id = 123
ORDER BY CASE WHEN is_primary THEN 0 ELSE 1 END, sort_order;
```

### Найти контрагента по альтернативному названию

```sql
SELECT DISTINCT c.*
FROM contractors c
WHERE c.id IN (
  SELECT contractor_id FROM contractor_alternative_names 
  WHERE alternative_name ILIKE '%СТИС%'
) OR c.name ILIKE '%СТИС%';
```

## Миграция существующих данных

Запустить скрипт из `supabase/migrations/prod.sql` (последние строки)