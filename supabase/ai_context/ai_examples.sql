-- Catalog seed data
INSERT INTO public.invoice_statuses (code, name, description, sort_order)
VALUES
  ('draft', 'Draft', 'New invoice waiting for details', 10),
  ('pending', 'Pending Payment', 'Issued to customer, awaiting funds', 20),
  ('paid', 'Paid', 'Payment received and reconciled', 30)
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

INSERT INTO public.invoice_types (code, name, description)
VALUES
  ('services', 'Services', 'Time & materials or professional services'),
  ('subscription', 'Subscription', 'Recurring SaaS or retainer billing')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO public.contractor_types (code, name, description)
VALUES ('freelancer', 'Freelancer', 'Individual contractor')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

-- Core actors
INSERT INTO public.contractors (type_id, name, inn, created_by)
VALUES
  ((SELECT id FROM public.contractor_types WHERE code = 'freelancer'), 'Sole Proprietor John Doe', '123456789012', '00000000-0000-0000-0000-000000000001'),
  ((SELECT id FROM public.contractor_types WHERE code = 'freelancer'), 'PayHub Delivery LLC', '774512345678', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (inn) DO NOTHING;

INSERT INTO public.projects (code, name, description, created_by)
VALUES ('PAY-001', 'PayHub rollout', 'Internal payment hub rollout', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (code) DO UPDATE SET updated_at = now();

INSERT INTO public.user_profiles (id, email, full_name)
VALUES ('00000000-0000-0000-0000-000000000002', 'user@example.com', 'Jane Operator')
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

-- Attach a supporting document
INSERT INTO public.attachments (id, original_name, storage_path, size_bytes, mime_type, created_by)
VALUES (
  gen_random_uuid(),
  'contract.pdf',
  'invoices/contracts/contract.pdf',
  524288,
  'application/pdf',
  '00000000-0000-0000-0000-000000000001'
)
ON CONFLICT (storage_path) DO NOTHING;

-- Invoice write path (calculate_vat_amounts trigger populates VAT fields)
INSERT INTO public.invoices (
  user_id,
  invoice_number,
  description,
  invoice_date,
  due_date,
  payer_id,
  supplier_id,
  project_id,
  invoice_type_id,
  status_id,
  amount_with_vat,
  vat_rate,
  delivery_days,
  delivery_days_type
)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'INV-2025-0001',
  'Milestone payment for PAY-001',
  '2025-09-15',
  '2025-09-30',
  (SELECT id FROM public.contractors WHERE inn = '123456789012'),
  (SELECT id FROM public.contractors WHERE inn = '774512345678'),
  (SELECT id FROM public.projects WHERE code = 'PAY-001'),
  (SELECT id FROM public.invoice_types WHERE code = 'services'),
  (SELECT id FROM public.invoice_statuses WHERE code = 'pending'),
  180000.00,
  20,
  5,
  'working'
)
RETURNING id AS invoice_id;

-- Link invoice to the uploaded document
INSERT INTO public.invoice_attachments (invoice_id, attachment_id)
VALUES (
  (SELECT id FROM public.invoices WHERE invoice_number = 'INV-2025-0001'),
  (SELECT id FROM public.attachments WHERE storage_path = 'invoices/contracts/contract.pdf')
)
ON CONFLICT (invoice_id, attachment_id) DO NOTHING;

-- Trigger demo: adjust totals, updated_at maintained automatically
UPDATE public.invoices
SET amount_with_vat = 240000.00, vat_rate = 20
WHERE invoice_number = 'INV-2025-0001';

-- Use catalog function to attempt safe deletion (returns JSON message)
SELECT public.delete_contractor_type(type_id_param => (SELECT id FROM public.contractor_types WHERE code = 'freelancer'));

-- Clean up a project along with user bindings
SELECT public.delete_project(project_id_param => (SELECT id FROM public.projects WHERE code = 'PAY-001'));

-- Analytical join with status, type and counterparties
SELECT i.invoice_number,
       i.invoice_date,
       i.amount_with_vat,
       i.vat_amount,
       s.code   AS status_code,
       t.code   AS invoice_type_code,
       payer.name    AS payer_name,
       supplier.name AS supplier_name
FROM public.invoices i
JOIN public.invoice_statuses s ON s.id = i.status_id
LEFT JOIN public.invoice_types t ON t.id = i.invoice_type_id
LEFT JOIN public.contractors payer ON payer.id = i.payer_id
LEFT JOIN public.contractors supplier ON supplier.id = i.supplier_id
ORDER BY i.created_at DESC
LIMIT 20;

-- Updated_at audit trigger showcase on contractors
UPDATE public.contractors
SET name = 'PayHub Delivery & Logistics LLC'
WHERE inn = '774512345678';
