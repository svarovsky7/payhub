-- PayHub Database Examples
-- Демонстрирующие работу основных операций и триггеров

-- ========== PROJECTS ==========

-- 1. Create project
INSERT INTO public.projects (code, name, is_active)
VALUES ('PROJ-001', 'Office Building A', true);

-- 2. Create project budget
INSERT INTO public.project_budgets (project_id, total_budget, spent_amount, created_by)
VALUES (
  (SELECT id FROM projects WHERE code = 'PROJ-001'),
  1000000,
  0,
  auth.uid()
);

-- ========== CONTRACTORS ==========

-- 3. Create contractor
INSERT INTO public.contractors (inn, company_name, contact_person, phone, email)
VALUES ('7701234567', 'OOO TechServices', 'Ivan Petrov', '+7-999-888-7766', 'info@tech.ru');

-- ========== INVOICE TYPES & STATUSES ==========

-- 4. Check available invoice types
SELECT * FROM public.invoice_types;

-- 5. Check invoice statuses
SELECT * FROM public.invoice_statuses;

-- ========== INVOICES ==========

-- 6. Create invoice with automatic status assignment (DRAFT)
INSERT INTO public.invoices (
  invoice_number,
  invoice_date,
  invoice_type_id,
  contract_id,
  project_id,
  payer_id,
  supplier_id,
  amount_without_vat,
  vat_rate,
  created_by,
  responsible_id,
  user_id
)
VALUES (
  'INV-2025-001',
  CURRENT_DATE,
  (SELECT id FROM invoice_types WHERE code = 'STANDARD' LIMIT 1),
  (SELECT id FROM contracts LIMIT 1),
  (SELECT id FROM projects WHERE code = 'PROJ-001'),
  (SELECT id FROM contractors LIMIT 1),
  (SELECT id FROM contractors OFFSET 1 LIMIT 1),
  100000,
  18,
  auth.uid(),
  (SELECT id FROM employees LIMIT 1),
  auth.uid()
);

-- 7. Query invoice with calculated VATamount
SELECT 
  id,
  invoice_number,
  amount_without_vat,
  vat_rate,
  (amount_without_vat * vat_rate / 100)::NUMERIC(15,2) AS vat_amount,
  (amount_without_vat + amount_without_vat * vat_rate / 100)::NUMERIC(15,2) AS total_amount,
  status_id
FROM invoices
WHERE invoice_number = 'INV-2025-001';

-- ========== PAYMENTS ==========

-- 8. Create payment (triggers will update invoice status)
INSERT INTO public.payments (
  payment_number,
  invoice_id,
  payment_date,
  amount_without_vat,
  vat_rate,
  status_id,
  created_by
)
VALUES (
  'PAY-2025-001',
  (SELECT id FROM invoices WHERE invoice_number = 'INV-2025-001'),
  CURRENT_DATE,
  100000,
  18,
  (SELECT id FROM payment_statuses WHERE code = 'PENDING' LIMIT 1),
  auth.uid()
);

-- 9. Link payment to invoice via invoice_payments
INSERT INTO public.invoice_payments (invoice_id, payment_id)
VALUES (
  (SELECT id FROM invoices WHERE invoice_number = 'INV-2025-001'),
  (SELECT id FROM payments WHERE payment_number = 'PAY-2025-001')
);

-- 10. Update payment status to COMPLETED (triggers will sync invoice status)
UPDATE payments
SET status_id = (SELECT id FROM payment_statuses WHERE code = 'COMPLETED' LIMIT 1)
WHERE payment_number = 'PAY-2025-001';

-- ========== APPROVAL WORKFLOW ==========

-- 11. Create approval route for invoices
INSERT INTO public.approval_routes (invoice_type_id, route_number)
VALUES (
  (SELECT id FROM invoice_types WHERE code = 'STANDARD' LIMIT 1),
  1
);

-- 12. Add stages to workflow
INSERT INTO public.workflow_stages (
  route_id,
  stage_number,
  role_id,
  payment_status_id,
  order_index,
  is_active
)
VALUES (
  (SELECT id FROM approval_routes LIMIT 1),
  1,
  (SELECT id FROM roles WHERE code = 'accountant' LIMIT 1),
  (SELECT id FROM payment_statuses WHERE code = 'PENDING' LIMIT 1),
  1,
  true
);

-- 13. Create payment approval
INSERT INTO public.payment_approvals (payment_id, status_id)
VALUES (
  (SELECT id FROM payments WHERE payment_number = 'PAY-2025-001'),
  (SELECT id FROM payment_statuses WHERE code = 'PENDING' LIMIT 1)
);

-- 14. Add approval step (triggers will log action)
INSERT INTO public.approval_steps (
  payment_approval_id,
  stage_id,
  acted_by,
  action,
  created_at
)
VALUES (
  (SELECT id FROM payment_approvals LIMIT 1),
  (SELECT id FROM workflow_stages LIMIT 1),
  auth.uid(),
  'APPROVED',
  CURRENT_TIMESTAMP
);

-- ========== AUDIT LOG ==========

-- 15. View audit log for invoice
SELECT * FROM public.audit_log
WHERE entity_type = 'invoice'
AND entity_id = (SELECT id FROM invoices WHERE invoice_number = 'INV-2025-001')
ORDER BY created_at DESC;

-- 16. View audit log for payment
SELECT * FROM public.audit_log
WHERE entity_type = 'payment'
AND entity_id = (SELECT id FROM payments WHERE payment_number = 'PAY-2025-001')
ORDER BY created_at DESC;

-- ========== MATERIAL REQUESTS ==========

-- 17. Create material request
INSERT INTO public.material_requests (
  employee_id,
  project_id,
  request_date
)
VALUES (
  (SELECT id FROM employees LIMIT 1),
  (SELECT id FROM projects WHERE code = 'PROJ-001'),
  CURRENT_DATE
);

-- 18. Add material items to request
INSERT INTO public.material_request_items (
  material_request_id,
  nomenclature_id,
  quantity,
  unit_price,
  sort_order
)
VALUES (
  (SELECT id FROM material_requests LIMIT 1),
  (SELECT id FROM material_nomenclature LIMIT 1),
  100,
  1500,
  1
);

-- ========== LETTERS ==========

-- 19. Create outgoing letter
INSERT INTO public.letters (
  letter_number,
  letter_date,
  direction,
  sender_type,
  recipient_type,
  sender_contractor_id,
  recipient_contractor_id,
  project_id,
  status_id,
  responsible_user_id
)
VALUES (
  'LTR-OUT-001',
  CURRENT_DATE,
  'OUTGOING',
  'CONTRACTOR',
  'CONTRACTOR',
  (SELECT id FROM contractors LIMIT 1),
  (SELECT id FROM contractors OFFSET 1 LIMIT 1),
  (SELECT id FROM projects WHERE code = 'PROJ-001'),
  (SELECT id FROM letter_statuses WHERE code = 'DRAFT' LIMIT 1),
  auth.uid()
);

-- 20. Create contracts
INSERT INTO public.contracts (
  contract_number,
  contract_date,
  payer_id,
  supplier_id,
  project_id,
  status_id
)
VALUES (
  'CON-2025-001',
  CURRENT_DATE,
  (SELECT id FROM contractors LIMIT 1),
  (SELECT id FROM contractors OFFSET 1 LIMIT 1),
  (SELECT id FROM projects WHERE code = 'PROJ-001'),
  (SELECT id FROM contract_statuses WHERE code = 'ACTIVE' LIMIT 1)
);

-- ========== QUERY EXAMPLES ==========

-- 21. Complete invoice summary with payment info
SELECT 
  i.invoice_number,
  i.invoice_date,
  i.amount_without_vat,
  i.vat_rate,
  ist.name AS invoice_status,
  c.company_name AS supplier,
  COUNT(p.id) AS payment_count,
  COALESCE(SUM(p.amount_without_vat), 0) AS total_paid
FROM invoices i
LEFT JOIN invoice_types it ON i.invoice_type_id = it.id
LEFT JOIN invoice_statuses ist ON i.status_id = ist.id
LEFT JOIN contractors c ON i.supplier_id = c.id
LEFT JOIN invoice_payments ip ON i.id = ip.invoice_id
LEFT JOIN payments p ON ip.payment_id = p.id
GROUP BY i.id, i.invoice_number, i.invoice_date, i.amount_without_vat, i.vat_rate, ist.name, c.company_name;

-- 22. Approval workflow status
SELECT 
  p.payment_number,
  pa.status_id,
  ps.name AS approval_status,
  ws.stage_number,
  r.code AS required_role,
  MAX(ap.created_at) AS last_action
FROM payments p
LEFT JOIN payment_approvals pa ON p.id = pa.payment_id
LEFT JOIN payment_statuses ps ON pa.status_id = ps.id
LEFT JOIN approval_steps ap ON pa.id = ap.payment_approval_id
LEFT JOIN workflow_stages ws ON ap.stage_id = ws.id
LEFT JOIN roles r ON ws.role_id = r.id
GROUP BY p.id, p.payment_number, pa.status_id, ps.name, ws.stage_number, r.code;
