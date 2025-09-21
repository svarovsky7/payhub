-- Database Schema Export
-- Generated: 2025-09-21T08:11:20.830649
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

CREATE TABLE IF NOT EXISTS public.invoices (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL,
    invoice_number text NOT NULL,
    amount numeric(10,2) NOT NULL,
    status text NOT NULL DEFAULT 'draft'::text,
    description text,
    due_date date,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT invoices_pkey PRIMARY KEY (id),
    CONSTRAINT invoices_user_id_fkey FOREIGN KEY (user_id) REFERENCES None.None(None)
);

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


-- FUNCTIONS
-- ============================================

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

CREATE INDEX idx_invoices_created_at ON public.invoices USING btree (created_at DESC)
;

CREATE INDEX idx_invoices_status ON public.invoices USING btree (status)
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
