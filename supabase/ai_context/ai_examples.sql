-- Ensure a vendor contractor type exists
INSERT INTO public.contractor_types (code, name, description)
VALUES ('vendor', 'Vendor', 'Suppliers eligible for VAT invoices')
ON CONFLICT (code) DO UPDATE
  SET name = EXCLUDED.name,
      description = EXCLUDED.description;

-- Register payer and supplier contractors
WITH vendor AS (
  SELECT id FROM public.contractor_types WHERE code = 'vendor'
)
INSERT INTO public.contractors (type_id, name, inn, created_by)
VALUES
  ((SELECT id FROM vendor), 'Acme Supplies LLC', '7701234567', '00000000-0000-0000-0000-000000000001'),
  ((SELECT id FROM vendor), 'Orbit Trading LLC', '7712345678', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (name) DO NOTHING;

-- Create a draft invoice and let calculate_vat_amounts derive VAT split
WITH payer AS (
  SELECT id FROM public.contractors WHERE name = 'Acme Supplies LLC'
),
 supplier AS (
  SELECT id FROM public.contractors WHERE name = 'Orbit Trading LLC'
),
 status AS (
  SELECT id FROM public.invoice_statuses WHERE code = 'draft'
)
INSERT INTO public.invoices (
  user_id,
  invoice_number,
  invoice_date,
  payer_id,
  supplier_id,
  status_id,
  amount_with_vat,
  vat_rate,
  description
)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'INV-2025-0001',
  CURRENT_DATE,
  (SELECT id FROM payer),
  (SELECT id FROM supplier),
  (SELECT id FROM status),
  120000,
  20,
  'Office fit-out milestone'
)
RETURNING id, amount_without_vat, vat_amount;

-- Adjust the invoice total; BEFORE UPDATE trigger refreshes VAT and updated_at
UPDATE public.invoices
SET amount_with_vat = 150000,
    vat_rate = 10
WHERE invoice_number = 'INV-2025-0001'
RETURNING amount_without_vat, vat_amount, updated_at;

-- Record a payment against the invoice
WITH inv AS (
  SELECT id FROM public.invoices WHERE invoice_number = 'INV-2025-0001'
)
INSERT INTO public.payments (
  invoice_id,
  amount,
  payment_date,
  description,
  created_by
)
VALUES (
  (SELECT id FROM inv),
  80000,
  CURRENT_DATE,
  'First installment',
  '00000000-0000-0000-0000-000000000001'
)
RETURNING id, payment_number;

-- Allocate the payment to the invoice
WITH inv AS (
  SELECT id FROM public.invoices WHERE invoice_number = 'INV-2025-0001'
),
 pay AS (
  SELECT id FROM public.payments WHERE invoice_id = (SELECT id FROM inv) ORDER BY created_at DESC LIMIT 1
)
INSERT INTO public.invoice_payments (invoice_id, payment_id, allocated_amount)
VALUES (
  (SELECT id FROM inv),
  (SELECT id FROM pay),
  80000
)
ON CONFLICT (invoice_id, payment_id) DO UPDATE
  SET allocated_amount = EXCLUDED.allocated_amount;

-- Quick ledger view that ties invoices to their payments
SELECT
  i.invoice_number,
  i.amount_with_vat,
  i.amount_without_vat,
  SUM(ip.allocated_amount) AS paid_amount,
  i.updated_at
FROM public.invoices i
LEFT JOIN public.invoice_payments ip ON ip.invoice_id = i.id
GROUP BY i.id
ORDER BY i.invoice_date DESC;

-- Remove an unused contractor type via the safety-checked helper
WITH temp_type AS (
  INSERT INTO public.contractor_types (code, name)
  VALUES ('temp-type', 'Temporary type')
  ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
  RETURNING id
)
SELECT public.delete_contractor_type((SELECT id FROM temp_type));

-- Clean up a project along with user assignments
SELECT public.delete_project(p.id)
FROM public.projects p
WHERE p.code = 'DEMO-PROJECT';
