-- Keep reference dictionaries up to date for the demo flow
INSERT INTO public.invoice_statuses (code, name)
VALUES ('draft', 'Draft'), ('approved', 'Approved')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO public.payment_statuses (code, name)
VALUES ('posted', 'Posted')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO public.payment_types (code, name)
VALUES ('wire', 'Wire transfer')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO public.contractor_types (code, name)
VALUES ('payer', 'Payer company'), ('supplier', 'Supplier company')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

-- Register counterparties used by invoices and payments
WITH typed AS (
  SELECT ct.code, ct.id FROM public.contractor_types ct WHERE ct.code IN ('payer', 'supplier')
)
INSERT INTO public.contractors (type_id, name, inn, created_by)
VALUES
  ((SELECT id FROM typed WHERE code = 'payer'), 'Acme Facilities LLC', '7701234567', '00000000-0000-0000-0000-000000000001'),
  ((SELECT id FROM typed WHERE code = 'supplier'), 'Orbit Trading LLC', '7712345678', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (name) DO NOTHING;

-- Create a draft invoice; calculate_vat_amounts() derives VAT fields before insert
WITH payer AS (
  SELECT id FROM public.contractors WHERE name = 'Acme Facilities LLC'
), supplier AS (
  SELECT id FROM public.contractors WHERE name = 'Orbit Trading LLC'
), status AS (
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
ON CONFLICT (invoice_number) DO NOTHING
RETURNING amount_with_vat, amount_without_vat, vat_amount;

-- Adjust the invoice total; update_updated_at_column() refreshes updated_at automatically
UPDATE public.invoices
SET amount_with_vat = 150000,
    vat_rate = 10
WHERE invoice_number = 'INV-2025-0001'
RETURNING amount_without_vat, vat_amount, updated_at;

-- Record a payment; triggers assign payment_number and touch updated_at
WITH inv AS (
  SELECT id FROM public.invoices WHERE invoice_number = 'INV-2025-0001'
), status AS (
  SELECT id FROM public.payment_statuses WHERE code = 'posted'
), ptype AS (
  SELECT id FROM public.payment_types WHERE code = 'wire'
)
INSERT INTO public.payments (
  invoice_id,
  amount,
  payment_date,
  description,
  status_id,
  payment_type_id,
  created_by
)
VALUES (
  (SELECT id FROM inv),
  80000,
  CURRENT_DATE,
  'First installment',
  (SELECT id FROM status),
  (SELECT id FROM ptype),
  '00000000-0000-0000-0000-000000000001'
)
RETURNING id, payment_number, updated_at;

-- Link the payment to the invoice allocation table
WITH inv AS (
  SELECT id FROM public.invoices WHERE invoice_number = 'INV-2025-0001'
), pay AS (
  SELECT id FROM public.payments WHERE invoice_id = (SELECT id FROM inv) ORDER BY created_at DESC LIMIT 1
)
INSERT INTO public.invoice_payments (invoice_id, payment_id, allocated_amount)
VALUES (
  (SELECT id FROM inv),
  (SELECT id FROM pay),
  80000
)
ON CONFLICT (invoice_id, payment_id) DO UPDATE SET allocated_amount = EXCLUDED.allocated_amount;

-- Show invoice ledger view with allocations applied
SELECT
  i.invoice_number,
  i.amount_with_vat,
  i.amount_without_vat,
  COALESCE(SUM(ip.allocated_amount), 0) AS paid_amount,
  i.updated_at
FROM public.invoices i
LEFT JOIN public.invoice_payments ip ON ip.invoice_id = i.id
WHERE i.invoice_number = 'INV-2025-0001'
GROUP BY i.id;

-- Create a material request; update_material_requests_updated_at() maintains timestamps
INSERT INTO public.material_requests (
  request_number,
  request_date,
  created_by
)
VALUES (
  'MR-2025-0005',
  CURRENT_DATE,
  '00000000-0000-0000-0000-000000000001'
)
ON CONFLICT (request_number) DO UPDATE SET request_date = EXCLUDED.request_date
RETURNING id, total_items, updated_at;

-- Add items: update_material_request_items_count() recalculates total_items after insert
WITH req AS (
  SELECT id FROM public.material_requests WHERE request_number = 'MR-2025-0005'
)
INSERT INTO public.material_request_items (
  material_request_id,
  material_name,
  unit,
  quantity,
  sort_order
)
VALUES
  ((SELECT id FROM req), 'Cable tray 50mm', 'pcs', 40, 1),
  ((SELECT id FROM req), 'Mounting brackets', 'pcs', 80, 2)
ON CONFLICT DO NOTHING;

-- Verify the trigger kept the parent counter in sync
SELECT request_number, total_items
FROM public.material_requests
WHERE request_number = 'MR-2025-0005';
