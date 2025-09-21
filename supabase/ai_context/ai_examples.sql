-- Seed invoice workflow statuses
INSERT INTO public.invoice_statuses (code, name, description, sort_order)
VALUES
  ('draft', 'Draft', 'New invoice waiting for details', 10),
  ('pending', 'Pending Payment', 'Issued to customer, awaiting funds', 20),
  ('paid', 'Paid', 'Payment received and reconciled', 30)
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

-- Seed invoice types
INSERT INTO public.invoice_types (code, name, description)
VALUES
  ('services', 'Services', 'Time & materials or professional services'),
  ('subscription', 'Subscription', 'Recurring SaaS or retainer billing')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

-- Maintain contractor catalog
INSERT INTO public.contractor_types (code, name, description)
VALUES ('freelancer', 'Freelancer', 'Individual contractor')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

-- Register payer and supplier contractors (updated_at is set by trigger)
INSERT INTO public.contractors (type_id, name, inn, created_by)
VALUES
  ((SELECT id FROM public.contractor_types WHERE code = 'freelancer'), 'Sole Proprietor John Doe', '123456789012', '00000000-0000-0000-0000-000000000001'),
  ((SELECT id FROM public.contractor_types WHERE code = 'freelancer'), 'PayHub Delivery LLC', '774512345678', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (inn) DO NOTHING;

-- Create a project shell for upcoming invoices
INSERT INTO public.projects (code, name, description, created_by)
VALUES ('PAY-001', 'PayHub rollout', 'Internal payment hub rollout', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (code) DO UPDATE SET updated_at = now();

-- Backfill a user profile (normally handle_new_user trigger does this)
INSERT INTO public.user_profiles (id, email, full_name)
VALUES ('00000000-0000-0000-0000-000000000002', 'user@example.com', 'Jane Operator')
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

-- Issue an invoice with VAT breakdown and workflow foreign keys
INSERT INTO public.invoices (
  user_id,
  invoice_number,
  description,
  due_date,
  payer_id,
  supplier_id,
  project_id,
  invoice_type_id,
  status_id,
  amount_with_vat,
  vat_rate,
  vat_amount,
  amount_without_vat,
  delivery_days,
  delivery_days_type,
  preliminary_delivery_date
)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'INV-2025-0001',
  'Milestone payment for PAY-001',
  '2025-09-30',
  (SELECT id FROM public.contractors WHERE inn = '123456789012'),
  (SELECT id FROM public.contractors WHERE inn = '774512345678'),
  (SELECT id FROM public.projects WHERE code = 'PAY-001'),
  (SELECT id FROM public.invoice_types WHERE code = 'services'),
  (SELECT id FROM public.invoice_statuses WHERE code = 'pending'),
  180000.00,
  20,
  30000.00,
  150000.00,
  5,
  'working',
  '2025-10-07'
);

-- Mark invoice as paid via status catalog
UPDATE public.invoices
SET status_id = (SELECT id FROM public.invoice_statuses WHERE code = 'paid')
WHERE invoice_number = 'INV-2025-0001';

-- Map the issuing user to the project for access control
INSERT INTO public.user_projects (user_id, project_id)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  (SELECT id FROM public.projects WHERE code = 'PAY-001')
)
ON CONFLICT (user_id, project_id) DO NOTHING;

-- Analytics query: recent invoices with status, type, payer and supplier
SELECT i.invoice_number,
       i.invoice_date,
       i.amount_with_vat,
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

-- Showcase trigger-managed timestamp on contractor update
UPDATE public.contractors
SET name = 'PayHub Delivery & Logistics LLC'
WHERE inn = '774512345678';
