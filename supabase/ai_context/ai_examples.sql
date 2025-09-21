-- Maintain contractor catalog
INSERT INTO public.contractor_types (code, name, description)
VALUES ('freelancer', 'Freelancer', 'Individual contractor')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

-- Register a contractor (updated_at is set by trigger)
INSERT INTO public.contractors (type_id, name, inn, created_by)
VALUES (
  (SELECT id FROM public.contractor_types WHERE code = 'freelancer'),
  'Sole Proprietor John Doe',
  '123456789012',
  '00000000-0000-0000-0000-000000000001'
);

-- Create a project shell for upcoming invoices
INSERT INTO public.projects (code, name, description, created_by)
VALUES ('PAY-001', 'PayHub rollout', 'Internal payment hub rollout', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (code) DO UPDATE SET updated_at = now();

-- Backfill a user profile (normally handle_new_user trigger does this)
INSERT INTO public.user_profiles (id, email, full_name)
VALUES ('00000000-0000-0000-0000-000000000002', 'user@example.com', 'Jane Operator')
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

-- Issue an invoice to a user
INSERT INTO public.invoices (user_id, invoice_number, amount, status, description, due_date)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'INV-2025-0001',
  180000.00,
  'pending',
  'Milestone payment for PAY-001',
  '2025-09-30'
);

-- Mark invoice paid (updated_at is refreshed by trigger)
UPDATE public.invoices
SET status = 'paid'
WHERE invoice_number = 'INV-2025-0001';

-- List most recent invoices for dashboards
SELECT i.invoice_number, i.amount, i.status, i.due_date, up.full_name
FROM public.invoices i
JOIN public.user_profiles up ON up.id = i.user_id
ORDER BY i.created_at DESC
LIMIT 20;

-- Introduce a new internal role
INSERT INTO public.roles (code, name, description)
VALUES ('accountant', 'Accountant', 'Can manage invoices and reconciliation')
ON CONFLICT (code) DO UPDATE SET updated_at = now();

-- Rename a contractor to show trigger-managed timestamps
UPDATE public.contractors
SET name = 'PayHub Delivery LLC'
WHERE inn = '123456789012';

-- Combine contractors with their type for audit
SELECT c.id, c.name, ct.code AS contractor_type, c.updated_at
FROM public.contractors c
JOIN public.contractor_types ct ON ct.id = c.type_id
ORDER BY c.updated_at DESC;
