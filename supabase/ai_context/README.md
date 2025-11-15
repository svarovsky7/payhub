# AI Context Files

AI-оптимизированные описания структуры БД PayHub для использования в Claude/Codex/других AI.

## Структура

### Манифест
- **ai_manifest.json** — дата генерации, версия, SHA256-хэши источников

### Минимальные описания
- **ai_tables_min.json** (~55 КБ) — таблицы: имя, столбцы (тип/nullable/PK/FK)
- **ai_functions_min.json** — функции: сигнатуры и краткое назначение
- **ai_triggers_min.json** — триггеры: таблица → функция → событие
- **ai_enums_min.json** — перечисления и их значения
- **ai_relations.json** — FK-связи между таблицами

### Полные описания
- **ai_tables_full.json** (~96 КБ) — как min + индексы, check, unique
- **ai_functions_full.json** — как min + полный SQL

### Примеры
- **ai_examples.sql** — эталонные SQL-операции с демонстрацией триггеров

## Генерация

```bash
npm run build:ai-context
```

Источники:
- `supabase/exports/*.json`
- `supabase/migrations/prod.sql`

## Использование

Для Claude/Codex/etc — загружайте нужные файлы в зависимости от задачи:
- Для быстрого обзора → ai_tables_min.json
- Для разработки → ai_tables_full.json + ai_functions_full.json + ai_examples.sql
- Для понимания связей → ai_relations.json

