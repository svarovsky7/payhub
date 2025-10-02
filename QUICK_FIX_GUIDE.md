# Быстрое руководство по применению исправлений

## 🚀 ЗА 5 МИНУТ

### Шаг 1: Исправить БД на сервере (1 мин)

**Через Supabase SQL Editor:**
1. Откройте https://api-p1.fvds.ru → SQL Editor
2. Скопируйте **`supabase/migrations/fix-database-schema-issues.sql`**
3. Вставьте и нажмите **Run**
4. Проверьте вывод - должны увидеть "✓ ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ"

**Или через psql:**
```bash
set PGPASSWORD=ваш_пароль
psql -h 31.128.51.210 -p 8001 -U postgres -d postgres -f supabase/migrations/fix-database-schema-issues.sql
```

### Шаг 2: Применить автоисправления в коде (2 мин)

```bash
# Запустить скрипт автоматических исправлений
node scripts/apply-fixes.js

# Проверить что изменилось
git diff

# Проверить линтинг
npm run lint

# Проверить билд
npm run build
```

### Шаг 3: Исправить React Hooks вручную (2 мин)

**3 файла требуют ручного исправления:**

#### 1. `src/components/admin/ContractorsTab.tsx:21`

**Было:**
```typescript
useEffect(() => {
  loadContractors()
}, []) // ❌ Missing dependency: 'loadContractors'
```

**Вариант A (рекомендуется):**
```typescript
const loadContractors = useCallback(async () => {
  // ... код функции
}, [/* dependencies */])

useEffect(() => {
  loadContractors()
}, [loadContractors])
```

**Вариант B (быстрый):**
```typescript
useEffect(() => {
  loadContractors()
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [])
```

#### 2. `src/components/admin/ApprovalRoutesTab.tsx:106`

**Было:**
```typescript
useEffect(() => {
  loadReferences()
  loadRoutes()
}, []) // ❌ Missing: 'loadReferences', 'loadRoutes'
```

**Исправление:**
```typescript
const loadReferences = useCallback(async () => {
  // ...
}, [])

const loadRoutes = useCallback(async () => {
  // ...
}, [])

useEffect(() => {
  loadReferences()
  loadRoutes()
}, [loadReferences, loadRoutes])
```

#### 3. `src/components/admin/MaterialNomenclatureTab.tsx:102`

**Было:**
```typescript
useEffect(() => {
  loadClasses()
  loadData()
}, []) // ❌ Missing: 'loadClasses', 'loadData'
```

**Исправление:** Аналогично предыдущему

---

## 📋 ЧТО СДЕЛАЕТ АВТОСКРИПТ

### ✅ Автоматически исправит:

1. **TypeScript типы в approval services:**
   - Заменит `(s: any)` на `(s: WorkflowStage)`
   - Добавит proper type imports
   - Файлы: `approvalActions.ts`, `ApprovalRoutesTab.tsx`

2. **Добавит Error Handler в 10 services:**
   - Добавит `import { handleError, parseSupabaseError }`
   - Файлы: `paymentOperations.ts`, `contractOperations.ts`, и др.

### ⚠️ Требует ручного исправления:

3. **React Hooks dependencies (3 файла):**
   - `ContractorsTab.tsx`
   - `ApprovalRoutesTab.tsx`
   - `MaterialNomenclatureTab.tsx`

---

## 🔍 ПРОВЕРКА ПОСЛЕ ПРИМЕНЕНИЯ

### 1. Проверить БД
```sql
-- Выполните в Supabase SQL Editor
SELECT
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table,
    rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints rc
    ON rc.constraint_name = tc.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.table_name = 'user_profiles'
  AND tc.constraint_type = 'FOREIGN KEY';

-- Должны увидеть:
-- user_profiles_id_fkey      | id      | users       | CASCADE
-- user_profiles_role_id_fkey | role_id | roles       | SET NULL
```

### 2. Проверить код
```bash
# ESLint
npm run lint

# Должно остаться:
# - 0 critical errors (было 2)
# - ~50 errors 'no-explicit-any' (было 60+)
# - 3 warnings 'exhaustive-deps' (было 7+)

# TypeScript
npm run build

# Должно пройти без ошибок
```

### 3. Тестировать функционал
```bash
# Запустить dev server
npm run dev

# Протестировать:
# 1. Регистрация пользователя (должна назначиться роль 'user')
# 2. Вход с новым пользователем
# 3. Проверка доступа к страницам (авторизация работает корректно)
# 4. Создание счёта/платежа (error handling работает)
```

---

## 📊 ПРОГРЕСС ИСПРАВЛЕНИЙ

### ДО:
- 🔴 2 критических проблемы безопасности
- 🟡 60+ `any` в коде
- 🟡 7+ missing hook dependencies
- 🟡 201 console.log в production
- 🟡 0 centralized error handling

### ПОСЛЕ АВТОСКРИПТА:
- ✅ 0 критических проблем безопасности
- ⚠️ ~50 `any` в коде (улучшение на 17%)
- ⚠️ 3 missing hook dependencies (улучшение на 57%)
- ⚠️ 201 console.log (не изменилось)
- ✅ Error handler готов к использованию

### ПОСЛЕ РУЧНЫХ ИСПРАВЛЕНИЙ:
- ✅ 0 критических проблем
- ⚠️ ~45 `any` (требуется дальнейшая работа)
- ✅ 0 missing hook dependencies
- ⚠️ 201 console.log (требуется дальнейшая работа)
- ✅ Error handler готов

---

## 🎯 ДАЛЬНЕЙШИЕ ШАГИ

### Приоритет 1 (на этой неделе):
- [ ] Заменить оставшиеся `any` на proper types
- [ ] Применить error handler во всех services
- [ ] Удалить console.log из production build

### Приоритет 2 (в течение месяца):
- [ ] Добавить unit тесты (Vitest)
- [ ] Настроить CI/CD с ESLint
- [ ] Интегрировать Sentry для error tracking
- [ ] Добавить pre-commit hooks

### Приоритет 3 (когда будет время):
- [ ] Рефакторинг старого кода
- [ ] Оптимизация production bundle
- [ ] Добавить E2E тесты
- [ ] Документация API

---

## ⚠️ ВАЖНО

### После применения исправлений:

1. **Обязательно протестируйте:**
   - Регистрацию пользователей
   - Авторизацию и доступ к страницам
   - Создание/редактирование счетов
   - Процесс согласования платежей

2. **Сделайте коммит:**
```bash
git add .
git commit -m "fix: apply critical security and type safety fixes

- Fix authorization bypass vulnerability
- Fix race condition in auth context
- Add TypeScript types for approval system
- Add centralized error handler
- Fix React hooks dependencies

BREAKING CHANGE: Users without assigned role now have no access to protected pages
```

3. **Создайте backup БД** перед применением SQL-скрипта (на всякий случай)

---

## 🆘 ПОМОЩЬ

Если что-то пошло не так:

1. **БД проблемы:**
   - Проверьте логи PostgreSQL
   - Откатите изменения: восстановите backup
   - Попросите помощь у DBA

2. **Код проблемы:**
   - Откатите: `git reset --hard HEAD`
   - Проверьте что не сломали: `npm run build`
   - Примените исправления по одному

3. **Production проблемы:**
   - Немедленно откатите deployment
   - Проверьте логи ошибок
   - Тестируйте на staging перед production

---

## ✅ ЧЕКЛИСТ

Перед тем как считать задачу выполненной:

- [ ] SQL-скрипт выполнен успешно
- [ ] `node scripts/apply-fixes.js` выполнен
- [ ] React Hooks dependencies исправлены вручную
- [ ] `npm run lint` показывает улучшение
- [ ] `npm run build` проходит успешно
- [ ] Приложение запускается (`npm run dev`)
- [ ] Регистрация пользователей работает
- [ ] Авторизация работает корректно
- [ ] Создан commit с изменениями
- [ ] Обновлена документация (если нужно)

**Готово!** 🎉
