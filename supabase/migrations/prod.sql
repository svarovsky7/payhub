-- Database Schema Export
-- Generated: 2025-09-21T09:47:51.346359
-- Database: postgres
-- Host: 31.128.51.210

-- ============================================

-- EXTENSIONS
-- ============================================

CREATE EXTENSION IF NOT EXISTS pg_graphql;
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pgjwt;
CREATE EXTENSION IF NOT EXISTS plpgsql;
CREATE EXTENSION IF NOT EXISTS supabase_vault;
CREATE EXTENSION IF NOT EXISTS uuid-ossp;

-- SCHEMAS
-- ============================================

CREATE SCHEMA IF NOT EXISTS _realtime;
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE SCHEMA IF NOT EXISTS graphql;
CREATE SCHEMA IF NOT EXISTS graphql_public;
CREATE SCHEMA IF NOT EXISTS net;
CREATE SCHEMA IF NOT EXISTS realtime;
CREATE SCHEMA IF NOT EXISTS storage;
CREATE SCHEMA IF NOT EXISTS supabase_functions;
CREATE SCHEMA IF NOT EXISTS vault;

-- TABLES
-- ============================================

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
    CONSTRAINT invoices_invoice_type_id_fkey FOREIGN KEY (invoice_type_id) REFERENCES None.None(None),
    CONSTRAINT invoices_payer_id_fkey FOREIGN KEY (payer_id) REFERENCES None.None(None),
    CONSTRAINT invoices_pkey PRIMARY KEY (id),
    CONSTRAINT invoices_project_id_fkey FOREIGN KEY (project_id) REFERENCES None.None(None),
    CONSTRAINT invoices_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES None.None(None),
    CONSTRAINT invoices_user_id_fkey FOREIGN KEY (user_id) REFERENCES None.None(None)
);
COMMENT ON COLUMN public.invoices.invoice_date IS 'Дата счета';
COMMENT ON COLUMN public.invoices.payer_id IS 'ID плательщика (контрагент с типом payer)';
COMMENT ON COLUMN public.invoices.supplier_id IS 'ID поставщика (контрагент с типом supplier)';
COMMENT ON COLUMN public.invoices.project_id IS 'ID проекта';
COMMENT ON COLUMN public.invoices.invoice_type_id IS 'ID типа счета';
COMMENT ON COLUMN public.invoices.amount_with_vat IS 'Сумма счета с НДС';
COMMENT ON COLUMN public.invoices.vat_rate IS 'Ставка НДС (%)';
COMMENT ON COLUMN public.invoices.vat_amount IS 'Сумма НДС';
COMMENT ON COLUMN public.invoices.amount_without_vat IS 'Сумма без НДС';
COMMENT ON COLUMN public.invoices.delivery_days IS 'Количество дней поставки после оплаты';
COMMENT ON COLUMN public.invoices.delivery_days_type IS 'Тип дней поставки (working - рабочие, calendar - календарные)';

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

CREATE TRIGGER update_contractor_types_updated_at BEFORE UPDATE ON public.contractor_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
;

CREATE TRIGGER update_contractors_updated_at BEFORE UPDATE ON public.contractors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
;

CREATE TRIGGER update_invoice_types_updated_at BEFORE UPDATE ON public.invoice_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
;

CREATE TRIGGER calculate_vat_on_invoice BEFORE INSERT OR UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION calculate_vat_amounts()
;

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
;

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
;

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON public.roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
;

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
;


-- INDEXES
-- ============================================

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

CREATE INDEX idx_invoices_supplier_id ON public.invoices USING btree (supplier_id)
;

CREATE INDEX idx_invoices_user_id ON public.invoices USING btree (user_id)
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
