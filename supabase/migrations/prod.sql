-- Database Schema Export
-- Generated: 2025-09-21T15:38:19.765880
-- Database: postgres
-- Host: 31.128.51.210

-- ============================================

-- TABLES
-- ============================================

-- Хранение информации о загруженных файлах
CREATE TABLE IF NOT EXISTS public.attachments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    original_name character varying(255) NOT NULL,
    storage_path character varying(500) NOT NULL,
    size_bytes integer(32) NOT NULL,
    mime_type character varying(100) NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT attachments_created_by_fkey FOREIGN KEY (created_by) REFERENCES None.None(None),
    CONSTRAINT attachments_pkey PRIMARY KEY (id)
);

COMMENT ON TABLE public.attachments IS 'Хранение информации о загруженных файлах';
COMMENT ON COLUMN public.attachments.original_name IS 'Оригинальное имя файла';
COMMENT ON COLUMN public.attachments.storage_path IS 'Путь к файлу в Supabase Storage';
COMMENT ON COLUMN public.attachments.size_bytes IS 'Размер файла в байтах';
COMMENT ON COLUMN public.attachments.mime_type IS 'MIME тип файла';
COMMENT ON COLUMN public.attachments.created_by IS 'Пользователь, загрузивший файл';

-- Reference of contractor categories used across contractor records.
CREATE TABLE IF NOT EXISTS public.contractor_types (
    id integer(32) NOT NULL DEFAULT nextval('contractor_types_id_seq'::regclass),
    code character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT contractor_types_code_key UNIQUE (code),
    CONSTRAINT contractor_types_pkey PRIMARY KEY (id)
);

COMMENT ON TABLE public.contractor_types IS 'Reference of contractor categories used across contractor records.';
COMMENT ON COLUMN public.contractor_types.id IS 'Surrogate primary key for contractor type.';
COMMENT ON COLUMN public.contractor_types.code IS 'Unique short code of contractor type used in integrations.';
COMMENT ON COLUMN public.contractor_types.name IS 'Human readable contractor type name.';
COMMENT ON COLUMN public.contractor_types.description IS 'Optional description that clarifies how the contractor type is used.';
COMMENT ON COLUMN public.contractor_types.created_at IS 'Timestamp of when the contractor type record was created.';
COMMENT ON COLUMN public.contractor_types.updated_at IS 'Timestamp automatically refreshed by trigger update_updated_at_column().';

-- Registry of contractors linked to invoices and projects.
CREATE TABLE IF NOT EXISTS public.contractors (
    id integer(32) NOT NULL DEFAULT nextval('contractors_id_seq'::regclass),
    type_id integer(32) NOT NULL,
    name character varying(255) NOT NULL,
    inn character varying(12),
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT contractors_created_by_fkey FOREIGN KEY (created_by) REFERENCES None.None(None),
    CONSTRAINT contractors_inn_key UNIQUE (inn),
    CONSTRAINT contractors_pkey PRIMARY KEY (id),
    CONSTRAINT contractors_type_id_fkey FOREIGN KEY (type_id) REFERENCES None.None(None)
);

COMMENT ON TABLE public.contractors IS 'Registry of contractors linked to invoices and projects.';
COMMENT ON COLUMN public.contractors.id IS 'Surrogate primary key for contractor.';
COMMENT ON COLUMN public.contractors.type_id IS 'Foreign key to public.contractor_types.id indicating contractor category.';
COMMENT ON COLUMN public.contractors.name IS 'Official contractor name stored for invoicing.';
COMMENT ON COLUMN public.contractors.inn IS 'Russian tax identifier (INN) of the contractor.';
COMMENT ON COLUMN public.contractors.created_by IS 'Identifier of the Supabase auth user that created the contractor.';
COMMENT ON COLUMN public.contractors.created_at IS 'Timestamp when the contractor record was created.';
COMMENT ON COLUMN public.contractors.updated_at IS 'Timestamp automatically refreshed by trigger update_updated_at_column().';

-- Связь между счетами и прикрепленными файлами
CREATE TABLE IF NOT EXISTS public.invoice_attachments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    invoice_id uuid NOT NULL,
    attachment_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT invoice_attachments_attachment_id_fkey FOREIGN KEY (attachment_id) REFERENCES None.None(None),
    CONSTRAINT invoice_attachments_invoice_id_attachment_id_key UNIQUE (attachment_id),
    CONSTRAINT invoice_attachments_invoice_id_attachment_id_key UNIQUE (invoice_id),
    CONSTRAINT invoice_attachments_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES None.None(None),
    CONSTRAINT invoice_attachments_pkey PRIMARY KEY (id)
);

COMMENT ON TABLE public.invoice_attachments IS 'Связь между счетами и прикрепленными файлами';

CREATE TABLE IF NOT EXISTS public.invoice_payments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    invoice_id uuid NOT NULL,
    payment_id uuid NOT NULL,
    allocated_amount numeric(15,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT invoice_payments_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES None.None(None),
    CONSTRAINT invoice_payments_invoice_id_payment_id_key UNIQUE (invoice_id),
    CONSTRAINT invoice_payments_invoice_id_payment_id_key UNIQUE (payment_id),
    CONSTRAINT invoice_payments_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES None.None(None),
    CONSTRAINT invoice_payments_pkey PRIMARY KEY (id)
);

-- Reference of invoice workflow statuses used throughout PayHub.
CREATE TABLE IF NOT EXISTS public.invoice_statuses (
    id integer(32) NOT NULL DEFAULT nextval('invoice_statuses_id_seq'::regclass),
    code character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    sort_order integer(32),
    color character varying(20),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT invoice_statuses_code_key UNIQUE (code),
    CONSTRAINT invoice_statuses_pkey PRIMARY KEY (id)
);

COMMENT ON TABLE public.invoice_statuses IS 'Reference of invoice workflow statuses used throughout PayHub.';
COMMENT ON COLUMN public.invoice_statuses.id IS 'Surrogate primary key for invoice status.';
COMMENT ON COLUMN public.invoice_statuses.code IS 'Unique code used to reference the status in APIs and UI.';
COMMENT ON COLUMN public.invoice_statuses.name IS 'Human readable status label.';
COMMENT ON COLUMN public.invoice_statuses.description IS 'Optional description explaining when to use the status.';
COMMENT ON COLUMN public.invoice_statuses.sort_order IS 'Ordering weight for displaying statuses.';
COMMENT ON COLUMN public.invoice_statuses.color IS 'Optional color token or hex value for UI badges.';
COMMENT ON COLUMN public.invoice_statuses.created_at IS 'Timestamp when the invoice status was created.';
COMMENT ON COLUMN public.invoice_statuses.updated_at IS 'Timestamp automatically refreshed by trigger update_updated_at_column().';

-- Reference of invoice classification types (e.g. services, materials).
CREATE TABLE IF NOT EXISTS public.invoice_types (
    id integer(32) NOT NULL DEFAULT nextval('invoice_types_id_seq'::regclass),
    code character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT invoice_types_code_key UNIQUE (code),
    CONSTRAINT invoice_types_pkey PRIMARY KEY (id)
);

COMMENT ON TABLE public.invoice_types IS 'Reference of invoice classification types (e.g. services, materials).';
COMMENT ON COLUMN public.invoice_types.id IS 'Surrogate primary key for invoice type.';
COMMENT ON COLUMN public.invoice_types.code IS 'Unique code representing the invoice type.';
COMMENT ON COLUMN public.invoice_types.name IS 'Human readable invoice type name.';
COMMENT ON COLUMN public.invoice_types.description IS 'Optional description of what the invoice type represents.';
COMMENT ON COLUMN public.invoice_types.created_at IS 'Timestamp when the invoice type record was created.';
COMMENT ON COLUMN public.invoice_types.updated_at IS 'Timestamp automatically refreshed by trigger update_updated_at_column().';

-- Outbound invoices issued from PayHub.
CREATE TABLE IF NOT EXISTS public.invoices (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL,
    invoice_number text NOT NULL,
    description text,
    due_date date,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    invoice_date date NOT NULL DEFAULT CURRENT_DATE,
    payer_id integer(32),
    supplier_id integer(32),
    project_id integer(32),
    invoice_type_id integer(32),
    amount_with_vat numeric(15,2),
    vat_rate numeric(5,2) DEFAULT 20,
    vat_amount numeric(15,2),
    amount_without_vat numeric(15,2),
    delivery_days integer(32),
    delivery_days_type character varying(20) DEFAULT 'working'::character varying,
    preliminary_delivery_date date,
    status_id integer(32) NOT NULL,
    CONSTRAINT invoices_invoice_type_id_fkey FOREIGN KEY (invoice_type_id) REFERENCES None.None(None),
    CONSTRAINT invoices_payer_id_fkey FOREIGN KEY (payer_id) REFERENCES None.None(None),
    CONSTRAINT invoices_pkey PRIMARY KEY (id),
    CONSTRAINT invoices_project_id_fkey FOREIGN KEY (project_id) REFERENCES None.None(None),
    CONSTRAINT invoices_status_id_fkey FOREIGN KEY (status_id) REFERENCES None.None(None),
    CONSTRAINT invoices_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES None.None(None),
    CONSTRAINT invoices_user_id_fkey FOREIGN KEY (user_id) REFERENCES None.None(None)
);

COMMENT ON TABLE public.invoices IS 'Outbound invoices issued from PayHub.';
COMMENT ON COLUMN public.invoices.id IS 'Primary key and external identifier of the invoice.';
COMMENT ON COLUMN public.invoices.user_id IS 'Supabase auth user who owns or issued the invoice.';
COMMENT ON COLUMN public.invoices.invoice_number IS 'Human readable invoice number visible to customers.';
COMMENT ON COLUMN public.invoices.description IS 'Optional invoice description or customer facing note.';
COMMENT ON COLUMN public.invoices.due_date IS 'Date by which payment is expected.';
COMMENT ON COLUMN public.invoices.created_at IS 'Timestamp when the invoice was created.';
COMMENT ON COLUMN public.invoices.updated_at IS 'Timestamp automatically refreshed by trigger update_updated_at_column().';
COMMENT ON COLUMN public.invoices.invoice_date IS 'Calendar date printed on the invoice.';
COMMENT ON COLUMN public.invoices.payer_id IS 'Contractor (public.contractors.id) acting as payer.';
COMMENT ON COLUMN public.invoices.supplier_id IS 'Contractor (public.contractors.id) acting as supplier.';
COMMENT ON COLUMN public.invoices.project_id IS 'Associated project (public.projects.id).';
COMMENT ON COLUMN public.invoices.invoice_type_id IS 'Invoice type reference (public.invoice_types.id).';
COMMENT ON COLUMN public.invoices.amount_with_vat IS 'Invoice total amount including VAT.';
COMMENT ON COLUMN public.invoices.vat_rate IS 'VAT rate applied to the invoice amount (percent).';
COMMENT ON COLUMN public.invoices.vat_amount IS 'VAT portion of the invoice total.';
COMMENT ON COLUMN public.invoices.amount_without_vat IS 'Invoice total amount excluding VAT.';
COMMENT ON COLUMN public.invoices.delivery_days IS 'Number of days for delivery after payment.';
COMMENT ON COLUMN public.invoices.delivery_days_type IS 'Delivery day interpretation: working or calendar.';
COMMENT ON COLUMN public.invoices.preliminary_delivery_date IS 'Projected delivery date calculated from payment terms.';
COMMENT ON COLUMN public.invoices.status_id IS 'Invoice workflow status (public.invoice_statuses.id).';

-- Связь между платежами и прикрепленными файлами
CREATE TABLE IF NOT EXISTS public.payment_attachments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    payment_id uuid NOT NULL,
    attachment_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT payment_attachments_attachment_id_fkey FOREIGN KEY (attachment_id) REFERENCES None.None(None),
    CONSTRAINT payment_attachments_payment_id_attachment_id_key UNIQUE (attachment_id),
    CONSTRAINT payment_attachments_payment_id_attachment_id_key UNIQUE (payment_id),
    CONSTRAINT payment_attachments_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES None.None(None),
    CONSTRAINT payment_attachments_pkey PRIMARY KEY (id)
);

COMMENT ON TABLE public.payment_attachments IS 'Связь между платежами и прикрепленными файлами';
COMMENT ON COLUMN public.payment_attachments.payment_id IS 'ID платежа';
COMMENT ON COLUMN public.payment_attachments.attachment_id IS 'ID прикрепленного файла';

CREATE TABLE IF NOT EXISTS public.payment_statuses (
    id integer(32) NOT NULL DEFAULT nextval('payment_statuses_id_seq'::regclass),
    code character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    sort_order integer(32),
    color character varying(20),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT payment_statuses_code_key UNIQUE (code),
    CONSTRAINT payment_statuses_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.payment_types (
    id integer(32) NOT NULL DEFAULT nextval('payment_types_id_seq'::regclass),
    code character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT payment_types_code_key UNIQUE (code),
    CONSTRAINT payment_types_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.payments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    invoice_id uuid NOT NULL,
    payment_number integer(32) NOT NULL DEFAULT nextval('payment_number_seq'::regclass),
    payment_date date NOT NULL DEFAULT CURRENT_DATE,
    amount numeric(15,2) NOT NULL,
    description text,
    payment_type_id integer(32),
    status_id integer(32) DEFAULT 1,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT payments_created_by_fkey FOREIGN KEY (created_by) REFERENCES None.None(None),
    CONSTRAINT payments_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES None.None(None),
    CONSTRAINT payments_payment_number_key UNIQUE (payment_number),
    CONSTRAINT payments_payment_type_id_fkey FOREIGN KEY (payment_type_id) REFERENCES None.None(None),
    CONSTRAINT payments_pkey PRIMARY KEY (id),
    CONSTRAINT payments_status_id_fkey FOREIGN KEY (status_id) REFERENCES None.None(None)
);

-- Projects that group invoices and contractors for reporting.
CREATE TABLE IF NOT EXISTS public.projects (
    id integer(32) NOT NULL DEFAULT nextval('projects_id_seq'::regclass),
    code character varying(50),
    name character varying(255) NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT projects_code_key UNIQUE (code),
    CONSTRAINT projects_created_by_fkey FOREIGN KEY (created_by) REFERENCES None.None(None),
    CONSTRAINT projects_pkey PRIMARY KEY (id)
);

COMMENT ON TABLE public.projects IS 'Projects that group invoices and contractors for reporting.';
COMMENT ON COLUMN public.projects.id IS 'Surrogate primary key for project.';
COMMENT ON COLUMN public.projects.code IS 'Optional unique project code for integrations and search.';
COMMENT ON COLUMN public.projects.name IS 'Project display name.';
COMMENT ON COLUMN public.projects.description IS 'Optional project description for internal users.';
COMMENT ON COLUMN public.projects.is_active IS 'Flag that marks whether the project is active.';
COMMENT ON COLUMN public.projects.created_by IS 'Supabase auth user who created the project.';
COMMENT ON COLUMN public.projects.created_at IS 'Timestamp when the project record was created.';
COMMENT ON COLUMN public.projects.updated_at IS 'Timestamp automatically refreshed by trigger update_updated_at_column().';

-- Roles that define access levels inside PayHub.
CREATE TABLE IF NOT EXISTS public.roles (
    id integer(32) NOT NULL DEFAULT nextval('roles_id_seq'::regclass),
    code character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT roles_code_key UNIQUE (code),
    CONSTRAINT roles_pkey PRIMARY KEY (id)
);

COMMENT ON TABLE public.roles IS 'Roles that define access levels inside PayHub.';
COMMENT ON COLUMN public.roles.id IS 'Primary key for role.';
COMMENT ON COLUMN public.roles.code IS 'Unique machine readable code of the role.';
COMMENT ON COLUMN public.roles.name IS 'Human readable role name.';
COMMENT ON COLUMN public.roles.description IS 'Optional description of permissions or intended usage.';
COMMENT ON COLUMN public.roles.created_at IS 'Timestamp when the role was created.';
COMMENT ON COLUMN public.roles.updated_at IS 'Timestamp automatically refreshed by trigger update_updated_at_column().';

-- Mirror of Supabase auth user profiles stored in public schema.
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id uuid NOT NULL,
    email text NOT NULL,
    full_name text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT user_profiles_email_key UNIQUE (email),
    CONSTRAINT user_profiles_id_fkey FOREIGN KEY (id) REFERENCES None.None(None),
    CONSTRAINT user_profiles_pkey PRIMARY KEY (id)
);

COMMENT ON TABLE public.user_profiles IS 'Mirror of Supabase auth user profiles stored in public schema.';
COMMENT ON COLUMN public.user_profiles.id IS 'Primary key and foreign key to auth.users.id.';
COMMENT ON COLUMN public.user_profiles.email IS 'Primary email address associated with the user profile.';
COMMENT ON COLUMN public.user_profiles.full_name IS 'Display name of the user shown in UI.';
COMMENT ON COLUMN public.user_profiles.created_at IS 'Timestamp when the profile was recorded.';
COMMENT ON COLUMN public.user_profiles.updated_at IS 'Timestamp automatically refreshed by trigger update_updated_at_column().';

-- Mapping table assigning users to projects for access control.
CREATE TABLE IF NOT EXISTS public.user_projects (
    id integer(32) NOT NULL DEFAULT nextval('user_projects_id_seq'::regclass),
    user_id uuid NOT NULL,
    project_id integer(32) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT user_projects_pkey PRIMARY KEY (id),
    CONSTRAINT user_projects_project_id_fkey FOREIGN KEY (project_id) REFERENCES None.None(None),
    CONSTRAINT user_projects_user_id_fkey FOREIGN KEY (user_id) REFERENCES None.None(None),
    CONSTRAINT user_projects_user_project_unique UNIQUE (project_id),
    CONSTRAINT user_projects_user_project_unique UNIQUE (user_id)
);

COMMENT ON TABLE public.user_projects IS 'Mapping table assigning users to projects for access control.';
COMMENT ON COLUMN public.user_projects.id IS 'Surrogate primary key for user-project relation.';
COMMENT ON COLUMN public.user_projects.user_id IS 'Supabase auth user granted access to the project.';
COMMENT ON COLUMN public.user_projects.project_id IS 'Project (public.projects.id) assigned to the user.';
COMMENT ON COLUMN public.user_projects.created_at IS 'Timestamp when the user-project link was created.';


-- FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION public.calculate_vat_amounts()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Если указана сумма с НДС, вычисляем НДС и сумму без НДС
    IF NEW.amount_with_vat IS NOT NULL THEN
        IF NEW.vat_rate = 0 THEN
            NEW.vat_amount = 0;
            NEW.amount_without_vat = NEW.amount_with_vat;
        ELSE
            NEW.vat_amount = ROUND(NEW.amount_with_vat * NEW.vat_rate / (100 + NEW.vat_rate), 2);
            NEW.amount_without_vat = NEW.amount_with_vat - NEW.vat_amount;
        END IF;
    END IF;

    RETURN NEW;
END;
$function$

;

CREATE OR REPLACE FUNCTION public.delete_contractor_type(type_id_param integer)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  contractor_count INTEGER;
  result JSON;
BEGIN
  -- Проверяем есть ли контрагенты с этим типом
  SELECT COUNT(*) INTO contractor_count
  FROM public.contractors
  WHERE type_id = type_id_param;

  IF contractor_count > 0 THEN
    result := json_build_object(
      'success', false,
      'error', 'Невозможно удалить тип, так как существуют контрагенты с этим типом',
      'contractor_count', contractor_count
    );
    RETURN result;
  END IF;

  -- Удаляем тип контрагента
  DELETE FROM public.contractor_types WHERE id = type_id_param;

  IF FOUND THEN
    result := json_build_object(
      'success', true,
      'message', 'Тип контрагента успешно удален'
    );
  ELSE
    result := json_build_object(
      'success', false,
      'error', 'Тип контрагента не найден'
    );
  END IF;

  RETURN result;
END;
$function$

;

CREATE OR REPLACE FUNCTION public.delete_project(project_id_param integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Удаляем все связи с пользователями
  DELETE FROM public.user_projects WHERE project_id = project_id_param;

  -- Удаляем сам проект
  DELETE FROM public.projects WHERE id = project_id_param;

  -- Возвращаем true если удаление прошло успешно
  RETURN FOUND;
END;
$function$

;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$function$

;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$

;


-- TRIGGERS
-- ============================================

CREATE TRIGGER update_attachments_updated_at BEFORE UPDATE ON public.attachments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
;

CREATE TRIGGER update_contractor_types_updated_at BEFORE UPDATE ON public.contractor_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
;

CREATE TRIGGER update_contractors_updated_at BEFORE UPDATE ON public.contractors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
;

CREATE TRIGGER update_invoice_statuses_updated_at BEFORE UPDATE ON public.invoice_statuses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
;

CREATE TRIGGER update_invoice_types_updated_at BEFORE UPDATE ON public.invoice_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
;

CREATE TRIGGER calculate_vat_on_invoice BEFORE INSERT OR UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION calculate_vat_amounts()
;

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
;

CREATE TRIGGER update_payment_statuses_updated_at BEFORE UPDATE ON public.payment_statuses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
;

CREATE TRIGGER update_payment_types_updated_at BEFORE UPDATE ON public.payment_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
;

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
;

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
;

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON public.roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
;

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
;


-- INDEXES
-- ============================================

CREATE INDEX idx_attachments_created_by ON public.attachments USING btree (created_by)
;

CREATE UNIQUE INDEX contractor_types_code_key ON public.contractor_types USING btree (code)
;

CREATE INDEX idx_contractor_types_code ON public.contractor_types USING btree (code)
;

CREATE UNIQUE INDEX contractors_inn_key ON public.contractors USING btree (inn)
;

CREATE INDEX idx_contractors_inn ON public.contractors USING btree (inn)
;

CREATE INDEX idx_contractors_type_id ON public.contractors USING btree (type_id)
;

CREATE INDEX idx_invoice_attachments_attachment_id ON public.invoice_attachments USING btree (attachment_id)
;

CREATE INDEX idx_invoice_attachments_invoice_id ON public.invoice_attachments USING btree (invoice_id)
;

CREATE UNIQUE INDEX invoice_attachments_invoice_id_attachment_id_key ON public.invoice_attachments USING btree (invoice_id, attachment_id)
;

CREATE INDEX idx_invoice_payments_invoice_id ON public.invoice_payments USING btree (invoice_id)
;

CREATE INDEX idx_invoice_payments_payment_id ON public.invoice_payments USING btree (payment_id)
;

CREATE UNIQUE INDEX invoice_payments_invoice_id_payment_id_key ON public.invoice_payments USING btree (invoice_id, payment_id)
;

CREATE INDEX idx_invoice_statuses_code ON public.invoice_statuses USING btree (code)
;

CREATE INDEX idx_invoice_statuses_sort_order ON public.invoice_statuses USING btree (sort_order)
;

CREATE UNIQUE INDEX invoice_statuses_code_key ON public.invoice_statuses USING btree (code)
;

CREATE INDEX idx_invoice_types_code ON public.invoice_types USING btree (code)
;

CREATE UNIQUE INDEX invoice_types_code_key ON public.invoice_types USING btree (code)
;

CREATE INDEX idx_invoices_created_at ON public.invoices USING btree (created_at DESC)
;

CREATE INDEX idx_invoices_invoice_date ON public.invoices USING btree (invoice_date)
;

CREATE INDEX idx_invoices_invoice_type_id ON public.invoices USING btree (invoice_type_id)
;

CREATE INDEX idx_invoices_payer_id ON public.invoices USING btree (payer_id)
;

CREATE INDEX idx_invoices_project_id ON public.invoices USING btree (project_id)
;

CREATE INDEX idx_invoices_status_id ON public.invoices USING btree (status_id)
;

CREATE INDEX idx_invoices_supplier_id ON public.invoices USING btree (supplier_id)
;

CREATE INDEX idx_invoices_user_id ON public.invoices USING btree (user_id)
;

CREATE INDEX idx_payment_attachments_attachment_id ON public.payment_attachments USING btree (attachment_id)
;

CREATE INDEX idx_payment_attachments_payment_id ON public.payment_attachments USING btree (payment_id)
;

CREATE UNIQUE INDEX payment_attachments_payment_id_attachment_id_key ON public.payment_attachments USING btree (payment_id, attachment_id)
;

CREATE UNIQUE INDEX payment_statuses_code_key ON public.payment_statuses USING btree (code)
;

CREATE UNIQUE INDEX payment_types_code_key ON public.payment_types USING btree (code)
;

CREATE INDEX idx_payments_created_by ON public.payments USING btree (created_by)
;

CREATE INDEX idx_payments_invoice_id ON public.payments USING btree (invoice_id)
;

CREATE INDEX idx_payments_payment_date ON public.payments USING btree (payment_date)
;

CREATE INDEX idx_payments_status_id ON public.payments USING btree (status_id)
;

CREATE UNIQUE INDEX payments_payment_number_key ON public.payments USING btree (payment_number)
;

CREATE INDEX idx_projects_code ON public.projects USING btree (code)
;

CREATE INDEX idx_projects_is_active ON public.projects USING btree (is_active)
;

CREATE UNIQUE INDEX projects_code_key ON public.projects USING btree (code)
;

CREATE INDEX idx_roles_code ON public.roles USING btree (code)
;

CREATE UNIQUE INDEX roles_code_key ON public.roles USING btree (code)
;

CREATE UNIQUE INDEX user_profiles_email_key ON public.user_profiles USING btree (email)
;

CREATE INDEX idx_user_projects_project_id ON public.user_projects USING btree (project_id)
;

CREATE INDEX idx_user_projects_user_id ON public.user_projects USING btree (user_id)
;

CREATE UNIQUE INDEX user_projects_user_project_unique ON public.user_projects USING btree (user_id, project_id)
;
