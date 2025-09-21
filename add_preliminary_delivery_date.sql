-- =====================================================
-- Добавление поля предварительной даты поставки
-- Дата: 2025-09-21
-- =====================================================

-- Добавляем новое поле preliminary_delivery_date в таблицу invoices
ALTER TABLE public.invoices
    ADD COLUMN IF NOT EXISTS preliminary_delivery_date DATE;

-- Комментарий к новому полю
COMMENT ON COLUMN public.invoices.preliminary_delivery_date IS 'Предварительная дата поставки (расчетная)';

-- Удаляем поле due_date если оно больше не нужно
-- ALTER TABLE public.invoices DROP COLUMN IF EXISTS due_date;

-- =====================================================
-- Конец скрипта
-- =====================================================