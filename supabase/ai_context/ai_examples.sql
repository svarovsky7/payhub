-- Справочники статусов и типов счетов
INSERT INTO public.invoice_statuses (code, name, description, sort_order)
VALUES
  ('draft', 'Черновик', 'Счет готовится к отправке', 10),
  ('pending', 'Ожидает оплату', 'Выставлен клиенту, деньги ещё не поступили', 20),
  ('paid', 'Оплачен', 'Средства поступили и распределены', 30)
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

INSERT INTO public.invoice_types (code, name, description)
VALUES
  ('services', 'Услуги', 'Оплата работ или услуг'),
  ('materials', 'Материалы', 'Поставка материалов и ТМЦ')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

-- Базовые справочники для платежей
INSERT INTO public.payment_statuses (code, name, description)
VALUES
  ('draft', 'Черновик', 'Платёж создан, но ещё не проведён'),
  ('processing', 'В обработке', 'Проверяется и согласуется'),
  ('settled', 'Проведён', 'Платёж успешно закрыт')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO public.payment_types (code, name)
VALUES
  ('wire', 'Банковский перевод'),
  ('cashless', 'Безналичный платёж')
ON CONFLICT (code) DO NOTHING;

-- Создание типа и двух контрагентов
INSERT INTO public.contractor_types (code, name, description)
VALUES ('vendor', 'Поставщик', 'Контрагент, предоставляющий товары или услуги')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO public.contractors (type_id, name, inn, created_by)
VALUES
  ((SELECT id FROM public.contractor_types WHERE code = 'vendor'), 'ООО "ПэйХаб Поставка"', '7712345678', '00000000-0000-0000-0000-000000000001'),
  ((SELECT id FROM public.contractor_types WHERE code = 'vendor'), 'ИП Петров И.И.', '503456789012', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (inn) DO NOTHING;

-- Новый проект для учета операций
INSERT INTO public.projects (code, name, description, created_by)
VALUES ('PH-001', 'Внедрение PayHub', 'Проект по запуску внутреннего платёжного центра', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description, updated_at = now();

-- Создание счета: триггер calculate_vat_on_invoice заполнит суммы НДС
INSERT INTO public.invoices (
  user_id, invoice_number, invoice_date, due_date,
  payer_id, supplier_id, project_id,
  invoice_type_id, amount_with_vat, vat_rate, status_id
)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'INV-2025-001', CURRENT_DATE, CURRENT_DATE + INTERVAL '10 days',
  (SELECT id FROM public.contractors WHERE inn = '7712345678'),
  (SELECT id FROM public.contractors WHERE inn = '503456789012'),
  (SELECT id FROM public.projects WHERE code = 'PH-001'),
  (SELECT id FROM public.invoice_types WHERE code = 'services'),
  118000, 20,
  (SELECT id FROM public.invoice_statuses WHERE code = 'pending')
)
RETURNING id;

-- Обновление суммы счета: обновит и updated_at, и суммы НДС
UPDATE public.invoices
SET amount_with_vat = 236000
WHERE invoice_number = 'INV-2025-001';

-- Фиксация платежа и автоматическое заполнение updated_at
INSERT INTO public.payments (
  invoice_id, payment_number, payment_date, amount,
  description, payment_type_id, status_id, created_by
)
VALUES (
  (SELECT id FROM public.invoices WHERE invoice_number = 'INV-2025-001'),
  nextval('payment_number_seq'),
  CURRENT_DATE,
  118000,
  'Первый транш по договору INV-2025-001',
  (SELECT id FROM public.payment_types WHERE code = 'wire'),
  (SELECT id FROM public.payment_statuses WHERE code = 'processing'),
  '00000000-0000-0000-0000-000000000001'
)
RETURNING id;

-- Распределение платежа на счет
INSERT INTO public.invoice_payments (invoice_id, payment_id, allocated_amount)
VALUES (
  (SELECT id FROM public.invoices WHERE invoice_number = 'INV-2025-001'),
  (SELECT id FROM public.payments ORDER BY created_at DESC LIMIT 1),
  118000
)
ON CONFLICT (invoice_id, payment_id) DO UPDATE SET allocated_amount = EXCLUDED.allocated_amount;

-- Настройка маршрута и этапа согласования платежей
INSERT INTO public.approval_routes (id, invoice_type_id, name, is_active)
VALUES (1, (SELECT id FROM public.invoice_types WHERE code = 'services'), 'Согласование платежей по услугам', true)
ON CONFLICT (id) DO UPDATE SET is_active = EXCLUDED.is_active;

INSERT INTO public.workflow_stages (id, route_id, order_index, role_id, name)
VALUES (1, 1, 1, (SELECT id FROM public.roles LIMIT 1), 'Финансовый контроль')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Запуск согласования платежа и фиксация действия по этапу
INSERT INTO public.payment_approvals (payment_id, route_id, status_id)
VALUES (
  (SELECT id FROM public.payments ORDER BY created_at DESC LIMIT 1),
  1,
  (SELECT id FROM public.payment_statuses WHERE code = 'processing')
)
ON CONFLICT (payment_id) DO NOTHING;

INSERT INTO public.approval_steps (payment_approval_id, stage_id, action, acted_by, acted_at, comment)
VALUES (
  (SELECT id FROM public.payment_approvals ORDER BY created_at DESC LIMIT 1),
  1,
  'approve',
  '00000000-0000-0000-0000-000000000001',
  now(),
  'Согласовано в один клик'
);

-- Примеры вызова бизнес-функций
SELECT public.delete_contractor_type(type_id_param := (SELECT id FROM public.contractor_types WHERE code = 'vendor'));
SELECT public.delete_project(project_id_param := (SELECT id FROM public.projects WHERE code = 'PH-001'));
-- Функция public.calculate_vat_amounts() вызывается триггером calculate_vat_on_invoice и вручную не запускается.
