
# Функция публичного доступа к письмам

## Требования

- Таблица БД `letter_public_shares`
- Маршруты приложения для публичного просмотра

## Установка

### 1. Выполнить миграцию БД

```bash
# В Supabase CLI или через SQL Editor
supabase migration up
```

Или скопировать содержимое `supabase/migrations/letter_public_shares.sql` в SQL Editor Supabase.

### 2. Зависимости

Убедитесь, что установлены:
- `qrcode.react` (для отображения QR кодов)

```bash
npm install qrcode.react
```

## Использование

### Генерация QR кода

1. Откройте письмо в режиме редактирования
2. Нажмите кнопку "Сгенерировать QR"
3. Скопируйте ссылку и передайте нужному лицу

### Просмотр письма

- Человек переходит по ссылке
- Переводится на страницу авторизации
- После входа видит письмо с приложениями (только просмотр)

## Технические детали

- **Таблица**: `letter_public_shares` с токеном (16 символов)
- **Маршрут**: `/letter-share/:token`
- **Безопасность**: Требуется авторизация для просмотра
- **Мобильная версия**: Адаптивный дизайн для телефонов

## API функции

```typescript
// Генерирует публичную ссылку на письмо
generatePublicShareLink(letterId: string): Promise<string>

// Получает письмо по токену
getLetterByShareToken(token: string): Promise<Letter | null>
```

## Файлы проекта

- `src/pages/LetterSharePage.tsx` - Компонент просмотра письма
- `src/styles/letter-share-page.css` - Мобильные стили
- `src/services/letterOperations.ts` - Функции для работы с публичными ссылками
- `supabase/migrations/letter_public_shares.sql` - Миграция БД

