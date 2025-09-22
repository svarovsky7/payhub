BEGIN;

COMMENT ON TABLE public.approval_routes IS 'Approval routes configured per invoice type.';
COMMENT ON COLUMN public.approval_routes.id IS 'Primary key of the approval route.';
COMMENT ON COLUMN public.approval_routes.invoice_type_id IS 'Invoice type (public.invoice_types.id) this route applies to.';
COMMENT ON COLUMN public.approval_routes.name IS 'Display name of the approval route.';
COMMENT ON COLUMN public.approval_routes.is_active IS 'TRUE when the route can be used for new payments.';
COMMENT ON COLUMN public.approval_routes.created_at IS 'Timestamp when the route record was created.';
COMMENT ON COLUMN public.approval_routes.updated_at IS 'Timestamp when the route record was last updated.';

COMMENT ON TABLE public.approval_steps IS 'Audit log of actions performed during payment approval.';
COMMENT ON COLUMN public.approval_steps.id IS 'Primary key of the approval step entry.';
COMMENT ON COLUMN public.approval_steps.payment_approval_id IS 'Payment approval instance (public.payment_approvals.id) this entry belongs to.';
COMMENT ON COLUMN public.approval_steps.stage_id IS 'Workflow stage (public.workflow_stages.id) where the action happened.';
COMMENT ON COLUMN public.approval_steps.action IS 'Recorded action on the stage, e.g. approve or reject.';
COMMENT ON COLUMN public.approval_steps.acted_by IS 'User (auth.users.id) who performed the action.';
COMMENT ON COLUMN public.approval_steps.acted_at IS 'Timestamp when the action was performed.';
COMMENT ON COLUMN public.approval_steps.comment IS 'Optional free-form note left by the approver.';
COMMENT ON COLUMN public.approval_steps.created_at IS 'Timestamp when the audit entry was stored.';

COMMENT ON TABLE public.attachments IS 'Metadata for files uploaded to Supabase Storage.';
COMMENT ON COLUMN public.attachments.id IS 'Primary key of the attachment and Storage object identifier.';
COMMENT ON COLUMN public.attachments.original_name IS 'Original filename provided by the user.';
COMMENT ON COLUMN public.attachments.storage_path IS 'Path to the object inside Supabase Storage.';
COMMENT ON COLUMN public.attachments.size_bytes IS 'File size in bytes.';
COMMENT ON COLUMN public.attachments.mime_type IS 'Detected MIME type of the file.';
COMMENT ON COLUMN public.attachments.created_by IS 'User (auth.users.id) who uploaded the file.';
COMMENT ON COLUMN public.attachments.created_at IS 'Timestamp when the attachment record was created.';
COMMENT ON COLUMN public.attachments.updated_at IS 'Timestamp when the attachment metadata was last updated.';

COMMENT ON TABLE public.contractor_types IS 'Reference list of contractor categories.';
COMMENT ON COLUMN public.contractor_types.id IS 'Primary key of the contractor type.';
COMMENT ON COLUMN public.contractor_types.code IS 'Unique code used to identify the contractor type.';
COMMENT ON COLUMN public.contractor_types.name IS 'Human readable contractor type name.';
COMMENT ON COLUMN public.contractor_types.description IS 'Optional explanation of when to use the contractor type.';
COMMENT ON COLUMN public.contractor_types.created_at IS 'Timestamp when the contractor type was created.';
COMMENT ON COLUMN public.contractor_types.updated_at IS 'Timestamp when the contractor type was last updated.';

COMMENT ON TABLE public.contractors IS 'Registry of contractors linked to invoices and projects.';
COMMENT ON COLUMN public.contractors.id IS 'Primary key of the contractor.';
COMMENT ON COLUMN public.contractors.type_id IS 'Contractor type (public.contractor_types.id).';
COMMENT ON COLUMN public.contractors.name IS 'Official contractor name stored for invoices.';
COMMENT ON COLUMN public.contractors.inn IS 'Russian tax identifier (INN) of the contractor.';
COMMENT ON COLUMN public.contractors.created_by IS 'User (auth.users.id) who created the contractor record.';
COMMENT ON COLUMN public.contractors.created_at IS 'Timestamp when the contractor record was created.';
COMMENT ON COLUMN public.contractors.updated_at IS 'Timestamp when the contractor record was last updated.';

COMMENT ON TABLE public.invoice_attachments IS 'Associates invoices with stored attachments.';
COMMENT ON COLUMN public.invoice_attachments.id IS 'Primary key of the invoice-attachment relation.';
COMMENT ON COLUMN public.invoice_attachments.invoice_id IS 'Invoice (public.invoices.id) that the file belongs to.';
COMMENT ON COLUMN public.invoice_attachments.attachment_id IS 'Attachment (public.attachments.id) linked to the invoice.';
COMMENT ON COLUMN public.invoice_attachments.created_at IS 'Timestamp when the attachment was linked to the invoice.';

COMMENT ON TABLE public.invoice_payments IS 'Allocation of payments to invoices.';
COMMENT ON COLUMN public.invoice_payments.id IS 'Primary key of the invoice-payment allocation.';
COMMENT ON COLUMN public.invoice_payments.invoice_id IS 'Invoice (public.invoices.id) receiving the allocation.';
COMMENT ON COLUMN public.invoice_payments.payment_id IS 'Payment (public.payments.id) allocated to the invoice.';
COMMENT ON COLUMN public.invoice_payments.allocated_amount IS 'Portion of the payment applied to the invoice.';
COMMENT ON COLUMN public.invoice_payments.created_at IS 'Timestamp when the allocation was recorded.';

COMMENT ON TABLE public.invoice_statuses IS 'Reference list of invoice workflow statuses.';
COMMENT ON COLUMN public.invoice_statuses.id IS 'Primary key of the invoice status.';
COMMENT ON COLUMN public.invoice_statuses.code IS 'Unique status code used in API and UI.';
COMMENT ON COLUMN public.invoice_statuses.name IS 'Display name of the invoice status.';
COMMENT ON COLUMN public.invoice_statuses.description IS 'Optional description clarifying when to use the status.';
COMMENT ON COLUMN public.invoice_statuses.sort_order IS 'Ordering weight used when listing statuses.';
COMMENT ON COLUMN public.invoice_statuses.color IS 'Optional UI color token or hex code for the status.';
COMMENT ON COLUMN public.invoice_statuses.created_at IS 'Timestamp when the invoice status was created.';
COMMENT ON COLUMN public.invoice_statuses.updated_at IS 'Timestamp when the invoice status was last updated.';

COMMENT ON TABLE public.invoice_types IS 'Reference list of invoice classification types.';
COMMENT ON COLUMN public.invoice_types.id IS 'Primary key of the invoice type.';
COMMENT ON COLUMN public.invoice_types.code IS 'Unique code representing the invoice type.';
COMMENT ON COLUMN public.invoice_types.name IS 'Display name of the invoice type.';
COMMENT ON COLUMN public.invoice_types.description IS 'Optional explanation of what the invoice type represents.';
COMMENT ON COLUMN public.invoice_types.created_at IS 'Timestamp when the invoice type record was created.';
COMMENT ON COLUMN public.invoice_types.updated_at IS 'Timestamp when the invoice type record was last updated.';

COMMENT ON TABLE public.invoices IS 'Outbound invoices issued from PayHub.';
COMMENT ON COLUMN public.invoices.id IS 'Primary key of the invoice (UUID).';
COMMENT ON COLUMN public.invoices.user_id IS 'Supabase auth user who created or owns the invoice.';
COMMENT ON COLUMN public.invoices.invoice_number IS 'Human readable invoice number shown to customers.';
COMMENT ON COLUMN public.invoices.description IS 'Optional invoice description or customer note.';
COMMENT ON COLUMN public.invoices.due_date IS 'Date by which payment is expected.';
COMMENT ON COLUMN public.invoices.created_at IS 'Timestamp when the invoice record was created.';
COMMENT ON COLUMN public.invoices.updated_at IS 'Timestamp when the invoice record was last updated.';
COMMENT ON COLUMN public.invoices.invoice_date IS 'Calendar date printed on the invoice.';
COMMENT ON COLUMN public.invoices.payer_id IS 'Contractor acting as payer (public.contractors.id).';
COMMENT ON COLUMN public.invoices.supplier_id IS 'Contractor acting as supplier (public.contractors.id).';
COMMENT ON COLUMN public.invoices.project_id IS 'Project associated with the invoice (public.projects.id).';
COMMENT ON COLUMN public.invoices.invoice_type_id IS 'Invoice type reference (public.invoice_types.id).';
COMMENT ON COLUMN public.invoices.amount_with_vat IS 'Invoice total amount including VAT.';
COMMENT ON COLUMN public.invoices.vat_rate IS 'VAT rate applied to the invoice total, in percent.';
COMMENT ON COLUMN public.invoices.vat_amount IS 'VAT portion of the invoice total.';
COMMENT ON COLUMN public.invoices.amount_without_vat IS 'Invoice amount excluding VAT.';
COMMENT ON COLUMN public.invoices.delivery_days IS 'Number of days required for delivery after payment.';
COMMENT ON COLUMN public.invoices.delivery_days_type IS 'Interpretation of delivery days (working or calendar).';
COMMENT ON COLUMN public.invoices.preliminary_delivery_date IS 'Projected delivery date calculated from payment terms.';
COMMENT ON COLUMN public.invoices.status_id IS 'Workflow status of the invoice (public.invoice_statuses.id).';

COMMENT ON TABLE public.payment_approvals IS 'Payment approval instances.';
COMMENT ON COLUMN public.payment_approvals.id IS 'Primary key of the payment approval.';
COMMENT ON COLUMN public.payment_approvals.payment_id IS 'Payment (public.payments.id) that is being approved.';
COMMENT ON COLUMN public.payment_approvals.route_id IS 'Approval route (public.approval_routes.id) used for the payment.';
COMMENT ON COLUMN public.payment_approvals.status_id IS 'Current status of the approval (public.payment_statuses.id).';
COMMENT ON COLUMN public.payment_approvals.current_stage_index IS 'Zero-based index of the current stage within the route.';
COMMENT ON COLUMN public.payment_approvals.created_at IS 'Timestamp when the approval instance was created.';
COMMENT ON COLUMN public.payment_approvals.updated_at IS 'Timestamp when the approval instance was last updated.';

COMMENT ON TABLE public.payment_attachments IS 'Associates payments with stored attachments.';
COMMENT ON COLUMN public.payment_attachments.id IS 'Primary key of the payment-attachment relation.';
COMMENT ON COLUMN public.payment_attachments.payment_id IS 'Payment (public.payments.id) that the file is attached to.';
COMMENT ON COLUMN public.payment_attachments.attachment_id IS 'Attachment (public.attachments.id) linked to the payment.';
COMMENT ON COLUMN public.payment_attachments.created_at IS 'Timestamp when the attachment was linked to the payment.';

COMMENT ON TABLE public.payment_statuses IS 'Reference list of payment statuses.';
COMMENT ON COLUMN public.payment_statuses.id IS 'Primary key of the payment status.';
COMMENT ON COLUMN public.payment_statuses.code IS 'Unique code identifying the payment status.';
COMMENT ON COLUMN public.payment_statuses.name IS 'Display name of the payment status.';
COMMENT ON COLUMN public.payment_statuses.description IS 'Optional description of what the payment status means.';
COMMENT ON COLUMN public.payment_statuses.sort_order IS 'Ordering weight used when listing payment statuses.';
COMMENT ON COLUMN public.payment_statuses.color IS 'Optional UI color token or hex code for the payment status.';
COMMENT ON COLUMN public.payment_statuses.created_at IS 'Timestamp when the payment status was created.';
COMMENT ON COLUMN public.payment_statuses.updated_at IS 'Timestamp when the payment status was last updated.';

COMMENT ON TABLE public.payment_types IS 'Reference list of payment types (advance, final, etc.).';
COMMENT ON COLUMN public.payment_types.id IS 'Primary key of the payment type.';
COMMENT ON COLUMN public.payment_types.code IS 'Unique code used to reference the payment type.';
COMMENT ON COLUMN public.payment_types.name IS 'Display name of the payment type.';
COMMENT ON COLUMN public.payment_types.description IS 'Optional description of how the payment type is used.';
COMMENT ON COLUMN public.payment_types.created_at IS 'Timestamp when the payment type record was created.';
COMMENT ON COLUMN public.payment_types.updated_at IS 'Timestamp when the payment type record was last updated.';

COMMENT ON TABLE public.payments IS 'Payments registered against invoices in PayHub.';
COMMENT ON COLUMN public.payments.id IS 'Primary key of the payment (UUID).';
COMMENT ON COLUMN public.payments.invoice_id IS 'Invoice (public.invoices.id) that the payment relates to.';
COMMENT ON COLUMN public.payments.payment_number IS 'Unique sequential number of the payment.';
COMMENT ON COLUMN public.payments.payment_date IS 'Date on which the payment was made.';
COMMENT ON COLUMN public.payments.amount IS 'Monetary amount of the payment.';
COMMENT ON COLUMN public.payments.description IS 'Optional description or purpose of the payment.';
COMMENT ON COLUMN public.payments.payment_type_id IS 'Payment type (public.payment_types.id).';
COMMENT ON COLUMN public.payments.status_id IS 'Current payment status (public.payment_statuses.id).';
COMMENT ON COLUMN public.payments.created_by IS 'User (auth.users.id) who created the payment record.';
COMMENT ON COLUMN public.payments.created_at IS 'Timestamp when the payment record was created.';
COMMENT ON COLUMN public.payments.updated_at IS 'Timestamp when the payment record was last updated.';

COMMENT ON TABLE public.projects IS 'Projects used to group invoices and contractors.';
COMMENT ON COLUMN public.projects.id IS 'Primary key of the project.';
COMMENT ON COLUMN public.projects.code IS 'Optional unique project code used in integrations and search.';
COMMENT ON COLUMN public.projects.name IS 'Display name of the project.';
COMMENT ON COLUMN public.projects.description IS 'Optional project description for internal users.';
COMMENT ON COLUMN public.projects.is_active IS 'TRUE when the project is active.';
COMMENT ON COLUMN public.projects.created_by IS 'User (auth.users.id) who created the project.';
COMMENT ON COLUMN public.projects.created_at IS 'Timestamp when the project record was created.';
COMMENT ON COLUMN public.projects.updated_at IS 'Timestamp when the project record was last updated.';

COMMENT ON TABLE public.roles IS 'Roles that define access levels inside PayHub.';
COMMENT ON COLUMN public.roles.id IS 'Primary key of the role.';
COMMENT ON COLUMN public.roles.code IS 'Unique machine-readable code of the role.';
COMMENT ON COLUMN public.roles.name IS 'Display name of the role.';
COMMENT ON COLUMN public.roles.description IS 'Optional description of the role permissions.';
COMMENT ON COLUMN public.roles.created_at IS 'Timestamp when the role record was created.';
COMMENT ON COLUMN public.roles.updated_at IS 'Timestamp when the role record was last updated.';
COMMENT ON COLUMN public.roles.own_projects_only IS 'TRUE when the role limits users to their own projects.';

COMMENT ON TABLE public.user_profiles IS 'Mirror of Supabase auth user profiles stored in the public schema.';
COMMENT ON COLUMN public.user_profiles.id IS 'Primary key of the profile and foreign key to auth.users.id.';
COMMENT ON COLUMN public.user_profiles.email IS 'Primary email address associated with the user profile.';
COMMENT ON COLUMN public.user_profiles.full_name IS 'Display name of the user.';
COMMENT ON COLUMN public.user_profiles.created_at IS 'Timestamp when the profile record was created.';
COMMENT ON COLUMN public.user_profiles.updated_at IS 'Timestamp when the profile record was last updated.';
COMMENT ON COLUMN public.user_profiles.role_id IS 'Role (public.roles.id) assigned to the user.';

COMMENT ON TABLE public.user_projects IS 'Mapping table assigning users to projects for access control.';
COMMENT ON COLUMN public.user_projects.id IS 'Primary key of the user-project link.';
COMMENT ON COLUMN public.user_projects.user_id IS 'User (auth.users.id) who receives access to the project.';
COMMENT ON COLUMN public.user_projects.project_id IS 'Project (public.projects.id) granted to the user.';
COMMENT ON COLUMN public.user_projects.created_at IS 'Timestamp when the user-project link was created.';

COMMENT ON TABLE public.workflow_stages IS 'Workflow stages that build approval routes and set payment statuses.';
COMMENT ON COLUMN public.workflow_stages.id IS 'Primary key of the workflow stage.';
COMMENT ON COLUMN public.workflow_stages.route_id IS 'Approval route (public.approval_routes.id) the stage belongs to.';
COMMENT ON COLUMN public.workflow_stages.order_index IS 'Zero-based order of the stage within the route.';
COMMENT ON COLUMN public.workflow_stages.role_id IS 'Role (public.roles.id) responsible for processing the stage.';
COMMENT ON COLUMN public.workflow_stages.name IS 'Display name of the workflow stage.';
COMMENT ON COLUMN public.workflow_stages.created_at IS 'Timestamp when the workflow stage was created.';
COMMENT ON COLUMN public.workflow_stages.updated_at IS 'Timestamp when the workflow stage was last updated.';
COMMENT ON COLUMN public.workflow_stages.payment_status_id IS 'Payment status (public.payment_statuses.id) applied after the stage is completed.';

COMMIT;
