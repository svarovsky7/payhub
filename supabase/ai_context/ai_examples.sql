-- Example SQL operations for PayHub database
-- Generated: 2025-11-15T19:40:27.862Z

-- 1. Create contractor
INSERT INTO contractors (inn, name, created_at, updated_at)
VALUES ('1234567890', 'ООО "Поставщик"', now(), now())
RETURNING id;

-- 2. Create invoice (triggers update_invoices_updated_at)
INSERT INTO invoices (
  invoice_number, invoice_date, supplier_id, payer_id,
  project_id, invoice_type_id, status_id,
  total_amount, vat_amount, user_id, created_at, updated_at
)
VALUES (
  'INV-001', '2025-01-15', 
  (SELECT id FROM contractors LIMIT 1),
  (SELECT id FROM contractors LIMIT 1 OFFSET 1),
  (SELECT id FROM projects WHERE is_active = true LIMIT 1),
  (SELECT id FROM invoice_types WHERE code = 'standard' LIMIT 1),
  (SELECT id FROM invoice_statuses WHERE code = 'draft' LIMIT 1),
  100000.00, 20000.00,
  auth.uid(), now(), now()
)
RETURNING id;

-- 3. Create payment (triggers calculate_payment_vat, update_payments_updated_at)
INSERT INTO payments (
  payment_number, payment_date, invoice_id,
  amount_without_vat, vat_amount, vat_rate,
  status_id, created_by, created_at, updated_at
)
VALUES (
  'PAY-001', '2025-01-20',
  (SELECT id FROM invoices LIMIT 1),
  100000.00, 20000.00, 20,
  (SELECT id FROM payment_statuses WHERE code = 'pending' LIMIT 1),
  auth.uid(), now(), now()
)
RETURNING id;

-- 4. Link payment to invoice (triggers recalculate_invoice_delivery_date)
INSERT INTO invoice_payments (invoice_id, payment_id, linked_at)
VALUES (
  (SELECT id FROM invoices LIMIT 1),
  (SELECT id FROM payments LIMIT 1),
  now()
);

-- 5. Attach document to invoice (triggers log_attachment_changes)
WITH new_attachment AS (
  INSERT INTO attachments (file_name, file_path, file_size, created_by, created_at, updated_at)
  VALUES ('invoice.pdf', 'invoices/invoice.pdf', 102400, auth.uid(), now(), now())
  RETURNING id
)
INSERT INTO invoice_attachments (invoice_id, attachment_id, linked_at)
SELECT (SELECT id FROM invoices LIMIT 1), id, now()
FROM new_attachment;

-- 6. Create approval route
INSERT INTO payment_approvals (
  payment_id, status_id, created_at, updated_at
)
VALUES (
  (SELECT id FROM payments LIMIT 1),
  (SELECT id FROM payment_statuses WHERE code = 'pending' LIMIT 1),
  now(), now()
)
RETURNING id;

-- 7. Add approval step (triggers audit_approval_steps)
INSERT INTO approval_steps (
  payment_approval_id, stage_id, status,
  acted_by, acted_at, created_at, updated_at
)
VALUES (
  (SELECT id FROM payment_approvals LIMIT 1),
  (SELECT id FROM workflow_stages WHERE is_active = true LIMIT 1),
  'approved', auth.uid(), now(), now(), now()
);

-- 8. Query invoices with related data
SELECT 
  i.id, i.invoice_number, i.invoice_date,
  i.total_amount, i.vat_amount,
  s.name as supplier_name, p.name as project_name,
  ist.name as status_name,
  COUNT(DISTINCT ia.attachment_id) as attachments_count,
  COUNT(DISTINCT ip.payment_id) as payments_count
FROM invoices i
LEFT JOIN contractors s ON i.supplier_id = s.id
LEFT JOIN projects p ON i.project_id = p.id
LEFT JOIN invoice_statuses ist ON i.status_id = ist.id
LEFT JOIN invoice_attachments ia ON i.id = ia.invoice_id
LEFT JOIN invoice_payments ip ON i.id = ip.invoice_id
WHERE i.is_archived = false
GROUP BY i.id, s.name, p.name, ist.name
ORDER BY i.created_at DESC
LIMIT 10;
