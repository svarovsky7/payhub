-- Database Schema Export
-- Generated: 2025-10-14T07:46:23.356052
-- Database: postgres
-- Host: 31.128.51.210

-- ============================================

-- ENUM TYPES
-- ============================================

CREATE TYPE auth.aal_level AS ENUM ('aal1', 'aal2', 'aal3');
CREATE TYPE auth.code_challenge_method AS ENUM ('s256', 'plain');
CREATE TYPE auth.factor_status AS ENUM ('unverified', 'verified');
CREATE TYPE auth.factor_type AS ENUM ('totp', 'webauthn', 'phone');
CREATE TYPE auth.one_time_token_type AS ENUM ('confirmation_token', 'reauthentication_token', 'recovery_token', 'email_change_token_new', 'email_change_token_current', 'phone_change_token');
CREATE TYPE net.request_status AS ENUM ('PENDING', 'SUCCESS', 'ERROR');
CREATE TYPE realtime.action AS ENUM ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'ERROR');
CREATE TYPE realtime.equality_op AS ENUM ('eq', 'neq', 'lt', 'lte', 'gt', 'gte', 'in');
CREATE TYPE storage.buckettype AS ENUM ('STANDARD', 'ANALYTICS');

-- TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS _realtime.extensions (
    id uuid NOT NULL,
    type text,
    settings jsonb,
    tenant_external_id text,
    inserted_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);

-- Auth: Manages updates to the auth system.
CREATE TABLE IF NOT EXISTS _realtime.schema_migrations (
    version bigint(64) NOT NULL,
    inserted_at timestamp without time zone
);

COMMENT ON TABLE _realtime.schema_migrations IS 'Auth: Manages updates to the auth system.';

CREATE TABLE IF NOT EXISTS _realtime.tenants (
    id uuid NOT NULL,
    name text,
    external_id text,
    jwt_secret text,
    max_concurrent_users integer(32) NOT NULL DEFAULT 200,
    inserted_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    max_events_per_second integer(32) NOT NULL DEFAULT 100,
    postgres_cdc_default text DEFAULT 'postgres_cdc_rls'::text,
    max_bytes_per_second integer(32) NOT NULL DEFAULT 100000,
    max_channels_per_client integer(32) NOT NULL DEFAULT 100,
    max_joins_per_second integer(32) NOT NULL DEFAULT 500,
    suspend boolean DEFAULT false,
    jwt_jwks jsonb,
    notify_private_alpha boolean DEFAULT false,
    private_only boolean NOT NULL DEFAULT false
);

-- Auth: Audit trail for user actions.
CREATE TABLE IF NOT EXISTS auth.audit_log_entries (
    instance_id uuid,
    id uuid NOT NULL,
    payload json,
    created_at timestamp with time zone,
    ip_address character varying(64) NOT NULL DEFAULT ''::character varying,
    CONSTRAINT audit_log_entries_pkey PRIMARY KEY (id)
);

COMMENT ON TABLE auth.audit_log_entries IS 'Auth: Audit trail for user actions.';

-- stores metadata for pkce logins
CREATE TABLE IF NOT EXISTS auth.flow_state (
    id uuid NOT NULL,
    user_id uuid,
    auth_code text NOT NULL,
    code_challenge_method USER-DEFINED NOT NULL,
    code_challenge text NOT NULL,
    provider_type text NOT NULL,
    provider_access_token text,
    provider_refresh_token text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    authentication_method text NOT NULL,
    auth_code_issued_at timestamp with time zone,
    CONSTRAINT flow_state_pkey PRIMARY KEY (id)
);

COMMENT ON TABLE auth.flow_state IS 'stores metadata for pkce logins';

-- Auth: Stores identities associated to a user.
CREATE TABLE IF NOT EXISTS auth.identities (
    provider_id text NOT NULL,
    user_id uuid NOT NULL,
    identity_data jsonb NOT NULL,
    provider text NOT NULL,
    last_sign_in_at timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    email text,
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    CONSTRAINT identities_pkey PRIMARY KEY (id),
    CONSTRAINT identities_provider_id_provider_unique UNIQUE (provider),
    CONSTRAINT identities_provider_id_provider_unique UNIQUE (provider_id),
    CONSTRAINT identities_user_id_fkey FOREIGN KEY (user_id) REFERENCES None.None(None)
);

COMMENT ON TABLE auth.identities IS 'Auth: Stores identities associated to a user.';
COMMENT ON COLUMN auth.identities.email IS 'Auth: Email is a generated column that references the optional email property in the identity_data';

-- Auth: Manages users across multiple sites.
CREATE TABLE IF NOT EXISTS auth.instances (
    id uuid NOT NULL,
    uuid uuid,
    raw_base_config text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT instances_pkey PRIMARY KEY (id)
);

COMMENT ON TABLE auth.instances IS 'Auth: Manages users across multiple sites.';

-- auth: stores authenticator method reference claims for multi factor authentication
CREATE TABLE IF NOT EXISTS auth.mfa_amr_claims (
    session_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    authentication_method text NOT NULL,
    id uuid NOT NULL,
    CONSTRAINT amr_id_pk PRIMARY KEY (id),
    CONSTRAINT mfa_amr_claims_session_id_authentication_method_pkey UNIQUE (authentication_method),
    CONSTRAINT mfa_amr_claims_session_id_authentication_method_pkey UNIQUE (session_id),
    CONSTRAINT mfa_amr_claims_session_id_fkey FOREIGN KEY (session_id) REFERENCES None.None(None)
);

COMMENT ON TABLE auth.mfa_amr_claims IS 'auth: stores authenticator method reference claims for multi factor authentication';

-- auth: stores metadata about challenge requests made
CREATE TABLE IF NOT EXISTS auth.mfa_challenges (
    id uuid NOT NULL,
    factor_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    verified_at timestamp with time zone,
    ip_address inet NOT NULL,
    otp_code text,
    web_authn_session_data jsonb,
    CONSTRAINT mfa_challenges_auth_factor_id_fkey FOREIGN KEY (factor_id) REFERENCES None.None(None),
    CONSTRAINT mfa_challenges_pkey PRIMARY KEY (id)
);

COMMENT ON TABLE auth.mfa_challenges IS 'auth: stores metadata about challenge requests made';

-- auth: stores metadata about factors
CREATE TABLE IF NOT EXISTS auth.mfa_factors (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    friendly_name text,
    factor_type USER-DEFINED NOT NULL,
    status USER-DEFINED NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    secret text,
    phone text,
    last_challenged_at timestamp with time zone,
    web_authn_credential jsonb,
    web_authn_aaguid uuid,
    CONSTRAINT mfa_factors_last_challenged_at_key UNIQUE (last_challenged_at),
    CONSTRAINT mfa_factors_pkey PRIMARY KEY (id),
    CONSTRAINT mfa_factors_user_id_fkey FOREIGN KEY (user_id) REFERENCES None.None(None)
);

COMMENT ON TABLE auth.mfa_factors IS 'auth: stores metadata about factors';

CREATE TABLE IF NOT EXISTS auth.one_time_tokens (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    token_type USER-DEFINED NOT NULL,
    token_hash text NOT NULL,
    relates_to text NOT NULL,
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    updated_at timestamp without time zone NOT NULL DEFAULT now(),
    CONSTRAINT one_time_tokens_pkey PRIMARY KEY (id),
    CONSTRAINT one_time_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES None.None(None)
);

-- Auth: Store of tokens used to refresh JWT tokens once they expire.
CREATE TABLE IF NOT EXISTS auth.refresh_tokens (
    instance_id uuid,
    id bigint(64) NOT NULL DEFAULT nextval('auth.refresh_tokens_id_seq'::regclass),
    token character varying(255),
    user_id character varying(255),
    revoked boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    parent character varying(255),
    session_id uuid,
    CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id),
    CONSTRAINT refresh_tokens_session_id_fkey FOREIGN KEY (session_id) REFERENCES None.None(None),
    CONSTRAINT refresh_tokens_token_unique UNIQUE (token)
);

COMMENT ON TABLE auth.refresh_tokens IS 'Auth: Store of tokens used to refresh JWT tokens once they expire.';

-- Auth: Manages SAML Identity Provider connections.
CREATE TABLE IF NOT EXISTS auth.saml_providers (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    entity_id text NOT NULL,
    metadata_xml text NOT NULL,
    metadata_url text,
    attribute_mapping jsonb,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    name_id_format text,
    CONSTRAINT saml_providers_entity_id_key UNIQUE (entity_id),
    CONSTRAINT saml_providers_pkey PRIMARY KEY (id),
    CONSTRAINT saml_providers_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES None.None(None)
);

COMMENT ON TABLE auth.saml_providers IS 'Auth: Manages SAML Identity Provider connections.';

-- Auth: Contains SAML Relay State information for each Service Provider initiated login.
CREATE TABLE IF NOT EXISTS auth.saml_relay_states (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    request_id text NOT NULL,
    for_email text,
    redirect_to text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    flow_state_id uuid,
    CONSTRAINT saml_relay_states_flow_state_id_fkey FOREIGN KEY (flow_state_id) REFERENCES None.None(None),
    CONSTRAINT saml_relay_states_pkey PRIMARY KEY (id),
    CONSTRAINT saml_relay_states_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES None.None(None)
);

COMMENT ON TABLE auth.saml_relay_states IS 'Auth: Contains SAML Relay State information for each Service Provider initiated login.';

-- Auth: Manages updates to the auth system.
CREATE TABLE IF NOT EXISTS auth.schema_migrations (
    version character varying(255) NOT NULL,
    CONSTRAINT schema_migrations_pkey PRIMARY KEY (version)
);

COMMENT ON TABLE auth.schema_migrations IS 'Auth: Manages updates to the auth system.';

-- Auth: Stores session data associated to a user.
CREATE TABLE IF NOT EXISTS auth.sessions (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    factor_id uuid,
    aal USER-DEFINED,
    not_after timestamp with time zone,
    refreshed_at timestamp without time zone,
    user_agent text,
    ip inet,
    tag text,
    CONSTRAINT sessions_pkey PRIMARY KEY (id),
    CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES None.None(None)
);

COMMENT ON TABLE auth.sessions IS 'Auth: Stores session data associated to a user.';
COMMENT ON COLUMN auth.sessions.not_after IS 'Auth: Not after is a nullable column that contains a timestamp after which the session should be regarded as expired.';

-- Auth: Manages SSO email address domain mapping to an SSO Identity Provider.
CREATE TABLE IF NOT EXISTS auth.sso_domains (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    domain text NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT sso_domains_pkey PRIMARY KEY (id),
    CONSTRAINT sso_domains_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES None.None(None)
);

COMMENT ON TABLE auth.sso_domains IS 'Auth: Manages SSO email address domain mapping to an SSO Identity Provider.';

-- Auth: Manages SSO identity provider information; see saml_providers for SAML.
CREATE TABLE IF NOT EXISTS auth.sso_providers (
    id uuid NOT NULL,
    resource_id text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT sso_providers_pkey PRIMARY KEY (id)
);

COMMENT ON TABLE auth.sso_providers IS 'Auth: Manages SSO identity provider information; see saml_providers for SAML.';
COMMENT ON COLUMN auth.sso_providers.resource_id IS 'Auth: Uniquely identifies a SSO provider according to a user-chosen resource ID (case insensitive), useful in infrastructure as code.';

-- Auth: Stores user login data within a secure schema.
CREATE TABLE IF NOT EXISTS auth.users (
    instance_id uuid,
    id uuid NOT NULL,
    aud character varying(255),
    role character varying(255),
    email character varying(255),
    encrypted_password character varying(255),
    email_confirmed_at timestamp with time zone,
    invited_at timestamp with time zone,
    confirmation_token character varying(255),
    confirmation_sent_at timestamp with time zone,
    recovery_token character varying(255),
    recovery_sent_at timestamp with time zone,
    email_change_token_new character varying(255),
    email_change character varying(255),
    email_change_sent_at timestamp with time zone,
    last_sign_in_at timestamp with time zone,
    raw_app_meta_data jsonb,
    raw_user_meta_data jsonb,
    is_super_admin boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    phone text DEFAULT NULL::character varying,
    phone_confirmed_at timestamp with time zone,
    phone_change text DEFAULT ''::character varying,
    phone_change_token character varying(255) DEFAULT ''::character varying,
    phone_change_sent_at timestamp with time zone,
    confirmed_at timestamp with time zone,
    email_change_token_current character varying(255) DEFAULT ''::character varying,
    email_change_confirm_status smallint(16) DEFAULT 0,
    banned_until timestamp with time zone,
    reauthentication_token character varying(255) DEFAULT ''::character varying,
    reauthentication_sent_at timestamp with time zone,
    is_sso_user boolean NOT NULL DEFAULT false,
    deleted_at timestamp with time zone,
    is_anonymous boolean NOT NULL DEFAULT false,
    CONSTRAINT users_phone_key UNIQUE (phone),
    CONSTRAINT users_pkey PRIMARY KEY (id)
);

COMMENT ON TABLE auth.users IS 'Auth: Stores user login data within a secure schema.';
COMMENT ON COLUMN auth.users.is_sso_user IS 'Auth: Set this column to true when the account comes from SSO. These accounts can have duplicate emails.';

CREATE TABLE IF NOT EXISTS cron.job (
    jobid bigint(64) NOT NULL DEFAULT nextval('cron.jobid_seq'::regclass),
    schedule text NOT NULL,
    command text NOT NULL,
    nodename text NOT NULL DEFAULT 'localhost'::text,
    nodeport integer(32) NOT NULL DEFAULT inet_server_port(),
    database text NOT NULL DEFAULT current_database(),
    username text NOT NULL DEFAULT CURRENT_USER,
    active boolean NOT NULL DEFAULT true,
    jobname text
);

CREATE TABLE IF NOT EXISTS cron.job_run_details (
    jobid bigint(64),
    runid bigint(64) NOT NULL DEFAULT nextval('cron.runid_seq'::regclass),
    job_pid integer(32),
    database text,
    username text,
    command text,
    status text,
    return_message text,
    start_time timestamp with time zone,
    end_time timestamp with time zone,
    CONSTRAINT job_run_details_pkey PRIMARY KEY (runid)
);

CREATE TABLE IF NOT EXISTS net._http_response (
    id bigint(64),
    status_code integer(32),
    content_type text,
    headers jsonb,
    content text,
    timed_out boolean,
    error_msg text,
    created timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS net.http_request_queue (
    id bigint(64) NOT NULL DEFAULT nextval('net.http_request_queue_id_seq'::regclass),
    method text NOT NULL,
    url text NOT NULL,
    headers jsonb NOT NULL,
    body bytea,
    timeout_milliseconds integer(32) NOT NULL
);

-- Payment approval routes. One invoice type can have multiple routes.
CREATE TABLE IF NOT EXISTS public.approval_routes (
    id integer(32) NOT NULL,
    invoice_type_id integer(32) NOT NULL,
    name character varying(255) NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT approval_routes_invoice_type_id_fkey FOREIGN KEY (invoice_type_id) REFERENCES None.None(None),
    CONSTRAINT approval_routes_pkey PRIMARY KEY (id)
);

COMMENT ON TABLE public.approval_routes IS 'Payment approval routes. One invoice type can have multiple routes.';
COMMENT ON COLUMN public.approval_routes.id IS 'Primary key';
COMMENT ON COLUMN public.approval_routes.invoice_type_id IS 'Invoice type ID this route applies to';
COMMENT ON COLUMN public.approval_routes.name IS 'Route name';
COMMENT ON COLUMN public.approval_routes.is_active IS 'Whether this route is currently active';
COMMENT ON COLUMN public.approval_routes.created_at IS 'Timestamp when the route was created';
COMMENT ON COLUMN public.approval_routes.updated_at IS 'Timestamp when the route was last updated';

-- Audit log of actions performed during payment approval process
CREATE TABLE IF NOT EXISTS public.approval_steps (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    payment_approval_id uuid NOT NULL,
    stage_id integer(32) NOT NULL,
    action text NOT NULL,
    acted_by uuid,
    acted_at timestamp with time zone,
    comment text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT approval_steps_acted_by_fkey FOREIGN KEY (acted_by) REFERENCES None.None(None),
    CONSTRAINT approval_steps_payment_approval_id_fkey FOREIGN KEY (payment_approval_id) REFERENCES None.None(None),
    CONSTRAINT approval_steps_payment_approval_id_stage_id_key UNIQUE (payment_approval_id),
    CONSTRAINT approval_steps_payment_approval_id_stage_id_key UNIQUE (stage_id),
    CONSTRAINT approval_steps_pkey PRIMARY KEY (id),
    CONSTRAINT approval_steps_stage_id_fkey FOREIGN KEY (stage_id) REFERENCES None.None(None)
);

COMMENT ON TABLE public.approval_steps IS 'Audit log of actions performed during payment approval process';
COMMENT ON COLUMN public.approval_steps.id IS 'Primary key';
COMMENT ON COLUMN public.approval_steps.payment_approval_id IS 'Payment approval ID this step belongs to';
COMMENT ON COLUMN public.approval_steps.stage_id IS 'Workflow stage ID';
COMMENT ON COLUMN public.approval_steps.action IS 'Action taken: approved, rejected, or returned';
COMMENT ON COLUMN public.approval_steps.acted_by IS 'User ID who performed the approval action';
COMMENT ON COLUMN public.approval_steps.acted_at IS 'Timestamp when the action was performed';
COMMENT ON COLUMN public.approval_steps.comment IS 'Optional comment explaining the decision';
COMMENT ON COLUMN public.approval_steps.created_at IS 'Timestamp when the record was created';

-- Metadata for files uploaded to Supabase Storage
CREATE TABLE IF NOT EXISTS public.attachments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    original_name character varying(255) NOT NULL,
    storage_path character varying(500) NOT NULL,
    size_bytes integer(32) NOT NULL,
    mime_type character varying(100) NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    description text,
    CONSTRAINT attachments_created_by_fkey FOREIGN KEY (created_by) REFERENCES None.None(None),
    CONSTRAINT attachments_pkey PRIMARY KEY (id)
);

COMMENT ON TABLE public.attachments IS 'Metadata for files uploaded to Supabase Storage';
COMMENT ON COLUMN public.attachments.id IS 'Primary key (UUID)';
COMMENT ON COLUMN public.attachments.original_name IS 'Original filename as uploaded by user';
COMMENT ON COLUMN public.attachments.storage_path IS 'Path to file in Supabase Storage';
COMMENT ON COLUMN public.attachments.size_bytes IS 'File size in bytes';
COMMENT ON COLUMN public.attachments.mime_type IS 'MIME type of the file';
COMMENT ON COLUMN public.attachments.created_by IS 'User ID who uploaded the file';
COMMENT ON COLUMN public.attachments.created_at IS 'Timestamp when the file was uploaded';
COMMENT ON COLUMN public.attachments.updated_at IS 'Timestamp when metadata was last updated';
COMMENT ON COLUMN public.attachments.description IS 'Optional description of the attachment';

-- Centralized audit log for tracking changes to invoices, payments, and related entities
CREATE TABLE IF NOT EXISTS public.audit_log (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    action text NOT NULL,
    field_name text,
    old_value text,
    new_value text,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    metadata jsonb,
    CONSTRAINT audit_log_pkey PRIMARY KEY (id),
    CONSTRAINT audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES None.None(None)
);

COMMENT ON TABLE public.audit_log IS 'Centralized audit log for tracking changes to invoices, payments, and related entities';
COMMENT ON COLUMN public.audit_log.id IS 'Primary key';
COMMENT ON COLUMN public.audit_log.entity_type IS 'Type of entity: invoice, payment, invoice_attachment, payment_attachment, approval';
COMMENT ON COLUMN public.audit_log.entity_id IS 'ID of the affected entity';
COMMENT ON COLUMN public.audit_log.action IS 'Action performed: create, update, delete, file_add, file_delete, status_change, approval_action';
COMMENT ON COLUMN public.audit_log.field_name IS 'Name of the field that was changed (for update actions)';
COMMENT ON COLUMN public.audit_log.old_value IS 'Previous value (for update actions)';
COMMENT ON COLUMN public.audit_log.new_value IS 'New value (for update actions)';
COMMENT ON COLUMN public.audit_log.user_id IS 'User ID who performed the action';
COMMENT ON COLUMN public.audit_log.created_at IS 'Timestamp when the action was performed';
COMMENT ON COLUMN public.audit_log.metadata IS 'Additional JSON metadata (file info, status names, comments)';

-- Junction table linking contracts with attached files
CREATE TABLE IF NOT EXISTS public.contract_attachments (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    contract_id uuid NOT NULL,
    attachment_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT contract_attachments_attachment_id_fkey FOREIGN KEY (attachment_id) REFERENCES None.None(None),
    CONSTRAINT contract_attachments_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES None.None(None),
    CONSTRAINT contract_attachments_pkey PRIMARY KEY (id)
);

COMMENT ON TABLE public.contract_attachments IS 'Junction table linking contracts with attached files';
COMMENT ON COLUMN public.contract_attachments.id IS 'Primary key (UUID)';
COMMENT ON COLUMN public.contract_attachments.contract_id IS 'Contract ID';
COMMENT ON COLUMN public.contract_attachments.attachment_id IS 'Attachment ID';
COMMENT ON COLUMN public.contract_attachments.created_at IS 'Timestamp when the link was created';

-- Junction table linking contracts with invoices
CREATE TABLE IF NOT EXISTS public.contract_invoices (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    contract_id uuid NOT NULL,
    invoice_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT contract_invoices_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES None.None(None),
    CONSTRAINT contract_invoices_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES None.None(None),
    CONSTRAINT contract_invoices_pkey PRIMARY KEY (id)
);

COMMENT ON TABLE public.contract_invoices IS 'Junction table linking contracts with invoices';
COMMENT ON COLUMN public.contract_invoices.id IS 'Primary key (UUID)';
COMMENT ON COLUMN public.contract_invoices.contract_id IS 'Contract ID';
COMMENT ON COLUMN public.contract_invoices.invoice_id IS 'Invoice ID';
COMMENT ON COLUMN public.contract_invoices.created_at IS 'Timestamp when the link was created';

-- Many-to-many relationship table linking contracts with projects
CREATE TABLE IF NOT EXISTS public.contract_projects (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    contract_id uuid NOT NULL,
    project_id integer(32) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT contract_projects_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES None.None(None),
    CONSTRAINT contract_projects_pkey PRIMARY KEY (id),
    CONSTRAINT contract_projects_project_id_fkey FOREIGN KEY (project_id) REFERENCES None.None(None),
    CONSTRAINT contract_projects_unique UNIQUE (contract_id),
    CONSTRAINT contract_projects_unique UNIQUE (project_id)
);

COMMENT ON TABLE public.contract_projects IS 'Many-to-many relationship table linking contracts with projects';
COMMENT ON COLUMN public.contract_projects.contract_id IS 'Reference to contract';
COMMENT ON COLUMN public.contract_projects.project_id IS 'Reference to project';

-- Contract status reference table
CREATE TABLE IF NOT EXISTS public.contract_statuses (
    id integer(32) NOT NULL DEFAULT nextval('contract_statuses_id_seq'::regclass),
    code character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    color character varying(7),
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    sort_order integer(32) DEFAULT 100,
    CONSTRAINT contract_statuses_code_key UNIQUE (code),
    CONSTRAINT contract_statuses_pkey PRIMARY KEY (id)
);

COMMENT ON TABLE public.contract_statuses IS 'Contract status reference table';
COMMENT ON COLUMN public.contract_statuses.id IS 'Primary key';
COMMENT ON COLUMN public.contract_statuses.code IS 'Unique status code';
COMMENT ON COLUMN public.contract_statuses.name IS 'Status name';
COMMENT ON COLUMN public.contract_statuses.color IS 'Display color for UI';
COMMENT ON COLUMN public.contract_statuses.description IS 'Status description';
COMMENT ON COLUMN public.contract_statuses.created_at IS 'Timestamp when the status was created';
COMMENT ON COLUMN public.contract_statuses.updated_at IS 'Timestamp when the status was last updated';
COMMENT ON COLUMN public.contract_statuses.sort_order IS 'Sort order for display';

-- Registry of contractors linked to invoices and projects
CREATE TABLE IF NOT EXISTS public.contractors (
    id integer(32) NOT NULL DEFAULT nextval('contractors_id_seq'::regclass),
    name character varying(255) NOT NULL,
    inn character varying(12),
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT contractors_created_by_fkey FOREIGN KEY (created_by) REFERENCES None.None(None),
    CONSTRAINT contractors_inn_key UNIQUE (inn),
    CONSTRAINT contractors_pkey PRIMARY KEY (id)
);

COMMENT ON TABLE public.contractors IS 'Registry of contractors linked to invoices and projects';
COMMENT ON COLUMN public.contractors.id IS 'Primary key';
COMMENT ON COLUMN public.contractors.name IS 'Official contractor name';
COMMENT ON COLUMN public.contractors.inn IS 'Russian tax identifier (INN)';
COMMENT ON COLUMN public.contractors.created_by IS 'User ID who created the contractor record';
COMMENT ON COLUMN public.contractors.created_at IS 'Timestamp when the contractor was created';
COMMENT ON COLUMN public.contractors.updated_at IS 'Timestamp when the contractor was last updated';

-- Contracts with counterparties
CREATE TABLE IF NOT EXISTS public.contracts (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    contract_number character varying(255) NOT NULL,
    contract_date date NOT NULL,
    payer_id integer(32),
    supplier_id integer(32),
    vat_rate numeric(5,2) DEFAULT 20,
    warranty_period_days integer(32),
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    project_id integer(32),
    status_id integer(32),
    payment_terms text,
    advance_percentage numeric(5,2) DEFAULT 0,
    CONSTRAINT contracts_created_by_fkey FOREIGN KEY (created_by) REFERENCES None.None(None),
    CONSTRAINT contracts_payer_id_fkey FOREIGN KEY (payer_id) REFERENCES None.None(None),
    CONSTRAINT contracts_pkey PRIMARY KEY (id),
    CONSTRAINT contracts_project_id_fkey FOREIGN KEY (project_id) REFERENCES None.None(None),
    CONSTRAINT contracts_status_id_fkey FOREIGN KEY (status_id) REFERENCES None.None(None),
    CONSTRAINT contracts_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES None.None(None)
);

COMMENT ON TABLE public.contracts IS 'Contracts with counterparties';
COMMENT ON COLUMN public.contracts.id IS 'Primary key (UUID)';
COMMENT ON COLUMN public.contracts.contract_number IS 'Contract number';
COMMENT ON COLUMN public.contracts.contract_date IS 'Contract signing date';
COMMENT ON COLUMN public.contracts.payer_id IS 'Payer contractor ID';
COMMENT ON COLUMN public.contracts.supplier_id IS 'Supplier contractor ID';
COMMENT ON COLUMN public.contracts.vat_rate IS 'VAT rate percentage';
COMMENT ON COLUMN public.contracts.warranty_period_days IS 'Warranty period in days';
COMMENT ON COLUMN public.contracts.description IS 'Contract description';
COMMENT ON COLUMN public.contracts.created_at IS 'Timestamp when the contract was created';
COMMENT ON COLUMN public.contracts.updated_at IS 'Timestamp when the contract was last updated';
COMMENT ON COLUMN public.contracts.created_by IS 'User ID who created the contract';
COMMENT ON COLUMN public.contracts.project_id IS 'Project ID this contract belongs to';
COMMENT ON COLUMN public.contracts.status_id IS 'Contract status ID';
COMMENT ON COLUMN public.contracts.payment_terms IS 'Payment terms (free text)';
COMMENT ON COLUMN public.contracts.advance_percentage IS 'Advance payment percentage (0-100)';

-- Organizational departments
CREATE TABLE IF NOT EXISTS public.departments (
    id integer(32) NOT NULL DEFAULT nextval('departments_id_seq'::regclass),
    name character varying(255) NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT departments_name_key UNIQUE (name),
    CONSTRAINT departments_pkey PRIMARY KEY (id)
);

COMMENT ON TABLE public.departments IS 'Organizational departments';
COMMENT ON COLUMN public.departments.id IS 'Primary key';
COMMENT ON COLUMN public.departments.name IS 'Department name';
COMMENT ON COLUMN public.departments.description IS 'Department description';
COMMENT ON COLUMN public.departments.created_at IS 'Timestamp when the department was created';
COMMENT ON COLUMN public.departments.updated_at IS 'Timestamp when the department was last updated';

-- Company employees registry
CREATE TABLE IF NOT EXISTS public.employees (
    id integer(32) NOT NULL DEFAULT nextval('employees_id_seq'::regclass),
    last_name character varying(255) NOT NULL,
    first_name character varying(255) NOT NULL,
    middle_name character varying(255),
    full_name character varying(765),
    department_id integer(32),
    position_id integer(32),
    email character varying(255),
    phone character varying(50),
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    CONSTRAINT employees_created_by_fkey FOREIGN KEY (created_by) REFERENCES None.None(None),
    CONSTRAINT employees_department_id_fkey FOREIGN KEY (department_id) REFERENCES None.None(None),
    CONSTRAINT employees_pkey PRIMARY KEY (id),
    CONSTRAINT employees_position_id_fkey FOREIGN KEY (position_id) REFERENCES None.None(None)
);

COMMENT ON TABLE public.employees IS 'Company employees registry';
COMMENT ON COLUMN public.employees.id IS 'Primary key';
COMMENT ON COLUMN public.employees.last_name IS 'Employee last name';
COMMENT ON COLUMN public.employees.first_name IS 'Employee first name';
COMMENT ON COLUMN public.employees.middle_name IS 'Employee middle name (patronymic)';
COMMENT ON COLUMN public.employees.full_name IS 'Full name (auto-computed)';
COMMENT ON COLUMN public.employees.department_id IS 'Department ID';
COMMENT ON COLUMN public.employees.position_id IS 'Position ID';
COMMENT ON COLUMN public.employees.email IS 'Employee email address';
COMMENT ON COLUMN public.employees.phone IS 'Employee phone number';
COMMENT ON COLUMN public.employees.is_active IS 'Whether the employee is currently active';
COMMENT ON COLUMN public.employees.created_at IS 'Timestamp when the employee was created';
COMMENT ON COLUMN public.employees.updated_at IS 'Timestamp when the employee was last updated';
COMMENT ON COLUMN public.employees.created_by IS 'User ID who created the employee record';

-- Junction table linking invoices with attached files
CREATE TABLE IF NOT EXISTS public.invoice_attachments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    invoice_id uuid NOT NULL,
    attachment_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT invoice_attachments_attachment_id_fkey FOREIGN KEY (attachment_id) REFERENCES None.None(None),
    CONSTRAINT invoice_attachments_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES None.None(None),
    CONSTRAINT invoice_attachments_pkey PRIMARY KEY (id)
);

COMMENT ON TABLE public.invoice_attachments IS 'Junction table linking invoices with attached files';
COMMENT ON COLUMN public.invoice_attachments.id IS 'Primary key (UUID)';
COMMENT ON COLUMN public.invoice_attachments.invoice_id IS 'Invoice ID';
COMMENT ON COLUMN public.invoice_attachments.attachment_id IS 'Attachment ID';
COMMENT ON COLUMN public.invoice_attachments.created_at IS 'Timestamp when the link was created';

-- Junction table linking invoices with payments and allocation amounts
CREATE TABLE IF NOT EXISTS public.invoice_payments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    invoice_id uuid NOT NULL,
    payment_id uuid NOT NULL,
    allocated_amount numeric(15,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT invoice_payments_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES None.None(None),
    CONSTRAINT invoice_payments_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES None.None(None),
    CONSTRAINT invoice_payments_pkey PRIMARY KEY (id)
);

COMMENT ON TABLE public.invoice_payments IS 'Junction table linking invoices with payments and allocation amounts';
COMMENT ON COLUMN public.invoice_payments.id IS 'Primary key (UUID)';
COMMENT ON COLUMN public.invoice_payments.invoice_id IS 'Invoice ID';
COMMENT ON COLUMN public.invoice_payments.payment_id IS 'Payment ID';
COMMENT ON COLUMN public.invoice_payments.allocated_amount IS 'Amount of payment allocated to this invoice';
COMMENT ON COLUMN public.invoice_payments.created_at IS 'Timestamp when the allocation was created';

-- Invoice status reference table
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

COMMENT ON TABLE public.invoice_statuses IS 'Invoice status reference table';
COMMENT ON COLUMN public.invoice_statuses.id IS 'Primary key';
COMMENT ON COLUMN public.invoice_statuses.code IS 'Unique status code';
COMMENT ON COLUMN public.invoice_statuses.name IS 'Status name';
COMMENT ON COLUMN public.invoice_statuses.description IS 'Status description';
COMMENT ON COLUMN public.invoice_statuses.sort_order IS 'Sort order for display';
COMMENT ON COLUMN public.invoice_statuses.color IS 'Display color for UI';
COMMENT ON COLUMN public.invoice_statuses.created_at IS 'Timestamp when the status was created';
COMMENT ON COLUMN public.invoice_statuses.updated_at IS 'Timestamp when the status was last updated';

-- Invoice type reference table
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

COMMENT ON TABLE public.invoice_types IS 'Invoice type reference table';
COMMENT ON COLUMN public.invoice_types.id IS 'Primary key';
COMMENT ON COLUMN public.invoice_types.code IS 'Unique type code';
COMMENT ON COLUMN public.invoice_types.name IS 'Invoice type name';
COMMENT ON COLUMN public.invoice_types.description IS 'Invoice type description';
COMMENT ON COLUMN public.invoice_types.created_at IS 'Timestamp when the type was created';
COMMENT ON COLUMN public.invoice_types.updated_at IS 'Timestamp when the type was last updated';

-- Outbound invoices issued to contractors
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
    delivery_cost numeric(12,2) DEFAULT 0,
    relevance_date date NOT NULL DEFAULT CURRENT_TIMESTAMP,
    material_request_id uuid,
    contract_id uuid,
    responsible_id uuid,
    is_archived boolean NOT NULL DEFAULT false,
    CONSTRAINT fk_invoices_responsible FOREIGN KEY (responsible_id) REFERENCES None.None(None),
    CONSTRAINT invoices_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES None.None(None),
    CONSTRAINT invoices_invoice_type_id_fkey FOREIGN KEY (invoice_type_id) REFERENCES None.None(None),
    CONSTRAINT invoices_material_request_id_fkey FOREIGN KEY (material_request_id) REFERENCES None.None(None),
    CONSTRAINT invoices_payer_id_fkey FOREIGN KEY (payer_id) REFERENCES None.None(None),
    CONSTRAINT invoices_pkey PRIMARY KEY (id),
    CONSTRAINT invoices_project_id_fkey FOREIGN KEY (project_id) REFERENCES None.None(None),
    CONSTRAINT invoices_status_id_fkey FOREIGN KEY (status_id) REFERENCES None.None(None),
    CONSTRAINT invoices_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES None.None(None),
    CONSTRAINT invoices_user_id_fkey FOREIGN KEY (user_id) REFERENCES None.None(None)
);

COMMENT ON TABLE public.invoices IS 'Outbound invoices issued to contractors';
COMMENT ON COLUMN public.invoices.id IS 'Primary key (UUID)';
COMMENT ON COLUMN public.invoices.user_id IS 'Supabase auth user who created the invoice';
COMMENT ON COLUMN public.invoices.invoice_number IS 'Human-readable invoice number';
COMMENT ON COLUMN public.invoices.description IS 'Invoice description';
COMMENT ON COLUMN public.invoices.due_date IS 'Payment due date (deprecated)';
COMMENT ON COLUMN public.invoices.created_at IS 'Timestamp when the invoice was created';
COMMENT ON COLUMN public.invoices.updated_at IS 'Timestamp when the invoice was last updated';
COMMENT ON COLUMN public.invoices.invoice_date IS 'Invoice issue date';
COMMENT ON COLUMN public.invoices.payer_id IS 'Contractor acting as payer';
COMMENT ON COLUMN public.invoices.supplier_id IS 'Contractor acting as supplier';
COMMENT ON COLUMN public.invoices.project_id IS 'Project this invoice belongs to';
COMMENT ON COLUMN public.invoices.invoice_type_id IS 'Invoice type';
COMMENT ON COLUMN public.invoices.amount_with_vat IS 'Total amount including VAT';
COMMENT ON COLUMN public.invoices.vat_rate IS 'VAT rate percentage';
COMMENT ON COLUMN public.invoices.vat_amount IS 'VAT amount (calculated)';
COMMENT ON COLUMN public.invoices.amount_without_vat IS 'Amount excluding VAT (calculated)';
COMMENT ON COLUMN public.invoices.delivery_days IS 'Number of days for delivery';
COMMENT ON COLUMN public.invoices.delivery_days_type IS 'Type of days: working or calendar';
COMMENT ON COLUMN public.invoices.preliminary_delivery_date IS 'Preliminary delivery date';
COMMENT ON COLUMN public.invoices.status_id IS 'Invoice status';
COMMENT ON COLUMN public.invoices.delivery_cost IS 'Delivery cost';
COMMENT ON COLUMN public.invoices.relevance_date IS 'Invoice relevance/validity date';
COMMENT ON COLUMN public.invoices.material_request_id IS 'Material request this invoice is linked to';
COMMENT ON COLUMN public.invoices.contract_id IS 'Contract this invoice is linked to';
COMMENT ON COLUMN public.invoices.responsible_id IS 'Responsible procurement manager (user_profiles UUID)';
COMMENT ON COLUMN public.invoices.is_archived IS 'Whether the invoice is archived';

-- Связь писем с прикрепленными файлами
CREATE TABLE IF NOT EXISTS public.letter_attachments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    letter_id uuid NOT NULL,
    attachment_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT letter_attachments_attachment_id_fkey FOREIGN KEY (attachment_id) REFERENCES None.None(None),
    CONSTRAINT letter_attachments_letter_id_attachment_id_key UNIQUE (attachment_id),
    CONSTRAINT letter_attachments_letter_id_attachment_id_key UNIQUE (letter_id),
    CONSTRAINT letter_attachments_letter_id_fkey FOREIGN KEY (letter_id) REFERENCES None.None(None),
    CONSTRAINT letter_attachments_pkey PRIMARY KEY (id)
);

COMMENT ON TABLE public.letter_attachments IS 'Связь писем с прикрепленными файлами';

-- Связи между письмами (родительское письмо и его ответы/связанные письма)
CREATE TABLE IF NOT EXISTS public.letter_links (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    parent_id uuid NOT NULL,
    child_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT letter_links_child_id_fkey FOREIGN KEY (child_id) REFERENCES None.None(None),
    CONSTRAINT letter_links_parent_id_child_id_key UNIQUE (child_id),
    CONSTRAINT letter_links_parent_id_child_id_key UNIQUE (parent_id),
    CONSTRAINT letter_links_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES None.None(None),
    CONSTRAINT letter_links_pkey PRIMARY KEY (id)
);

COMMENT ON TABLE public.letter_links IS 'Связи между письмами (родительское письмо и его ответы/связанные письма)';

-- Статусы писем (новое, на рассмотрении, исполнено, архив и т.д.)
CREATE TABLE IF NOT EXISTS public.letter_statuses (
    id integer(32) NOT NULL DEFAULT nextval('letter_statuses_id_seq'::regclass),
    name text NOT NULL,
    code text NOT NULL,
    color text,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT letter_statuses_code_key UNIQUE (code),
    CONSTRAINT letter_statuses_name_key UNIQUE (name),
    CONSTRAINT letter_statuses_pkey PRIMARY KEY (id)
);

COMMENT ON TABLE public.letter_statuses IS 'Статусы писем (новое, на рассмотрении, исполнено, архив и т.д.)';

-- Учет входящих и исходящих писем компании
CREATE TABLE IF NOT EXISTS public.letters (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    project_id bigint(64),
    number text,
    status_id integer(32) DEFAULT 1,
    letter_date date NOT NULL,
    subject text,
    content text,
    responsible_user_id uuid,
    sender text,
    recipient text,
    direction text NOT NULL DEFAULT 'incoming'::text,
    reg_number text,
    reg_date date,
    delivery_method text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    responsible_person_name text,
    response_deadline date,
    CONSTRAINT letters_created_by_fkey FOREIGN KEY (created_by) REFERENCES None.None(None),
    CONSTRAINT letters_pkey PRIMARY KEY (id),
    CONSTRAINT letters_project_id_fkey FOREIGN KEY (project_id) REFERENCES None.None(None),
    CONSTRAINT letters_responsible_user_id_fkey FOREIGN KEY (responsible_user_id) REFERENCES None.None(None),
    CONSTRAINT letters_status_id_fkey FOREIGN KEY (status_id) REFERENCES None.None(None)
);

COMMENT ON TABLE public.letters IS 'Учет входящих и исходящих писем компании';
COMMENT ON COLUMN public.letters.project_id IS 'Связанный проект';
COMMENT ON COLUMN public.letters.number IS 'Номер письма (необязательное поле)';
COMMENT ON COLUMN public.letters.status_id IS 'Текущий статус письма';
COMMENT ON COLUMN public.letters.letter_date IS 'Дата письма';
COMMENT ON COLUMN public.letters.subject IS 'Тема/предмет письма';
COMMENT ON COLUMN public.letters.content IS 'Краткое содержание письма';
COMMENT ON COLUMN public.letters.responsible_user_id IS 'Ответственный за обработку письма (ссылка на зарегистрированного пользователя)';
COMMENT ON COLUMN public.letters.sender IS 'Отправитель письма (может быть как компания, так и физическое лицо)';
COMMENT ON COLUMN public.letters.recipient IS 'Получатель письма (может быть как компания, так и физическое лицо)';
COMMENT ON COLUMN public.letters.direction IS 'Направление: incoming (входящее) или outgoing (исходящее)';
COMMENT ON COLUMN public.letters.reg_number IS 'Регистрационный номер (необязательное поле)';
COMMENT ON COLUMN public.letters.reg_date IS 'Дата регистрации в системе';
COMMENT ON COLUMN public.letters.delivery_method IS 'Способ доставки/отправки письма (почта, email, курьер, ЭДО, факс, другое)';
COMMENT ON COLUMN public.letters.created_by IS 'Пользователь, создавший запись';
COMMENT ON COLUMN public.letters.responsible_person_name IS 'Ответственный за обработку письма (произвольное текстовое поле для физических лиц)';
COMMENT ON COLUMN public.letters.response_deadline IS 'Регламентный срок ответа на письмо';

-- Material classification hierarchy
CREATE TABLE IF NOT EXISTS public.material_classes (
    id bigint(64) NOT NULL,
    name text NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    parent_id bigint(64),
    level integer(32) DEFAULT 0,
    CONSTRAINT fk_material_classes_parent FOREIGN KEY (parent_id) REFERENCES None.None(None),
    CONSTRAINT material_classes_name_parent_key UNIQUE (name),
    CONSTRAINT material_classes_name_parent_key UNIQUE (parent_id),
    CONSTRAINT material_classes_pkey PRIMARY KEY (id)
);

COMMENT ON TABLE public.material_classes IS 'Material classification hierarchy';
COMMENT ON COLUMN public.material_classes.id IS 'Primary key';
COMMENT ON COLUMN public.material_classes.name IS 'Class name';
COMMENT ON COLUMN public.material_classes.is_active IS 'Whether the class is currently active';
COMMENT ON COLUMN public.material_classes.created_at IS 'Timestamp when the class was created';
COMMENT ON COLUMN public.material_classes.updated_at IS 'Timestamp when the class was last updated';
COMMENT ON COLUMN public.material_classes.parent_id IS 'Parent class ID (for hierarchical structure)';
COMMENT ON COLUMN public.material_classes.level IS 'Hierarchy level (depth in tree)';

-- Material catalog and specifications
CREATE TABLE IF NOT EXISTS public.material_nomenclature (
    id integer(32) NOT NULL DEFAULT nextval('material_nomenclature_id_seq'::regclass),
    name character varying(500) NOT NULL,
    unit character varying(50) NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    material_class_id integer(32),
    CONSTRAINT fk_material_nomenclature_class FOREIGN KEY (material_class_id) REFERENCES None.None(None),
    CONSTRAINT material_nomenclature_pkey PRIMARY KEY (id)
);

COMMENT ON TABLE public.material_nomenclature IS 'Material catalog and specifications';
COMMENT ON COLUMN public.material_nomenclature.id IS 'Primary key';
COMMENT ON COLUMN public.material_nomenclature.name IS 'Material name';
COMMENT ON COLUMN public.material_nomenclature.unit IS 'Unit of measurement';
COMMENT ON COLUMN public.material_nomenclature.is_active IS 'Whether the material is currently active';
COMMENT ON COLUMN public.material_nomenclature.created_at IS 'Timestamp when the material was created';
COMMENT ON COLUMN public.material_nomenclature.updated_at IS 'Timestamp when the material was last updated';
COMMENT ON COLUMN public.material_nomenclature.material_class_id IS 'Material class ID';

-- Individual items within material requests
CREATE TABLE IF NOT EXISTS public.material_request_items (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    material_request_id uuid NOT NULL,
    material_name character varying(500) NOT NULL,
    unit character varying(50) NOT NULL,
    quantity numeric(15,3) NOT NULL,
    sort_order integer(32) DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    nomenclature_id integer(32),
    CONSTRAINT fk_material_request_items_nomenclature FOREIGN KEY (nomenclature_id) REFERENCES None.None(None),
    CONSTRAINT material_request_items_material_request_id_fkey FOREIGN KEY (material_request_id) REFERENCES None.None(None),
    CONSTRAINT material_request_items_pkey PRIMARY KEY (id)
);

COMMENT ON TABLE public.material_request_items IS 'Individual items within material requests';
COMMENT ON COLUMN public.material_request_items.id IS 'Primary key';
COMMENT ON COLUMN public.material_request_items.material_request_id IS 'Material request ID this item belongs to';
COMMENT ON COLUMN public.material_request_items.material_name IS 'Material name';
COMMENT ON COLUMN public.material_request_items.unit IS 'Unit of measurement';
COMMENT ON COLUMN public.material_request_items.quantity IS 'Requested quantity';
COMMENT ON COLUMN public.material_request_items.sort_order IS 'Sort order for display';
COMMENT ON COLUMN public.material_request_items.created_at IS 'Timestamp when the item was created';
COMMENT ON COLUMN public.material_request_items.nomenclature_id IS 'Material nomenclature ID (optional link)';

-- Material requisitions submitted by employees
CREATE TABLE IF NOT EXISTS public.material_requests (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    request_number character varying(255) NOT NULL,
    request_date date NOT NULL DEFAULT CURRENT_DATE,
    project_id integer(32),
    employee_id integer(32),
    total_items integer(32) DEFAULT 0,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT material_requests_created_by_fkey FOREIGN KEY (created_by) REFERENCES None.None(None),
    CONSTRAINT material_requests_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES None.None(None),
    CONSTRAINT material_requests_pkey PRIMARY KEY (id),
    CONSTRAINT material_requests_project_id_fkey FOREIGN KEY (project_id) REFERENCES None.None(None)
);

COMMENT ON TABLE public.material_requests IS 'Material requisitions submitted by employees';
COMMENT ON COLUMN public.material_requests.id IS 'Primary key (UUID)';
COMMENT ON COLUMN public.material_requests.request_number IS 'Human-readable request number';
COMMENT ON COLUMN public.material_requests.request_date IS 'Date when the request was submitted';
COMMENT ON COLUMN public.material_requests.project_id IS 'Project this request belongs to';
COMMENT ON COLUMN public.material_requests.employee_id IS 'Employee who submitted the request';
COMMENT ON COLUMN public.material_requests.total_items IS 'Total number of items (auto-counted)';
COMMENT ON COLUMN public.material_requests.created_by IS 'User ID who created the request';
COMMENT ON COLUMN public.material_requests.created_at IS 'Timestamp when the request was created';
COMMENT ON COLUMN public.material_requests.updated_at IS 'Timestamp when the request was last updated';

-- Payment approval instances tracking approval workflow progress
CREATE TABLE IF NOT EXISTS public.payment_approvals (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    payment_id uuid NOT NULL,
    route_id integer(32) NOT NULL,
    status_id integer(32) NOT NULL,
    current_stage_index integer(32) NOT NULL DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT payment_approvals_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES None.None(None),
    CONSTRAINT payment_approvals_pkey PRIMARY KEY (id),
    CONSTRAINT payment_approvals_route_id_fkey FOREIGN KEY (route_id) REFERENCES None.None(None),
    CONSTRAINT payment_approvals_status_id_fkey FOREIGN KEY (status_id) REFERENCES None.None(None)
);

COMMENT ON TABLE public.payment_approvals IS 'Payment approval instances tracking approval workflow progress';
COMMENT ON COLUMN public.payment_approvals.id IS 'Primary key (UUID)';
COMMENT ON COLUMN public.payment_approvals.payment_id IS 'Payment ID being approved';
COMMENT ON COLUMN public.payment_approvals.route_id IS 'Approval route ID being used';
COMMENT ON COLUMN public.payment_approvals.status_id IS 'Current approval status ID';
COMMENT ON COLUMN public.payment_approvals.current_stage_index IS 'Index of current workflow stage (0-based)';
COMMENT ON COLUMN public.payment_approvals.created_at IS 'Timestamp when the approval was initiated';
COMMENT ON COLUMN public.payment_approvals.updated_at IS 'Timestamp when the approval was last updated';

-- Junction table linking payments with attached files
CREATE TABLE IF NOT EXISTS public.payment_attachments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    payment_id uuid NOT NULL,
    attachment_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT payment_attachments_attachment_id_fkey FOREIGN KEY (attachment_id) REFERENCES None.None(None),
    CONSTRAINT payment_attachments_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES None.None(None),
    CONSTRAINT payment_attachments_pkey PRIMARY KEY (id)
);

COMMENT ON TABLE public.payment_attachments IS 'Junction table linking payments with attached files';
COMMENT ON COLUMN public.payment_attachments.id IS 'Primary key (UUID)';
COMMENT ON COLUMN public.payment_attachments.payment_id IS 'Payment ID';
COMMENT ON COLUMN public.payment_attachments.attachment_id IS 'Attachment ID';
COMMENT ON COLUMN public.payment_attachments.created_at IS 'Timestamp when the link was created';

-- Payment status reference table
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

COMMENT ON TABLE public.payment_statuses IS 'Payment status reference table';
COMMENT ON COLUMN public.payment_statuses.id IS 'Primary key';
COMMENT ON COLUMN public.payment_statuses.code IS 'Unique status code';
COMMENT ON COLUMN public.payment_statuses.name IS 'Status name';
COMMENT ON COLUMN public.payment_statuses.description IS 'Status description';
COMMENT ON COLUMN public.payment_statuses.sort_order IS 'Sort order for display';
COMMENT ON COLUMN public.payment_statuses.color IS 'Display color for UI';
COMMENT ON COLUMN public.payment_statuses.created_at IS 'Timestamp when the status was created';
COMMENT ON COLUMN public.payment_statuses.updated_at IS 'Timestamp when the status was last updated';

-- Payment type reference table
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

COMMENT ON TABLE public.payment_types IS 'Payment type reference table';
COMMENT ON COLUMN public.payment_types.id IS 'Primary key';
COMMENT ON COLUMN public.payment_types.code IS 'Unique type code';
COMMENT ON COLUMN public.payment_types.name IS 'Payment type name';
COMMENT ON COLUMN public.payment_types.description IS 'Payment type description';
COMMENT ON COLUMN public.payment_types.created_at IS 'Timestamp when the type was created';
COMMENT ON COLUMN public.payment_types.updated_at IS 'Timestamp when the type was last updated';

-- Payment records for invoices
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
    is_archived boolean NOT NULL DEFAULT false,
    CONSTRAINT payments_created_by_fkey FOREIGN KEY (created_by) REFERENCES None.None(None),
    CONSTRAINT payments_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES None.None(None),
    CONSTRAINT payments_payment_number_key UNIQUE (payment_number),
    CONSTRAINT payments_payment_type_id_fkey FOREIGN KEY (payment_type_id) REFERENCES None.None(None),
    CONSTRAINT payments_pkey PRIMARY KEY (id),
    CONSTRAINT payments_status_id_fkey FOREIGN KEY (status_id) REFERENCES None.None(None)
);

COMMENT ON TABLE public.payments IS 'Payment records for invoices';
COMMENT ON COLUMN public.payments.id IS 'Primary key (UUID)';
COMMENT ON COLUMN public.payments.invoice_id IS 'Primary invoice this payment is for';
COMMENT ON COLUMN public.payments.payment_number IS 'Sequential payment number';
COMMENT ON COLUMN public.payments.payment_date IS 'Payment date';
COMMENT ON COLUMN public.payments.amount IS 'Total payment amount';
COMMENT ON COLUMN public.payments.description IS 'Payment description or notes';
COMMENT ON COLUMN public.payments.payment_type_id IS 'Payment type';
COMMENT ON COLUMN public.payments.status_id IS 'Payment status';
COMMENT ON COLUMN public.payments.created_by IS 'User ID who created the payment';
COMMENT ON COLUMN public.payments.created_at IS 'Timestamp when the payment was created';
COMMENT ON COLUMN public.payments.updated_at IS 'Timestamp when the payment was last updated';
COMMENT ON COLUMN public.payments.is_archived IS 'Whether the payment is archived';

-- Employee positions/job titles
CREATE TABLE IF NOT EXISTS public.positions (
    id integer(32) NOT NULL DEFAULT nextval('positions_id_seq'::regclass),
    name character varying(255) NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT positions_name_key UNIQUE (name),
    CONSTRAINT positions_pkey PRIMARY KEY (id)
);

COMMENT ON TABLE public.positions IS 'Employee positions/job titles';
COMMENT ON COLUMN public.positions.id IS 'Primary key';
COMMENT ON COLUMN public.positions.name IS 'Position name';
COMMENT ON COLUMN public.positions.description IS 'Position description';
COMMENT ON COLUMN public.positions.created_at IS 'Timestamp when the position was created';
COMMENT ON COLUMN public.positions.updated_at IS 'Timestamp when the position was last updated';

-- Project budgets and financial allocations
CREATE TABLE IF NOT EXISTS public.project_budgets (
    id integer(32) NOT NULL DEFAULT nextval('project_budgets_id_seq'::regclass),
    project_id integer(32) NOT NULL,
    allocated_amount numeric(15,2) NOT NULL DEFAULT 0,
    description text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT project_budgets_created_by_fkey FOREIGN KEY (created_by) REFERENCES None.None(None),
    CONSTRAINT project_budgets_pkey PRIMARY KEY (id),
    CONSTRAINT project_budgets_project_id_fkey FOREIGN KEY (project_id) REFERENCES None.None(None)
);

COMMENT ON TABLE public.project_budgets IS 'Project budgets and financial allocations';
COMMENT ON COLUMN public.project_budgets.id IS 'Primary key';
COMMENT ON COLUMN public.project_budgets.project_id IS 'Project ID';
COMMENT ON COLUMN public.project_budgets.allocated_amount IS 'Total allocated budget amount';
COMMENT ON COLUMN public.project_budgets.description IS 'Budget description or notes';
COMMENT ON COLUMN public.project_budgets.created_by IS 'User ID who created the budget record';
COMMENT ON COLUMN public.project_budgets.created_at IS 'Timestamp when the budget was created';
COMMENT ON COLUMN public.project_budgets.updated_at IS 'Timestamp when the budget was last updated';

-- Company projects
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

COMMENT ON TABLE public.projects IS 'Company projects';
COMMENT ON COLUMN public.projects.id IS 'Primary key';
COMMENT ON COLUMN public.projects.code IS 'Project code/identifier';
COMMENT ON COLUMN public.projects.name IS 'Project name';
COMMENT ON COLUMN public.projects.description IS 'Project description';
COMMENT ON COLUMN public.projects.is_active IS 'Whether the project is currently active';
COMMENT ON COLUMN public.projects.created_by IS 'User ID who created the project';
COMMENT ON COLUMN public.projects.created_at IS 'Timestamp when the project was created';
COMMENT ON COLUMN public.projects.updated_at IS 'Timestamp when the project was last updated';

-- User roles for approval workflow and permissions
CREATE TABLE IF NOT EXISTS public.roles (
    id integer(32) NOT NULL DEFAULT nextval('roles_id_seq'::regclass),
    code character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    own_projects_only boolean DEFAULT false,
    allowed_pages jsonb,
    CONSTRAINT roles_code_key UNIQUE (code),
    CONSTRAINT roles_pkey PRIMARY KEY (id)
);

COMMENT ON TABLE public.roles IS 'User roles for approval workflow and permissions';
COMMENT ON COLUMN public.roles.id IS 'Primary key';
COMMENT ON COLUMN public.roles.code IS 'Unique role code';
COMMENT ON COLUMN public.roles.name IS 'Role name';
COMMENT ON COLUMN public.roles.description IS 'Role description';
COMMENT ON COLUMN public.roles.created_at IS 'Timestamp when the role was created';
COMMENT ON COLUMN public.roles.updated_at IS 'Timestamp when the role was last updated';
COMMENT ON COLUMN public.roles.own_projects_only IS 'Whether user can only see their own projects';
COMMENT ON COLUMN public.roles.allowed_pages IS 'JSON array of allowed page routes';

-- Extended user profiles linked to Supabase auth users
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id uuid NOT NULL,
    email text NOT NULL,
    full_name text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    role_id integer(32),
    CONSTRAINT user_profiles_email_key UNIQUE (email),
    CONSTRAINT user_profiles_id_fkey FOREIGN KEY (id) REFERENCES None.None(None),
    CONSTRAINT user_profiles_pkey PRIMARY KEY (id),
    CONSTRAINT user_profiles_role_id_fkey FOREIGN KEY (role_id) REFERENCES None.None(None)
);

COMMENT ON TABLE public.user_profiles IS 'Extended user profiles linked to Supabase auth users';
COMMENT ON COLUMN public.user_profiles.id IS 'Primary key (matches auth.users.id)';
COMMENT ON COLUMN public.user_profiles.email IS 'User email address';
COMMENT ON COLUMN public.user_profiles.full_name IS 'User full name';
COMMENT ON COLUMN public.user_profiles.created_at IS 'Timestamp when the profile was created';
COMMENT ON COLUMN public.user_profiles.updated_at IS 'Timestamp when the profile was last updated';
COMMENT ON COLUMN public.user_profiles.role_id IS 'User role ID for approval workflow';

-- Junction table linking users with projects they have access to
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

COMMENT ON TABLE public.user_projects IS 'Junction table linking users with projects they have access to';
COMMENT ON COLUMN public.user_projects.id IS 'Primary key';
COMMENT ON COLUMN public.user_projects.user_id IS 'User ID';
COMMENT ON COLUMN public.user_projects.project_id IS 'Project ID';
COMMENT ON COLUMN public.user_projects.created_at IS 'Timestamp when the link was created';

-- Workflow stages for approval routes
CREATE TABLE IF NOT EXISTS public.workflow_stages (
    id integer(32) NOT NULL,
    route_id integer(32) NOT NULL,
    order_index integer(32) NOT NULL,
    role_id integer(32) NOT NULL,
    name character varying(255),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    payment_status_id integer(32),
    permissions jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true,
    CONSTRAINT workflow_stages_payment_status_id_fkey FOREIGN KEY (payment_status_id) REFERENCES None.None(None),
    CONSTRAINT workflow_stages_pkey PRIMARY KEY (id),
    CONSTRAINT workflow_stages_role_id_fkey FOREIGN KEY (role_id) REFERENCES None.None(None),
    CONSTRAINT workflow_stages_route_id_fkey FOREIGN KEY (route_id) REFERENCES None.None(None),
    CONSTRAINT workflow_stages_route_id_order_index_key UNIQUE (order_index),
    CONSTRAINT workflow_stages_route_id_order_index_key UNIQUE (route_id)
);

COMMENT ON TABLE public.workflow_stages IS 'Workflow stages for approval routes';
COMMENT ON COLUMN public.workflow_stages.id IS 'Primary key';
COMMENT ON COLUMN public.workflow_stages.route_id IS 'Approval route ID this stage belongs to';
COMMENT ON COLUMN public.workflow_stages.order_index IS 'Stage order index (0-based)';
COMMENT ON COLUMN public.workflow_stages.role_id IS 'Role ID required for this stage';
COMMENT ON COLUMN public.workflow_stages.name IS 'Stage name';
COMMENT ON COLUMN public.workflow_stages.created_at IS 'Timestamp when the stage was created';
COMMENT ON COLUMN public.workflow_stages.updated_at IS 'Timestamp when the stage was last updated';
COMMENT ON COLUMN public.workflow_stages.payment_status_id IS 'Payment status to set when this stage is reached';
COMMENT ON COLUMN public.workflow_stages.permissions IS 'JSON permissions object for this stage';
COMMENT ON COLUMN public.workflow_stages.is_active IS 'Whether this stage is currently active';

CREATE TABLE IF NOT EXISTS realtime.messages (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone NOT NULL DEFAULT now(),
    inserted_at timestamp without time zone NOT NULL DEFAULT now(),
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    CONSTRAINT messages_pkey PRIMARY KEY (id),
    CONSTRAINT messages_pkey PRIMARY KEY (inserted_at)
);

-- Auth: Manages updates to the auth system.
CREATE TABLE IF NOT EXISTS realtime.schema_migrations (
    version bigint(64) NOT NULL,
    inserted_at timestamp without time zone,
    CONSTRAINT schema_migrations_pkey PRIMARY KEY (version)
);

COMMENT ON TABLE realtime.schema_migrations IS 'Auth: Manages updates to the auth system.';

CREATE TABLE IF NOT EXISTS realtime.subscription (
    id bigint(64) NOT NULL,
    subscription_id uuid NOT NULL,
    entity regclass NOT NULL,
    filters ARRAY NOT NULL DEFAULT '{}'::realtime.user_defined_filter[],
    claims jsonb NOT NULL,
    claims_role regrole NOT NULL,
    created_at timestamp without time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT pk_subscription PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS storage.buckets (
    id text NOT NULL,
    name text NOT NULL,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    public boolean DEFAULT false,
    avif_autodetection boolean DEFAULT false,
    file_size_limit bigint(64),
    allowed_mime_types ARRAY,
    owner_id text,
    type USER-DEFINED NOT NULL DEFAULT 'STANDARD'::storage.buckettype,
    CONSTRAINT buckets_pkey PRIMARY KEY (id)
);
COMMENT ON COLUMN storage.buckets.owner IS 'Field is deprecated, use owner_id instead';

CREATE TABLE IF NOT EXISTS storage.buckets_analytics (
    id text NOT NULL,
    type USER-DEFINED NOT NULL DEFAULT 'ANALYTICS'::storage.buckettype,
    format text NOT NULL DEFAULT 'ICEBERG'::text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT buckets_analytics_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS storage.iceberg_namespaces (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    bucket_id text NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT iceberg_namespaces_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES None.None(None),
    CONSTRAINT iceberg_namespaces_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS storage.iceberg_tables (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    namespace_id uuid NOT NULL,
    bucket_id text NOT NULL,
    name text NOT NULL,
    location text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT iceberg_tables_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES None.None(None),
    CONSTRAINT iceberg_tables_namespace_id_fkey FOREIGN KEY (namespace_id) REFERENCES None.None(None),
    CONSTRAINT iceberg_tables_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS storage.migrations (
    id integer(32) NOT NULL,
    name character varying(100) NOT NULL,
    hash character varying(40) NOT NULL,
    executed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT migrations_name_key UNIQUE (name),
    CONSTRAINT migrations_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS storage.objects (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    bucket_id text,
    name text,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_accessed_at timestamp with time zone DEFAULT now(),
    metadata jsonb,
    path_tokens ARRAY,
    version text,
    owner_id text,
    user_metadata jsonb,
    level integer(32),
    CONSTRAINT objects_bucketId_fkey FOREIGN KEY (bucket_id) REFERENCES None.None(None),
    CONSTRAINT objects_pkey PRIMARY KEY (id)
);
COMMENT ON COLUMN storage.objects.owner IS 'Field is deprecated, use owner_id instead';

CREATE TABLE IF NOT EXISTS storage.prefixes (
    bucket_id text NOT NULL,
    name text NOT NULL,
    level integer(32) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT prefixes_bucketId_fkey FOREIGN KEY (bucket_id) REFERENCES None.None(None),
    CONSTRAINT prefixes_pkey PRIMARY KEY (bucket_id),
    CONSTRAINT prefixes_pkey PRIMARY KEY (level),
    CONSTRAINT prefixes_pkey PRIMARY KEY (name)
);

CREATE TABLE IF NOT EXISTS storage.s3_multipart_uploads (
    id text NOT NULL,
    in_progress_size bigint(64) NOT NULL DEFAULT 0,
    upload_signature text NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL,
    version text NOT NULL,
    owner_id text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    user_metadata jsonb,
    CONSTRAINT s3_multipart_uploads_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES None.None(None),
    CONSTRAINT s3_multipart_uploads_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS storage.s3_multipart_uploads_parts (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    upload_id text NOT NULL,
    size bigint(64) NOT NULL DEFAULT 0,
    part_number integer(32) NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL,
    etag text NOT NULL,
    owner_id text,
    version text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT s3_multipart_uploads_parts_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES None.None(None),
    CONSTRAINT s3_multipart_uploads_parts_pkey PRIMARY KEY (id),
    CONSTRAINT s3_multipart_uploads_parts_upload_id_fkey FOREIGN KEY (upload_id) REFERENCES None.None(None)
);

-- Supabase Functions Hooks: Audit trail for triggered hooks.
CREATE TABLE IF NOT EXISTS supabase_functions.hooks (
    id bigint(64) NOT NULL DEFAULT nextval('supabase_functions.hooks_id_seq'::regclass),
    hook_table_id integer(32) NOT NULL,
    hook_name text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    request_id bigint(64),
    CONSTRAINT hooks_pkey PRIMARY KEY (id)
);

COMMENT ON TABLE supabase_functions.hooks IS 'Supabase Functions Hooks: Audit trail for triggered hooks.';

CREATE TABLE IF NOT EXISTS supabase_functions.migrations (
    version text NOT NULL,
    inserted_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT migrations_pkey PRIMARY KEY (version)
);

-- Table with encrypted `secret` column for storing sensitive information on disk.
CREATE TABLE IF NOT EXISTS vault.secrets (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text,
    description text NOT NULL DEFAULT ''::text,
    secret text NOT NULL,
    key_id uuid,
    nonce bytea DEFAULT vault._crypto_aead_det_noncegen(),
    created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT secrets_pkey PRIMARY KEY (id)
);

COMMENT ON TABLE vault.secrets IS 'Table with encrypted `secret` column for storing sensitive information on disk.';


-- VIEWS
-- ============================================

CREATE OR REPLACE VIEW extensions.pg_stat_statements AS
 SELECT pg_stat_statements.userid,
    pg_stat_statements.dbid,
    pg_stat_statements.toplevel,
    pg_stat_statements.queryid,
    pg_stat_statements.query,
    pg_stat_statements.plans,
    pg_stat_statements.total_plan_time,
    pg_stat_statements.min_plan_time,
    pg_stat_statements.max_plan_time,
    pg_stat_statements.mean_plan_time,
    pg_stat_statements.stddev_plan_time,
    pg_stat_statements.calls,
    pg_stat_statements.total_exec_time,
    pg_stat_statements.min_exec_time,
    pg_stat_statements.max_exec_time,
    pg_stat_statements.mean_exec_time,
    pg_stat_statements.stddev_exec_time,
    pg_stat_statements.rows,
    pg_stat_statements.shared_blks_hit,
    pg_stat_statements.shared_blks_read,
    pg_stat_statements.shared_blks_dirtied,
    pg_stat_statements.shared_blks_written,
    pg_stat_statements.local_blks_hit,
    pg_stat_statements.local_blks_read,
    pg_stat_statements.local_blks_dirtied,
    pg_stat_statements.local_blks_written,
    pg_stat_statements.temp_blks_read,
    pg_stat_statements.temp_blks_written,
    pg_stat_statements.blk_read_time,
    pg_stat_statements.blk_write_time,
    pg_stat_statements.temp_blk_read_time,
    pg_stat_statements.temp_blk_write_time,
    pg_stat_statements.wal_records,
    pg_stat_statements.wal_fpi,
    pg_stat_statements.wal_bytes,
    pg_stat_statements.jit_functions,
    pg_stat_statements.jit_generation_time,
    pg_stat_statements.jit_inlining_count,
    pg_stat_statements.jit_inlining_time,
    pg_stat_statements.jit_optimization_count,
    pg_stat_statements.jit_optimization_time,
    pg_stat_statements.jit_emission_count,
    pg_stat_statements.jit_emission_time
   FROM pg_stat_statements(true) pg_stat_statements(userid, dbid, toplevel, queryid, query, plans, total_plan_time, min_plan_time, max_plan_time, mean_plan_time, stddev_plan_time, calls, total_exec_time, min_exec_time, max_exec_time, mean_exec_time, stddev_exec_time, rows, shared_blks_hit, shared_blks_read, shared_blks_dirtied, shared_blks_written, local_blks_hit, local_blks_read, local_blks_dirtied, local_blks_written, temp_blks_read, temp_blks_written, blk_read_time, blk_write_time, temp_blk_read_time, temp_blk_write_time, wal_records, wal_fpi, wal_bytes, jit_functions, jit_generation_time, jit_inlining_count, jit_inlining_time, jit_optimization_count, jit_optimization_time, jit_emission_count, jit_emission_time);

CREATE OR REPLACE VIEW extensions.pg_stat_statements_info AS
 SELECT pg_stat_statements_info.dealloc,
    pg_stat_statements_info.stats_reset
   FROM pg_stat_statements_info() pg_stat_statements_info(dealloc, stats_reset);

CREATE OR REPLACE VIEW public.audit_log_view AS
 SELECT al.id,
    al.entity_type,
    al.entity_id,
    al.action,
    al.field_name,
    al.old_value,
    al.new_value,
    al.created_at,
    al.metadata,
    up.full_name AS user_name,
    up.email AS user_email
   FROM (audit_log al
     LEFT JOIN user_profiles up ON ((al.user_id = up.id)))
  ORDER BY al.created_at DESC;

CREATE OR REPLACE VIEW public.material_classes_hierarchy AS
 SELECT c.id,
    c.name,
    c.parent_id,
    c.level,
    c.is_active,
    p.name AS parent_name,
    c.created_at,
    c.updated_at
   FROM (material_classes c
     LEFT JOIN material_classes p ON ((c.parent_id = p.id)))
  ORDER BY COALESCE(c.parent_id, c.id), c.id;

CREATE OR REPLACE VIEW vault.decrypted_secrets AS
 SELECT s.id,
    s.name,
    s.description,
    s.secret,
    convert_from(vault._crypto_aead_det_decrypt(message => decode(s.secret, 'base64'::text), additional => convert_to((s.id)::text, 'utf8'::name), key_id => (0)::bigint, context => '\x7067736f6469756d'::bytea, nonce => s.nonce), 'utf8'::name) AS decrypted_secret,
    s.key_id,
    s.nonce,
    s.created_at,
    s.updated_at
   FROM vault.secrets s;


-- FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION auth.email()
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.email', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')
  )::text
$function$

;

CREATE OR REPLACE FUNCTION auth.jwt()
 RETURNS jsonb
 LANGUAGE sql
 STABLE
AS $function$
  select 
    coalesce(
        nullif(current_setting('request.jwt.claim', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')
    )::jsonb
$function$

;

CREATE OR REPLACE FUNCTION auth.role()
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$function$

;

CREATE OR REPLACE FUNCTION auth.uid()
 RETURNS uuid
 LANGUAGE sql
 STABLE
AS $function$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$function$

;

CREATE OR REPLACE FUNCTION cron.alter_job(job_id bigint, schedule text DEFAULT NULL::text, command text DEFAULT NULL::text, database text DEFAULT NULL::text, username text DEFAULT NULL::text, active boolean DEFAULT NULL::boolean)
 RETURNS void
 LANGUAGE c
AS '$libdir/pg_cron', $function$cron_alter_job$function$

;

CREATE OR REPLACE FUNCTION cron.job_cache_invalidate()
 RETURNS trigger
 LANGUAGE c
AS '$libdir/pg_cron', $function$cron_job_cache_invalidate$function$

;

CREATE OR REPLACE FUNCTION cron.schedule(job_name text, schedule text, command text)
 RETURNS bigint
 LANGUAGE c
AS '$libdir/pg_cron', $function$cron_schedule_named$function$

;

CREATE OR REPLACE FUNCTION cron.schedule(schedule text, command text)
 RETURNS bigint
 LANGUAGE c
 STRICT
AS '$libdir/pg_cron', $function$cron_schedule$function$

;

CREATE OR REPLACE FUNCTION cron.schedule_in_database(job_name text, schedule text, command text, database text, username text DEFAULT NULL::text, active boolean DEFAULT true)
 RETURNS bigint
 LANGUAGE c
AS '$libdir/pg_cron', $function$cron_schedule_named$function$

;

CREATE OR REPLACE FUNCTION cron.unschedule(job_name text)
 RETURNS boolean
 LANGUAGE c
 STRICT
AS '$libdir/pg_cron', $function$cron_unschedule_named$function$

;

CREATE OR REPLACE FUNCTION cron.unschedule(job_id bigint)
 RETURNS boolean
 LANGUAGE c
 STRICT
AS '$libdir/pg_cron', $function$cron_unschedule$function$

;

CREATE OR REPLACE FUNCTION extensions.algorithm_sign(signables text, secret text, algorithm text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
WITH
  alg AS (
    SELECT CASE
      WHEN algorithm = 'HS256' THEN 'sha256'
      WHEN algorithm = 'HS384' THEN 'sha384'
      WHEN algorithm = 'HS512' THEN 'sha512'
      ELSE '' END AS id)  -- hmac throws error
SELECT extensions.url_encode(extensions.hmac(signables, secret, alg.id)) FROM alg;
$function$

;

CREATE OR REPLACE FUNCTION extensions.armor(bytea, text[], text[])
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_armor$function$

;

CREATE OR REPLACE FUNCTION extensions.armor(bytea)
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_armor$function$

;

CREATE OR REPLACE FUNCTION extensions.crypt(text, text)
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_crypt$function$

;

CREATE OR REPLACE FUNCTION extensions.dearmor(text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_dearmor$function$

;

CREATE OR REPLACE FUNCTION extensions.decrypt(bytea, bytea, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_decrypt$function$

;

CREATE OR REPLACE FUNCTION extensions.decrypt_iv(bytea, bytea, bytea, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_decrypt_iv$function$

;

CREATE OR REPLACE FUNCTION extensions.digest(bytea, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_digest$function$

;

CREATE OR REPLACE FUNCTION extensions.digest(text, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_digest$function$

;

CREATE OR REPLACE FUNCTION extensions.encrypt(bytea, bytea, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_encrypt$function$

;

CREATE OR REPLACE FUNCTION extensions.encrypt_iv(bytea, bytea, bytea, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_encrypt_iv$function$

;

CREATE OR REPLACE FUNCTION extensions.gen_random_bytes(integer)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_random_bytes$function$

;

CREATE OR REPLACE FUNCTION extensions.gen_random_uuid()
 RETURNS uuid
 LANGUAGE c
 PARALLEL SAFE
AS '$libdir/pgcrypto', $function$pg_random_uuid$function$

;

CREATE OR REPLACE FUNCTION extensions.gen_salt(text, integer)
 RETURNS text
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_gen_salt_rounds$function$

;

CREATE OR REPLACE FUNCTION extensions.gen_salt(text)
 RETURNS text
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_gen_salt$function$

;

CREATE OR REPLACE FUNCTION extensions.grant_pg_cron_access()
 RETURNS event_trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF EXISTS (
    SELECT
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_cron'
  )
  THEN
    grant usage on schema cron to postgres with grant option;

    alter default privileges in schema cron grant all on tables to postgres with grant option;
    alter default privileges in schema cron grant all on functions to postgres with grant option;
    alter default privileges in schema cron grant all on sequences to postgres with grant option;

    alter default privileges for user supabase_admin in schema cron grant all
        on sequences to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on tables to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on functions to postgres with grant option;

    grant all privileges on all tables in schema cron to postgres with grant option;
    revoke all on table cron.job from postgres;
    grant select on table cron.job to postgres with grant option;
  END IF;
END;
$function$

;

CREATE OR REPLACE FUNCTION extensions.grant_pg_graphql_access()
 RETURNS event_trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    func_is_graphql_resolve bool;
BEGIN
    func_is_graphql_resolve = (
        SELECT n.proname = 'resolve'
        FROM pg_event_trigger_ddl_commands() AS ev
        LEFT JOIN pg_catalog.pg_proc AS n
        ON ev.objid = n.oid
    );

    IF func_is_graphql_resolve
    THEN
        -- Update public wrapper to pass all arguments through to the pg_graphql resolve func
        DROP FUNCTION IF EXISTS graphql_public.graphql;
        create or replace function graphql_public.graphql(
            "operationName" text default null,
            query text default null,
            variables jsonb default null,
            extensions jsonb default null
        )
            returns jsonb
            language sql
        as $$
            select graphql.resolve(
                query := query,
                variables := coalesce(variables, '{}'),
                "operationName" := "operationName",
                extensions := extensions
            );
        $$;

        -- This hook executes when `graphql.resolve` is created. That is not necessarily the last
        -- function in the extension so we need to grant permissions on existing entities AND
        -- update default permissions to any others that are created after `graphql.resolve`
        grant usage on schema graphql to postgres, anon, authenticated, service_role;
        grant select on all tables in schema graphql to postgres, anon, authenticated, service_role;
        grant execute on all functions in schema graphql to postgres, anon, authenticated, service_role;
        grant all on all sequences in schema graphql to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on tables to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on functions to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on sequences to postgres, anon, authenticated, service_role;

        -- Allow postgres role to allow granting usage on graphql and graphql_public schemas to custom roles
        grant usage on schema graphql_public to postgres with grant option;
        grant usage on schema graphql to postgres with grant option;
    END IF;

END;
$function$

;

CREATE OR REPLACE FUNCTION extensions.grant_pg_net_access()
 RETURNS event_trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_net'
  )
  THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_roles
      WHERE rolname = 'supabase_functions_admin'
    )
    THEN
      CREATE USER supabase_functions_admin NOINHERIT CREATEROLE LOGIN NOREPLICATION;
    END IF;

    GRANT USAGE ON SCHEMA net TO supabase_functions_admin, postgres, anon, authenticated, service_role;

    IF EXISTS (
      SELECT FROM pg_extension
      WHERE extname = 'pg_net'
      -- all versions in use on existing projects as of 2025-02-20
      -- version 0.12.0 onwards don't need these applied
      AND extversion IN ('0.2', '0.6', '0.7', '0.7.1', '0.8', '0.10.0', '0.11.0')
    ) THEN
      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;

      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;

      REVOKE ALL ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;
      REVOKE ALL ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;

      GRANT EXECUTE ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
      GRANT EXECUTE ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
    END IF;
  END IF;
END;
$function$

;

CREATE OR REPLACE FUNCTION extensions.hmac(text, text, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_hmac$function$

;

CREATE OR REPLACE FUNCTION extensions.hmac(bytea, bytea, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_hmac$function$

;

CREATE OR REPLACE FUNCTION extensions.pg_stat_statements(showtext boolean, OUT userid oid, OUT dbid oid, OUT toplevel boolean, OUT queryid bigint, OUT query text, OUT plans bigint, OUT total_plan_time double precision, OUT min_plan_time double precision, OUT max_plan_time double precision, OUT mean_plan_time double precision, OUT stddev_plan_time double precision, OUT calls bigint, OUT total_exec_time double precision, OUT min_exec_time double precision, OUT max_exec_time double precision, OUT mean_exec_time double precision, OUT stddev_exec_time double precision, OUT rows bigint, OUT shared_blks_hit bigint, OUT shared_blks_read bigint, OUT shared_blks_dirtied bigint, OUT shared_blks_written bigint, OUT local_blks_hit bigint, OUT local_blks_read bigint, OUT local_blks_dirtied bigint, OUT local_blks_written bigint, OUT temp_blks_read bigint, OUT temp_blks_written bigint, OUT blk_read_time double precision, OUT blk_write_time double precision, OUT temp_blk_read_time double precision, OUT temp_blk_write_time double precision, OUT wal_records bigint, OUT wal_fpi bigint, OUT wal_bytes numeric, OUT jit_functions bigint, OUT jit_generation_time double precision, OUT jit_inlining_count bigint, OUT jit_inlining_time double precision, OUT jit_optimization_count bigint, OUT jit_optimization_time double precision, OUT jit_emission_count bigint, OUT jit_emission_time double precision)
 RETURNS SETOF record
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pg_stat_statements', $function$pg_stat_statements_1_10$function$

;

CREATE OR REPLACE FUNCTION extensions.pg_stat_statements_info(OUT dealloc bigint, OUT stats_reset timestamp with time zone)
 RETURNS record
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pg_stat_statements', $function$pg_stat_statements_info$function$

;

CREATE OR REPLACE FUNCTION extensions.pg_stat_statements_reset(userid oid DEFAULT 0, dbid oid DEFAULT 0, queryid bigint DEFAULT 0)
 RETURNS void
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pg_stat_statements', $function$pg_stat_statements_reset_1_7$function$

;

CREATE OR REPLACE FUNCTION extensions.pgp_armor_headers(text, OUT key text, OUT value text)
 RETURNS SETOF record
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_armor_headers$function$

;

CREATE OR REPLACE FUNCTION extensions.pgp_key_id(bytea)
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_key_id_w$function$

;

CREATE OR REPLACE FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text)
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_decrypt_text$function$

;

CREATE OR REPLACE FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text, text)
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_decrypt_text$function$

;

CREATE OR REPLACE FUNCTION extensions.pgp_pub_decrypt(bytea, bytea)
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_decrypt_text$function$

;

CREATE OR REPLACE FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_decrypt_bytea$function$

;

CREATE OR REPLACE FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_decrypt_bytea$function$

;

CREATE OR REPLACE FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_decrypt_bytea$function$

;

CREATE OR REPLACE FUNCTION extensions.pgp_pub_encrypt(text, bytea, text)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_encrypt_text$function$

;

CREATE OR REPLACE FUNCTION extensions.pgp_pub_encrypt(text, bytea)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_encrypt_text$function$

;

CREATE OR REPLACE FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea, text)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_encrypt_bytea$function$

;

CREATE OR REPLACE FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_encrypt_bytea$function$

;

CREATE OR REPLACE FUNCTION extensions.pgp_sym_decrypt(bytea, text, text)
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_sym_decrypt_text$function$

;

CREATE OR REPLACE FUNCTION extensions.pgp_sym_decrypt(bytea, text)
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_sym_decrypt_text$function$

;

CREATE OR REPLACE FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_sym_decrypt_bytea$function$

;

CREATE OR REPLACE FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_sym_decrypt_bytea$function$

;

CREATE OR REPLACE FUNCTION extensions.pgp_sym_encrypt(text, text, text)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_sym_encrypt_text$function$

;

CREATE OR REPLACE FUNCTION extensions.pgp_sym_encrypt(text, text)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_sym_encrypt_text$function$

;

CREATE OR REPLACE FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_sym_encrypt_bytea$function$

;

CREATE OR REPLACE FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text, text)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_sym_encrypt_bytea$function$

;

CREATE OR REPLACE FUNCTION extensions.pgrst_ddl_watch()
 RETURNS event_trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN SELECT * FROM pg_event_trigger_ddl_commands()
  LOOP
    IF cmd.command_tag IN (
      'CREATE SCHEMA', 'ALTER SCHEMA'
    , 'CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO', 'ALTER TABLE'
    , 'CREATE FOREIGN TABLE', 'ALTER FOREIGN TABLE'
    , 'CREATE VIEW', 'ALTER VIEW'
    , 'CREATE MATERIALIZED VIEW', 'ALTER MATERIALIZED VIEW'
    , 'CREATE FUNCTION', 'ALTER FUNCTION'
    , 'CREATE TRIGGER'
    , 'CREATE TYPE', 'ALTER TYPE'
    , 'CREATE RULE'
    , 'COMMENT'
    )
    -- don't notify in case of CREATE TEMP table or other objects created on pg_temp
    AND cmd.schema_name is distinct from 'pg_temp'
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $function$

;

CREATE OR REPLACE FUNCTION extensions.pgrst_drop_watch()
 RETURNS event_trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  obj record;
BEGIN
  FOR obj IN SELECT * FROM pg_event_trigger_dropped_objects()
  LOOP
    IF obj.object_type IN (
      'schema'
    , 'table'
    , 'foreign table'
    , 'view'
    , 'materialized view'
    , 'function'
    , 'trigger'
    , 'type'
    , 'rule'
    )
    AND obj.is_temporary IS false -- no pg_temp objects
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $function$

;

CREATE OR REPLACE FUNCTION extensions.set_graphql_placeholder()
 RETURNS event_trigger
 LANGUAGE plpgsql
AS $function$
    DECLARE
    graphql_is_dropped bool;
    BEGIN
    graphql_is_dropped = (
        SELECT ev.schema_name = 'graphql_public'
        FROM pg_event_trigger_dropped_objects() AS ev
        WHERE ev.schema_name = 'graphql_public'
    );

    IF graphql_is_dropped
    THEN
        create or replace function graphql_public.graphql(
            "operationName" text default null,
            query text default null,
            variables jsonb default null,
            extensions jsonb default null
        )
            returns jsonb
            language plpgsql
        as $$
            DECLARE
                server_version float;
            BEGIN
                server_version = (SELECT (SPLIT_PART((select version()), ' ', 2))::float);

                IF server_version >= 14 THEN
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql extension is not enabled.'
                            )
                        )
                    );
                ELSE
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql is only available on projects running Postgres 14 onwards.'
                            )
                        )
                    );
                END IF;
            END;
        $$;
    END IF;

    END;
$function$

;

CREATE OR REPLACE FUNCTION extensions.sign(payload json, secret text, algorithm text DEFAULT 'HS256'::text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
WITH
  header AS (
    SELECT extensions.url_encode(convert_to('{"alg":"' || algorithm || '","typ":"JWT"}', 'utf8')) AS data
    ),
  payload AS (
    SELECT extensions.url_encode(convert_to(payload::text, 'utf8')) AS data
    ),
  signables AS (
    SELECT header.data || '.' || payload.data AS data FROM header, payload
    )
SELECT
    signables.data || '.' ||
    extensions.algorithm_sign(signables.data, secret, algorithm) FROM signables;
$function$

;

CREATE OR REPLACE FUNCTION extensions.try_cast_double(inp text)
 RETURNS double precision
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
  BEGIN
    BEGIN
      RETURN inp::double precision;
    EXCEPTION
      WHEN OTHERS THEN RETURN NULL;
    END;
  END;
$function$

;

CREATE OR REPLACE FUNCTION extensions.url_decode(data text)
 RETURNS bytea
 LANGUAGE sql
 IMMUTABLE
AS $function$
WITH t AS (SELECT translate(data, '-_', '+/') AS trans),
     rem AS (SELECT length(t.trans) % 4 AS remainder FROM t) -- compute padding size
    SELECT decode(
        t.trans ||
        CASE WHEN rem.remainder > 0
           THEN repeat('=', (4 - rem.remainder))
           ELSE '' END,
    'base64') FROM t, rem;
$function$

;

CREATE OR REPLACE FUNCTION extensions.url_encode(data bytea)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
    SELECT translate(encode(data, 'base64'), E'+/=\n', '-_');
$function$

;

CREATE OR REPLACE FUNCTION extensions.uuid_generate_v1()
 RETURNS uuid
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_generate_v1$function$

;

CREATE OR REPLACE FUNCTION extensions.uuid_generate_v1mc()
 RETURNS uuid
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_generate_v1mc$function$

;

CREATE OR REPLACE FUNCTION extensions.uuid_generate_v3(namespace uuid, name text)
 RETURNS uuid
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_generate_v3$function$

;

CREATE OR REPLACE FUNCTION extensions.uuid_generate_v4()
 RETURNS uuid
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_generate_v4$function$

;

CREATE OR REPLACE FUNCTION extensions.uuid_generate_v5(namespace uuid, name text)
 RETURNS uuid
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_generate_v5$function$

;

CREATE OR REPLACE FUNCTION extensions.uuid_nil()
 RETURNS uuid
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_nil$function$

;

CREATE OR REPLACE FUNCTION extensions.uuid_ns_dns()
 RETURNS uuid
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_ns_dns$function$

;

CREATE OR REPLACE FUNCTION extensions.uuid_ns_oid()
 RETURNS uuid
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_ns_oid$function$

;

CREATE OR REPLACE FUNCTION extensions.uuid_ns_url()
 RETURNS uuid
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_ns_url$function$

;

CREATE OR REPLACE FUNCTION extensions.uuid_ns_x500()
 RETURNS uuid
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_ns_x500$function$

;

CREATE OR REPLACE FUNCTION extensions.verify(token text, secret text, algorithm text DEFAULT 'HS256'::text)
 RETURNS TABLE(header json, payload json, valid boolean)
 LANGUAGE sql
 IMMUTABLE
AS $function$
  SELECT
    jwt.header AS header,
    jwt.payload AS payload,
    jwt.signature_ok AND tstzrange(
      to_timestamp(extensions.try_cast_double(jwt.payload->>'nbf')),
      to_timestamp(extensions.try_cast_double(jwt.payload->>'exp'))
    ) @> CURRENT_TIMESTAMP AS valid
  FROM (
    SELECT
      convert_from(extensions.url_decode(r[1]), 'utf8')::json AS header,
      convert_from(extensions.url_decode(r[2]), 'utf8')::json AS payload,
      r[3] = extensions.algorithm_sign(r[1] || '.' || r[2], secret, algorithm) AS signature_ok
    FROM regexp_split_to_array(token, '\.') r
  ) jwt
$function$

;

CREATE OR REPLACE FUNCTION graphql._internal_resolve(query text, variables jsonb DEFAULT '{}'::jsonb, "operationName" text DEFAULT NULL::text, extensions jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE c
AS '$libdir/pg_graphql', $function$resolve_wrapper$function$

;

CREATE OR REPLACE FUNCTION graphql.comment_directive(comment_ text)
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
AS $function$
    /*
    comment on column public.account.name is '@graphql.name: myField'
    */
    select
        coalesce(
            (
                regexp_match(
                    comment_,
                    '@graphql\((.+)\)'
                )
            )[1]::jsonb,
            jsonb_build_object()
        )
$function$

;

CREATE OR REPLACE FUNCTION graphql.exception(message text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
begin
    raise exception using errcode='22000', message=message;
end;
$function$

;

CREATE OR REPLACE FUNCTION graphql.get_schema_version()
 RETURNS integer
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
    select last_value from graphql.seq_schema_version;
$function$

;

CREATE OR REPLACE FUNCTION graphql.increment_schema_version()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
    perform pg_catalog.nextval('graphql.seq_schema_version');
end;
$function$

;

CREATE OR REPLACE FUNCTION graphql.resolve(query text, variables jsonb DEFAULT '{}'::jsonb, "operationName" text DEFAULT NULL::text, extensions jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
declare
    res jsonb;
    message_text text;
begin
  begin
    select graphql._internal_resolve("query" := "query",
                                     "variables" := "variables",
                                     "operationName" := "operationName",
                                     "extensions" := "extensions") into res;
    return res;
  exception
    when others then
    get stacked diagnostics message_text = message_text;
    return
    jsonb_build_object('data', null,
                       'errors', jsonb_build_array(jsonb_build_object('message', message_text)));
  end;
end;
$function$

;

CREATE OR REPLACE FUNCTION graphql_public.graphql("operationName" text DEFAULT NULL::text, query text DEFAULT NULL::text, variables jsonb DEFAULT NULL::jsonb, extensions jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE sql
AS $function$
            select graphql.resolve(
                query := query,
                variables := coalesce(variables, '{}'),
                "operationName" := "operationName",
                extensions := extensions
            );
        $function$

;

CREATE OR REPLACE FUNCTION net._await_response(request_id bigint)
 RETURNS boolean
 LANGUAGE plpgsql
 PARALLEL SAFE STRICT
AS $function$
declare
    rec net._http_response;
begin
    while rec is null loop
        select *
        into rec
        from net._http_response
        where id = request_id;

        if rec is null then
            -- Wait 50 ms before checking again
            perform pg_sleep(0.05);
        end if;
    end loop;

    return true;
end;
$function$

;

CREATE OR REPLACE FUNCTION net._encode_url_with_params_array(url text, params_array text[])
 RETURNS text
 LANGUAGE c
 IMMUTABLE STRICT
AS 'pg_net', $function$_encode_url_with_params_array$function$

;

CREATE OR REPLACE FUNCTION net._http_collect_response(request_id bigint, async boolean DEFAULT true)
 RETURNS net.http_response_result
 LANGUAGE plpgsql
 PARALLEL SAFE STRICT
AS $function$
declare
    rec net._http_response;
    req_exists boolean;
begin

    if not async then
        perform net._await_response(request_id);
    end if;

    select *
    into rec
    from net._http_response
    where id = request_id;

    if rec is null or rec.error_msg is not null then
        -- The request is either still processing or the request_id provided does not exist

        -- TODO: request in progress is indistinguishable from request that doesn't exist

        -- No request matching request_id found
        return (
            'ERROR',
            coalesce(rec.error_msg, 'request matching request_id not found'),
            null
        )::net.http_response_result;

    end if;

    -- Return a valid, populated http_response_result
    return (
        'SUCCESS',
        'ok',
        (
            rec.status_code,
            rec.headers,
            rec.content
        )::net.http_response
    )::net.http_response_result;
end;
$function$

;

CREATE OR REPLACE FUNCTION net._urlencode_string(string character varying)
 RETURNS text
 LANGUAGE c
 IMMUTABLE STRICT
AS 'pg_net', $function$_urlencode_string$function$

;

CREATE OR REPLACE FUNCTION net.check_worker_is_up()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
begin
  if not exists (select pid from pg_stat_activity where backend_type ilike '%pg_net%') then
    raise exception using
      message = 'the pg_net background worker is not up'
    , detail  = 'the pg_net background worker is down due to an internal error and cannot process requests'
    , hint    = 'make sure that you didn''t modify any of pg_net internal tables';
  end if;
end
$function$

;

CREATE OR REPLACE FUNCTION net.http_collect_response(request_id bigint, async boolean DEFAULT true)
 RETURNS net.http_response_result
 LANGUAGE plpgsql
 PARALLEL SAFE STRICT
AS $function$
begin
  raise notice 'The net.http_collect_response function is deprecated.';
  select net._http_collect_response(request_id, async);
end;
$function$

;

CREATE OR REPLACE FUNCTION net.http_delete(url text, params jsonb DEFAULT '{}'::jsonb, headers jsonb DEFAULT '{}'::jsonb, timeout_milliseconds integer DEFAULT 5000)
 RETURNS bigint
 LANGUAGE plpgsql
 PARALLEL SAFE STRICT
AS $function$
declare
    request_id bigint;
    params_array text[];
begin
    select coalesce(array_agg(net._urlencode_string(key) || '=' || net._urlencode_string(value)), '{}')
    into params_array
    from jsonb_each_text(params);

    -- Add to the request queue
    insert into net.http_request_queue(method, url, headers, timeout_milliseconds)
    values (
        'DELETE',
        net._encode_url_with_params_array(url, params_array),
        headers,
        timeout_milliseconds
    )
    returning id
    into request_id;

    return request_id;
end
$function$

;

CREATE OR REPLACE FUNCTION net.http_get(url text, params jsonb DEFAULT '{}'::jsonb, headers jsonb DEFAULT '{}'::jsonb, timeout_milliseconds integer DEFAULT 5000)
 RETURNS bigint
 LANGUAGE plpgsql
 PARALLEL SAFE STRICT
 SET search_path TO 'net'
AS $function$
declare
    request_id bigint;
    params_array text[];
begin
    select coalesce(array_agg(net._urlencode_string(key) || '=' || net._urlencode_string(value)), '{}')
    into params_array
    from jsonb_each_text(params);

    -- Add to the request queue
    insert into net.http_request_queue(method, url, headers, timeout_milliseconds)
    values (
        'GET',
        net._encode_url_with_params_array(url, params_array),
        headers,
        timeout_milliseconds
    )
    returning id
    into request_id;

    return request_id;
end
$function$

;

CREATE OR REPLACE FUNCTION net.http_post(url text, body jsonb DEFAULT '{}'::jsonb, params jsonb DEFAULT '{}'::jsonb, headers jsonb DEFAULT '{"Content-Type": "application/json"}'::jsonb, timeout_milliseconds integer DEFAULT 5000)
 RETURNS bigint
 LANGUAGE plpgsql
 PARALLEL SAFE
 SET search_path TO 'net'
AS $function$
declare
    request_id bigint;
    params_array text[];
    content_type text;
begin

    -- Exctract the content_type from headers
    select
        header_value into content_type
    from
        jsonb_each_text(coalesce(headers, '{}'::jsonb)) r(header_name, header_value)
    where
        lower(header_name) = 'content-type'
    limit
        1;

    -- If the user provided new headers and omitted the content type
    -- add it back in automatically
    if content_type is null then
        select headers || '{"Content-Type": "application/json"}'::jsonb into headers;
    end if;

    -- Confirm that the content-type is set as "application/json"
    if content_type <> 'application/json' then
        raise exception 'Content-Type header must be "application/json"';
    end if;

    select
        coalesce(array_agg(net._urlencode_string(key) || '=' || net._urlencode_string(value)), '{}')
    into
        params_array
    from
        jsonb_each_text(params);

    -- Add to the request queue
    insert into net.http_request_queue(method, url, headers, body, timeout_milliseconds)
    values (
        'POST',
        net._encode_url_with_params_array(url, params_array),
        headers,
        convert_to(body::text, 'UTF8'),
        timeout_milliseconds
    )
    returning id
    into request_id;

    return request_id;
end
$function$

;

CREATE OR REPLACE FUNCTION net.worker_restart()
 RETURNS boolean
 LANGUAGE c
AS 'pg_net', $function$worker_restart$function$

;

CREATE OR REPLACE FUNCTION pgbouncer.get_auth(p_usename text)
 RETURNS TABLE(username text, password text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RAISE WARNING 'PgBouncer auth request: %', p_usename;

    RETURN QUERY
    SELECT usename::TEXT, passwd::TEXT FROM pg_catalog.pg_shadow
    WHERE usename = p_usename;
END;
$function$

;

CREATE OR REPLACE FUNCTION public.add_working_days(start_date date, days_to_add integer)
 RETURNS date
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
DECLARE
  result_date DATE := start_date;
  working_days_added INTEGER := 0;
BEGIN
  WHILE working_days_added < days_to_add LOOP
    result_date := result_date + INTERVAL '1 day';

    -- Count only if not weekend
    IF NOT is_weekend(result_date) THEN
      working_days_added := working_days_added + 1;
    END IF;
  END LOOP;

  RETURN result_date;
END;
$function$

;

CREATE OR REPLACE FUNCTION public.calculate_material_class_level()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF NEW.parent_id IS NULL THEN
        NEW.level = 0;
    ELSE
        SELECT level + 1 INTO NEW.level
        FROM material_classes
        WHERE id = NEW.parent_id;
    END IF;
    RETURN NEW;
END;
$function$

;

CREATE OR REPLACE FUNCTION public.calculate_preliminary_delivery_date(delivery_days integer, delivery_type character varying)
 RETURNS date
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
DECLARE
  today DATE := CURRENT_DATE;
  next_working_day DATE;
BEGIN
  -- If no delivery days specified, return NULL
  IF delivery_days IS NULL OR delivery_days <= 0 THEN
    RETURN NULL;
  END IF;

  -- Step 1: Find next working day from today
  next_working_day := today + INTERVAL '1 day';
  WHILE is_weekend(next_working_day) LOOP
    next_working_day := next_working_day + INTERVAL '1 day';
  END LOOP;

  -- Step 2: Add delivery days based on type
  IF delivery_type = 'working' THEN
    RETURN add_working_days(next_working_day, delivery_days);
  ELSE
    -- Calendar days
    RETURN next_working_day + (delivery_days || ' days')::INTERVAL;
  END IF;
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

CREATE OR REPLACE FUNCTION public.get_material_class_path(class_id bigint)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    path_text TEXT;
BEGIN
    WITH RECURSIVE class_path AS (
        SELECT id, name, parent_id, name::TEXT as path
        FROM material_classes
        WHERE id = class_id

        UNION ALL

        SELECT c.id, c.name, c.parent_id,
               p.name || ' → ' || cp.path
        FROM material_classes c
        INNER JOIN class_path cp ON c.id = cp.parent_id
        INNER JOIN material_classes p ON p.id = c.id
    )
    SELECT path INTO path_text
    FROM class_path
    WHERE parent_id IS NULL;

    RETURN COALESCE(path_text, (SELECT name FROM material_classes WHERE id = class_id));
END;
$function$

;

CREATE OR REPLACE FUNCTION public.is_weekend(check_date date)
 RETURNS boolean
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
BEGIN
  -- 0 = Sunday, 6 = Saturday
  RETURN EXTRACT(DOW FROM check_date) IN (0, 6);
END;
$function$

;

CREATE OR REPLACE FUNCTION public.log_approval_actions()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    payment_entity_id uuid;
    user_id_value uuid;
BEGIN
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        -- Получаем payment_id из payment_approvals
        SELECT payment_id INTO payment_entity_id
        FROM payment_approvals
        WHERE id = NEW.payment_approval_id;

        user_id_value := COALESCE(NEW.acted_by, (
            SELECT created_by FROM payments WHERE id = payment_entity_id
        ));

        -- Логируем действие согласования
        INSERT INTO public.audit_log (entity_type, entity_id, action, user_id, metadata)
        VALUES ('payment', payment_entity_id, 'approval_action', user_id_value,
                jsonb_build_object(
                    'approval_action', NEW.action,
                    'stage_id', NEW.stage_id,
                    'comment', NEW.comment,
                    'acted_at', NEW.acted_at
                ));

        RETURN NEW;
    END IF;

    RETURN NULL;
END;
$function$

;

CREATE OR REPLACE FUNCTION public.log_attachment_changes()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    current_user_id uuid;
    entity_type_name text;
    entity_id_value uuid;
    file_info jsonb;
BEGIN
    -- Определяем тип сущности и ID на основе таблицы и операции
    IF TG_TABLE_NAME = 'invoice_attachments' THEN
        entity_type_name := 'invoice';
        IF TG_OP = 'DELETE' THEN
            entity_id_value := OLD.invoice_id;
        ELSE
            entity_id_value := NEW.invoice_id;
        END IF;
    ELSIF TG_TABLE_NAME = 'payment_attachments' THEN
        entity_type_name := 'payment';
        IF TG_OP = 'DELETE' THEN
            entity_id_value := OLD.payment_id;
        ELSE
            entity_id_value := NEW.payment_id;
        END IF;
    ELSE
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- Получаем текущего пользователя
    current_user_id := current_setting('app.current_user_id', true)::uuid;

    IF current_user_id IS NULL THEN
        -- Пытаемся получить создателя файла из attachments
        IF TG_OP = 'DELETE' THEN
            SELECT created_by INTO current_user_id FROM attachments WHERE id = OLD.attachment_id;
        ELSE
            SELECT created_by INTO current_user_id FROM attachments WHERE id = NEW.attachment_id;
        END IF;
    END IF;

    -- Если всё ещё null, берём создателя сущности (invoice или payment)
    IF current_user_id IS NULL THEN
        IF entity_type_name = 'invoice' THEN
            SELECT user_id INTO current_user_id FROM invoices WHERE id = entity_id_value;
        ELSIF entity_type_name = 'payment' THEN
            SELECT user_id INTO current_user_id FROM payments WHERE id = entity_id_value;
        END IF;
    END IF;

    -- Если всё ещё null, пропускаем аудит (не создаём запись с null user_id)
    IF current_user_id IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    IF (TG_OP = 'INSERT') THEN
        -- Получаем информацию о файле
        SELECT jsonb_build_object(
            'file_id', a.id,
            'file_name', a.original_name,
            'file_size', a.size_bytes,
            'mime_type', a.mime_type
        ) INTO file_info
        FROM attachments a WHERE a.id = NEW.attachment_id;

        -- Логируем добавление файла
        INSERT INTO public.audit_log (entity_type, entity_id, action, user_id, metadata)
        VALUES (entity_type_name, entity_id_value, 'file_add', current_user_id, file_info);

        RETURN NEW;

    ELSIF (TG_OP = 'DELETE') THEN
        -- Пытаемся получить информацию о файле (может уже быть удалён)
        SELECT jsonb_build_object(
            'file_id', a.id,
            'file_name', a.original_name,
            'file_size', a.size_bytes
        ) INTO file_info
        FROM attachments a WHERE a.id = OLD.attachment_id;

        -- Если файл уже удалён, используем минимальную информацию
        IF file_info IS NULL THEN
            file_info := jsonb_build_object(
                'file_id', OLD.attachment_id,
                'file_name', 'Файл удалён'
            );
        END IF;

        -- Логируем удаление файла
        INSERT INTO public.audit_log (entity_type, entity_id, action, user_id, metadata)
        VALUES (entity_type_name, entity_id_value, 'file_delete', current_user_id, file_info);

        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$function$

;

CREATE OR REPLACE FUNCTION public.log_invoice_changes()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    current_user_id uuid;
BEGIN
    -- Получаем текущего пользователя (можно передавать через session variable)
    current_user_id := current_setting('app.current_user_id', true)::uuid;

    IF current_user_id IS NULL THEN
        current_user_id := NEW.user_id; -- fallback на создателя
    END IF;

    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.audit_log (entity_type, entity_id, action, user_id, metadata)
        VALUES ('invoice', NEW.id, 'create', current_user_id,
                jsonb_build_object('invoice_number', NEW.invoice_number, 'amount', NEW.amount_with_vat));
        RETURN NEW;

    ELSIF (TG_OP = 'UPDATE') THEN
        -- Логируем изменения полей

        -- Номер счета
        IF OLD.invoice_number IS DISTINCT FROM NEW.invoice_number THEN
            INSERT INTO public.audit_log (entity_type, entity_id, action, field_name, old_value, new_value, user_id)
            VALUES ('invoice', NEW.id, 'update', 'invoice_number', OLD.invoice_number, NEW.invoice_number, current_user_id);
        END IF;

        -- Дата счета
        IF OLD.invoice_date IS DISTINCT FROM NEW.invoice_date THEN
            INSERT INTO public.audit_log (entity_type, entity_id, action, field_name, old_value, new_value, user_id)
            VALUES ('invoice', NEW.id, 'update', 'invoice_date', OLD.invoice_date::text, NEW.invoice_date::text, current_user_id);
        END IF;

        -- Сумма с НДС
        IF OLD.amount_with_vat IS DISTINCT FROM NEW.amount_with_vat THEN
            INSERT INTO public.audit_log (entity_type, entity_id, action, field_name, old_value, new_value, user_id)
            VALUES ('invoice', NEW.id, 'update', 'amount_with_vat', OLD.amount_with_vat::text, NEW.amount_with_vat::text, current_user_id);
        END IF;

        -- Ставка НДС
        IF OLD.vat_rate IS DISTINCT FROM NEW.vat_rate THEN
            INSERT INTO public.audit_log (entity_type, entity_id, action, field_name, old_value, new_value, user_id)
            VALUES ('invoice', NEW.id, 'update', 'vat_rate', OLD.vat_rate::text, NEW.vat_rate::text, current_user_id);
        END IF;

        -- Статус
        IF OLD.status_id IS DISTINCT FROM NEW.status_id THEN
            INSERT INTO public.audit_log (entity_type, entity_id, action, field_name, old_value, new_value, user_id, metadata)
            VALUES ('invoice', NEW.id, 'status_change', 'status_id', OLD.status_id::text, NEW.status_id::text, current_user_id,
                    jsonb_build_object('old_status_name', (SELECT name FROM invoice_statuses WHERE id = OLD.status_id),
                                     'new_status_name', (SELECT name FROM invoice_statuses WHERE id = NEW.status_id)));
        END IF;

        -- Плательщик
        IF OLD.payer_id IS DISTINCT FROM NEW.payer_id THEN
            INSERT INTO public.audit_log (entity_type, entity_id, action, field_name, old_value, new_value, user_id, metadata)
            VALUES ('invoice', NEW.id, 'update', 'payer_id', OLD.payer_id::text, NEW.payer_id::text, current_user_id,
                    jsonb_build_object('old_payer_name', (SELECT name FROM contractors WHERE id = OLD.payer_id),
                                     'new_payer_name', (SELECT name FROM contractors WHERE id = NEW.payer_id)));
        END IF;

        -- Поставщик
        IF OLD.supplier_id IS DISTINCT FROM NEW.supplier_id THEN
            INSERT INTO public.audit_log (entity_type, entity_id, action, field_name, old_value, new_value, user_id, metadata)
            VALUES ('invoice', NEW.id, 'update', 'supplier_id', OLD.supplier_id::text, NEW.supplier_id::text, current_user_id,
                    jsonb_build_object('old_supplier_name', (SELECT name FROM contractors WHERE id = OLD.supplier_id),
                                     'new_supplier_name', (SELECT name FROM contractors WHERE id = NEW.supplier_id)));
        END IF;

        -- Проект
        IF OLD.project_id IS DISTINCT FROM NEW.project_id THEN
            INSERT INTO public.audit_log (entity_type, entity_id, action, field_name, old_value, new_value, user_id, metadata)
            VALUES ('invoice', NEW.id, 'update', 'project_id', OLD.project_id::text, NEW.project_id::text, current_user_id,
                    jsonb_build_object('old_project_name', (SELECT name FROM projects WHERE id = OLD.project_id),
                                     'new_project_name', (SELECT name FROM projects WHERE id = NEW.project_id)));
        END IF;

        -- Договор
        IF OLD.contract_id IS DISTINCT FROM NEW.contract_id THEN
            INSERT INTO public.audit_log (entity_type, entity_id, action, field_name, old_value, new_value, user_id, metadata)
            VALUES ('invoice', NEW.id, 'update', 'contract_id', OLD.contract_id::text, NEW.contract_id::text, current_user_id,
                    jsonb_build_object('old_contract_number', (SELECT contract_number FROM contracts WHERE id = OLD.contract_id),
                                     'new_contract_number', (SELECT contract_number FROM contracts WHERE id = NEW.contract_id)));
        END IF;

        -- Ответственный менеджер
        IF OLD.responsible_id IS DISTINCT FROM NEW.responsible_id THEN
            INSERT INTO public.audit_log (entity_type, entity_id, action, field_name, old_value, new_value, user_id, metadata)
            VALUES ('invoice', NEW.id, 'update', 'responsible_id', OLD.responsible_id::text, NEW.responsible_id::text, current_user_id,
                    jsonb_build_object('old_responsible_name', (SELECT full_name FROM user_profiles WHERE id = OLD.responsible_id),
                                     'new_responsible_name', (SELECT full_name FROM user_profiles WHERE id = NEW.responsible_id)));
        END IF;

        -- Заявка на материалы
        IF OLD.material_request_id IS DISTINCT FROM NEW.material_request_id THEN
            INSERT INTO public.audit_log (entity_type, entity_id, action, field_name, old_value, new_value, user_id, metadata)
            VALUES ('invoice', NEW.id, 'update', 'material_request_id', OLD.material_request_id::text, NEW.material_request_id::text, current_user_id,
                    jsonb_build_object('old_request_number', (SELECT request_number FROM material_requests WHERE id = OLD.material_request_id),
                                     'new_request_number', (SELECT request_number FROM material_requests WHERE id = NEW.material_request_id)));
        END IF;

        -- Стоимость доставки
        IF OLD.delivery_cost IS DISTINCT FROM NEW.delivery_cost THEN
            INSERT INTO public.audit_log (entity_type, entity_id, action, field_name, old_value, new_value, user_id)
            VALUES ('invoice', NEW.id, 'update', 'delivery_cost', OLD.delivery_cost::text, NEW.delivery_cost::text, current_user_id);
        END IF;

        -- Срок поставки (дни)
        IF OLD.delivery_days IS DISTINCT FROM NEW.delivery_days THEN
            INSERT INTO public.audit_log (entity_type, entity_id, action, field_name, old_value, new_value, user_id, metadata)
            VALUES ('invoice', NEW.id, 'update', 'delivery_days', OLD.delivery_days::text, NEW.delivery_days::text, current_user_id,
                    jsonb_build_object('old_delivery_days_type', OLD.delivery_days_type,
                                     'new_delivery_days_type', NEW.delivery_days_type));
        END IF;

        -- Тип дней поставки (рабочие/календарные)
        IF OLD.delivery_days_type IS DISTINCT FROM NEW.delivery_days_type THEN
            INSERT INTO public.audit_log (entity_type, entity_id, action, field_name, old_value, new_value, user_id)
            VALUES ('invoice', NEW.id, 'update', 'delivery_days_type', OLD.delivery_days_type, NEW.delivery_days_type, current_user_id);
        END IF;

        -- Предварительная дата поставки
        IF OLD.preliminary_delivery_date IS DISTINCT FROM NEW.preliminary_delivery_date THEN
            INSERT INTO public.audit_log (entity_type, entity_id, action, field_name, old_value, new_value, user_id)
            VALUES ('invoice', NEW.id, 'update', 'preliminary_delivery_date', OLD.preliminary_delivery_date::text, NEW.preliminary_delivery_date::text, current_user_id);
        END IF;

        -- Срок оплаты
        IF OLD.due_date IS DISTINCT FROM NEW.due_date THEN
            INSERT INTO public.audit_log (entity_type, entity_id, action, field_name, old_value, new_value, user_id)
            VALUES ('invoice', NEW.id, 'update', 'due_date', OLD.due_date::text, NEW.due_date::text, current_user_id);
        END IF;

        -- Описание
        IF OLD.description IS DISTINCT FROM NEW.description THEN
            INSERT INTO public.audit_log (entity_type, entity_id, action, field_name, old_value, new_value, user_id)
            VALUES ('invoice', NEW.id, 'update', 'description', OLD.description, NEW.description, current_user_id);
        END IF;

        -- Архивирование
        IF OLD.is_archived IS DISTINCT FROM NEW.is_archived THEN
            INSERT INTO public.audit_log (entity_type, entity_id, action, field_name, old_value, new_value, user_id)
            VALUES ('invoice', NEW.id, 'update', 'is_archived', OLD.is_archived::text, NEW.is_archived::text, current_user_id);
        END IF;

        RETURN NEW;

    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO public.audit_log (entity_type, entity_id, action, user_id, metadata)
        VALUES ('invoice', OLD.id, 'delete', current_user_id,
                jsonb_build_object('invoice_number', OLD.invoice_number));
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$function$

;

CREATE OR REPLACE FUNCTION public.log_payment_changes()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    current_user_id uuid;
BEGIN
    -- Получаем текущего пользователя
    current_user_id := current_setting('app.current_user_id', true)::uuid;

    IF current_user_id IS NULL THEN
        current_user_id := NEW.created_by; -- fallback на создателя
    END IF;

    IF (TG_OP = 'INSERT') THEN
        -- Логируем создание платежа
        INSERT INTO public.audit_log (entity_type, entity_id, action, user_id, metadata)
        VALUES ('payment', NEW.id, 'create', current_user_id,
                jsonb_build_object('payment_number', NEW.payment_number, 'amount', NEW.amount, 'invoice_id', NEW.invoice_id));
        RETURN NEW;

    ELSIF (TG_OP = 'UPDATE') THEN
        -- Логируем изменения полей

        IF OLD.payment_number IS DISTINCT FROM NEW.payment_number THEN
            INSERT INTO public.audit_log (entity_type, entity_id, action, field_name, old_value, new_value, user_id)
            VALUES ('payment', NEW.id, 'update', 'payment_number', OLD.payment_number::text, NEW.payment_number::text, current_user_id);
        END IF;

        IF OLD.payment_date IS DISTINCT FROM NEW.payment_date THEN
            INSERT INTO public.audit_log (entity_type, entity_id, action, field_name, old_value, new_value, user_id)
            VALUES ('payment', NEW.id, 'update', 'payment_date', OLD.payment_date::text, NEW.payment_date::text, current_user_id);
        END IF;

        IF OLD.amount IS DISTINCT FROM NEW.amount THEN
            INSERT INTO public.audit_log (entity_type, entity_id, action, field_name, old_value, new_value, user_id)
            VALUES ('payment', NEW.id, 'update', 'amount', OLD.amount::text, NEW.amount::text, current_user_id);
        END IF;

        IF OLD.status_id IS DISTINCT FROM NEW.status_id THEN
            INSERT INTO public.audit_log (entity_type, entity_id, action, field_name, old_value, new_value, user_id, metadata)
            VALUES ('payment', NEW.id, 'status_change', 'status_id', OLD.status_id::text, NEW.status_id::text, current_user_id,
                    jsonb_build_object('old_status_name', (SELECT name FROM payment_statuses WHERE id = OLD.status_id),
                                     'new_status_name', (SELECT name FROM payment_statuses WHERE id = NEW.status_id)));
        END IF;

        IF OLD.description IS DISTINCT FROM NEW.description THEN
            INSERT INTO public.audit_log (entity_type, entity_id, action, field_name, old_value, new_value, user_id)
            VALUES ('payment', NEW.id, 'update', 'description', OLD.description, NEW.description, current_user_id);
        END IF;

        IF OLD.payment_type_id IS DISTINCT FROM NEW.payment_type_id THEN
            INSERT INTO public.audit_log (entity_type, entity_id, action, field_name, old_value, new_value, user_id)
            VALUES ('payment', NEW.id, 'update', 'payment_type_id', OLD.payment_type_id::text, NEW.payment_type_id::text, current_user_id);
        END IF;

        IF OLD.is_archived IS DISTINCT FROM NEW.is_archived THEN
            INSERT INTO public.audit_log (entity_type, entity_id, action, field_name, old_value, new_value, user_id)
            VALUES ('payment', NEW.id, 'update', 'is_archived', OLD.is_archived::text, NEW.is_archived::text, current_user_id);
        END IF;

        RETURN NEW;

    ELSIF (TG_OP = 'DELETE') THEN
        -- Логируем удаление платежа
        INSERT INTO public.audit_log (entity_type, entity_id, action, user_id, metadata)
        VALUES ('payment', OLD.id, 'delete', current_user_id,
                jsonb_build_object('payment_number', OLD.payment_number));
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$function$

;

CREATE OR REPLACE FUNCTION public.recalculate_invoice_delivery_date()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Recalculate delivery date for the affected invoice
  UPDATE invoices
  SET preliminary_delivery_date = calculate_preliminary_delivery_date(
    delivery_days,
    delivery_days_type
  )
  WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id)
    AND delivery_days IS NOT NULL
    AND delivery_days > 0
    AND status_id != 3;  -- Don't update if invoice is already fully paid

  RETURN NEW;
END;
$function$

;

CREATE OR REPLACE FUNCTION public.update_material_request_items_count()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- При добавлении элемента увеличиваем счетчик
        UPDATE material_requests
        SET total_items = COALESCE(total_items, 0) + 1
        WHERE id = NEW.material_request_id;
    ELSIF TG_OP = 'DELETE' THEN
        -- При удалении элемента уменьшаем счетчик
        UPDATE material_requests
        SET total_items = GREATEST(COALESCE(total_items, 0) - 1, 0)
        WHERE id = OLD.material_request_id;
    END IF;
    RETURN NULL;
END;
$function$

;

CREATE OR REPLACE FUNCTION public.update_preliminary_delivery_dates()
 RETURNS TABLE(invoice_id uuid, old_date date, new_date date)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  UPDATE invoices i
  SET preliminary_delivery_date = calculate_preliminary_delivery_date(
    i.delivery_days,
    i.delivery_days_type
  )
  WHERE
    -- Only update invoices with delivery days specified
    i.delivery_days IS NOT NULL
    AND i.delivery_days > 0
    -- Only update if not fully paid (status_id != 3)
    -- Status IDs: 1=draft, 2=pending, 3=paid, 4=partial, 5=cancelled
    AND i.status_id != 3
    -- Only update if there are no paid payments
    AND NOT EXISTS (
      SELECT 1
      FROM invoice_payments ip
      JOIN payments p ON ip.payment_id = p.id
      WHERE ip.invoice_id = i.id
        AND p.status_id = 3  -- paid status
    )
  RETURNING
    i.id,
    i.preliminary_delivery_date AS old_date,
    calculate_preliminary_delivery_date(i.delivery_days, i.delivery_days_type) AS new_date;
END;
$function$

;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$function$

;

CREATE OR REPLACE FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer DEFAULT (1024 * 1024))
 RETURNS SETOF realtime.wal_rls
 LANGUAGE plpgsql
AS $function$
declare
-- Regclass of the table e.g. public.notes
entity_ regclass = (quote_ident(wal ->> 'schema') || '.' || quote_ident(wal ->> 'table'))::regclass;

-- I, U, D, T: insert, update ...
action realtime.action = (
    case wal ->> 'action'
        when 'I' then 'INSERT'
        when 'U' then 'UPDATE'
        when 'D' then 'DELETE'
        else 'ERROR'
    end
);

-- Is row level security enabled for the table
is_rls_enabled bool = relrowsecurity from pg_class where oid = entity_;

subscriptions realtime.subscription[] = array_agg(subs)
    from
        realtime.subscription subs
    where
        subs.entity = entity_;

-- Subscription vars
roles regrole[] = array_agg(distinct us.claims_role::text)
    from
        unnest(subscriptions) us;

working_role regrole;
claimed_role regrole;
claims jsonb;

subscription_id uuid;
subscription_has_access bool;
visible_to_subscription_ids uuid[] = '{}';

-- structured info for wal's columns
columns realtime.wal_column[];
-- previous identity values for update/delete
old_columns realtime.wal_column[];

error_record_exceeds_max_size boolean = octet_length(wal::text) > max_record_bytes;

-- Primary jsonb output for record
output jsonb;

begin
perform set_config('role', null, true);

columns =
    array_agg(
        (
            x->>'name',
            x->>'type',
            x->>'typeoid',
            realtime.cast(
                (x->'value') #>> '{}',
                coalesce(
                    (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                    (x->>'type')::regtype
                )
            ),
            (pks ->> 'name') is not null,
            true
        )::realtime.wal_column
    )
    from
        jsonb_array_elements(wal -> 'columns') x
        left join jsonb_array_elements(wal -> 'pk') pks
            on (x ->> 'name') = (pks ->> 'name');

old_columns =
    array_agg(
        (
            x->>'name',
            x->>'type',
            x->>'typeoid',
            realtime.cast(
                (x->'value') #>> '{}',
                coalesce(
                    (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                    (x->>'type')::regtype
                )
            ),
            (pks ->> 'name') is not null,
            true
        )::realtime.wal_column
    )
    from
        jsonb_array_elements(wal -> 'identity') x
        left join jsonb_array_elements(wal -> 'pk') pks
            on (x ->> 'name') = (pks ->> 'name');

for working_role in select * from unnest(roles) loop

    -- Update `is_selectable` for columns and old_columns
    columns =
        array_agg(
            (
                c.name,
                c.type_name,
                c.type_oid,
                c.value,
                c.is_pkey,
                pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
            )::realtime.wal_column
        )
        from
            unnest(columns) c;

    old_columns =
            array_agg(
                (
                    c.name,
                    c.type_name,
                    c.type_oid,
                    c.value,
                    c.is_pkey,
                    pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
                )::realtime.wal_column
            )
            from
                unnest(old_columns) c;

    if action <> 'DELETE' and count(1) = 0 from unnest(columns) c where c.is_pkey then
        return next (
            jsonb_build_object(
                'schema', wal ->> 'schema',
                'table', wal ->> 'table',
                'type', action
            ),
            is_rls_enabled,
            -- subscriptions is already filtered by entity
            (select array_agg(s.subscription_id) from unnest(subscriptions) as s where claims_role = working_role),
            array['Error 400: Bad Request, no primary key']
        )::realtime.wal_rls;

    -- The claims role does not have SELECT permission to the primary key of entity
    elsif action <> 'DELETE' and sum(c.is_selectable::int) <> count(1) from unnest(columns) c where c.is_pkey then
        return next (
            jsonb_build_object(
                'schema', wal ->> 'schema',
                'table', wal ->> 'table',
                'type', action
            ),
            is_rls_enabled,
            (select array_agg(s.subscription_id) from unnest(subscriptions) as s where claims_role = working_role),
            array['Error 401: Unauthorized']
        )::realtime.wal_rls;

    else
        output = jsonb_build_object(
            'schema', wal ->> 'schema',
            'table', wal ->> 'table',
            'type', action,
            'commit_timestamp', to_char(
                ((wal ->> 'timestamp')::timestamptz at time zone 'utc'),
                'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
            ),
            'columns', (
                select
                    jsonb_agg(
                        jsonb_build_object(
                            'name', pa.attname,
                            'type', pt.typname
                        )
                        order by pa.attnum asc
                    )
                from
                    pg_attribute pa
                    join pg_type pt
                        on pa.atttypid = pt.oid
                where
                    attrelid = entity_
                    and attnum > 0
                    and pg_catalog.has_column_privilege(working_role, entity_, pa.attname, 'SELECT')
            )
        )
        -- Add "record" key for insert and update
        || case
            when action in ('INSERT', 'UPDATE') then
                jsonb_build_object(
                    'record',
                    (
                        select
                            jsonb_object_agg(
                                -- if unchanged toast, get column name and value from old record
                                coalesce((c).name, (oc).name),
                                case
                                    when (c).name is null then (oc).value
                                    else (c).value
                                end
                            )
                        from
                            unnest(columns) c
                            full outer join unnest(old_columns) oc
                                on (c).name = (oc).name
                        where
                            coalesce((c).is_selectable, (oc).is_selectable)
                            and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                    )
                )
            else '{}'::jsonb
        end
        -- Add "old_record" key for update and delete
        || case
            when action = 'UPDATE' then
                jsonb_build_object(
                        'old_record',
                        (
                            select jsonb_object_agg((c).name, (c).value)
                            from unnest(old_columns) c
                            where
                                (c).is_selectable
                                and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                        )
                    )
            when action = 'DELETE' then
                jsonb_build_object(
                    'old_record',
                    (
                        select jsonb_object_agg((c).name, (c).value)
                        from unnest(old_columns) c
                        where
                            (c).is_selectable
                            and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                            and ( not is_rls_enabled or (c).is_pkey ) -- if RLS enabled, we can't secure deletes so filter to pkey
                    )
                )
            else '{}'::jsonb
        end;

        -- Create the prepared statement
        if is_rls_enabled and action <> 'DELETE' then
            if (select 1 from pg_prepared_statements where name = 'walrus_rls_stmt' limit 1) > 0 then
                deallocate walrus_rls_stmt;
            end if;
            execute realtime.build_prepared_statement_sql('walrus_rls_stmt', entity_, columns);
        end if;

        visible_to_subscription_ids = '{}';

        for subscription_id, claims in (
                select
                    subs.subscription_id,
                    subs.claims
                from
                    unnest(subscriptions) subs
                where
                    subs.entity = entity_
                    and subs.claims_role = working_role
                    and (
                        realtime.is_visible_through_filters(columns, subs.filters)
                        or (
                          action = 'DELETE'
                          and realtime.is_visible_through_filters(old_columns, subs.filters)
                        )
                    )
        ) loop

            if not is_rls_enabled or action = 'DELETE' then
                visible_to_subscription_ids = visible_to_subscription_ids || subscription_id;
            else
                -- Check if RLS allows the role to see the record
                perform
                    -- Trim leading and trailing quotes from working_role because set_config
                    -- doesn't recognize the role as valid if they are included
                    set_config('role', trim(both '"' from working_role::text), true),
                    set_config('request.jwt.claims', claims::text, true);

                execute 'execute walrus_rls_stmt' into subscription_has_access;

                if subscription_has_access then
                    visible_to_subscription_ids = visible_to_subscription_ids || subscription_id;
                end if;
            end if;
        end loop;

        perform set_config('role', null, true);

        return next (
            output,
            is_rls_enabled,
            visible_to_subscription_ids,
            case
                when error_record_exceeds_max_size then array['Error 413: Payload Too Large']
                else '{}'
            end
        )::realtime.wal_rls;

    end if;
end loop;

perform set_config('role', null, true);
end;
$function$

;

CREATE OR REPLACE FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text DEFAULT 'ROW'::text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    -- Declare a variable to hold the JSONB representation of the row
    row_data jsonb := '{}'::jsonb;
BEGIN
    IF level = 'STATEMENT' THEN
        RAISE EXCEPTION 'function can only be triggered for each row, not for each statement';
    END IF;
    -- Check the operation type and handle accordingly
    IF operation = 'INSERT' OR operation = 'UPDATE' OR operation = 'DELETE' THEN
        row_data := jsonb_build_object('old_record', OLD, 'record', NEW, 'operation', operation, 'table', table_name, 'schema', table_schema);
        PERFORM realtime.send (row_data, event_name, topic_name);
    ELSE
        RAISE EXCEPTION 'Unexpected operation type: %', operation;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to process the row: %', SQLERRM;
END;

$function$

;

CREATE OR REPLACE FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[])
 RETURNS text
 LANGUAGE sql
AS $function$
      /*
      Builds a sql string that, if executed, creates a prepared statement to
      tests retrive a row from *entity* by its primary key columns.
      Example
          select realtime.build_prepared_statement_sql('public.notes', '{"id"}'::text[], '{"bigint"}'::text[])
      */
          select
      'prepare ' || prepared_statement_name || ' as
          select
              exists(
                  select
                      1
                  from
                      ' || entity || '
                  where
                      ' || string_agg(quote_ident(pkc.name) || '=' || quote_nullable(pkc.value #>> '{}') , ' and ') || '
              )'
          from
              unnest(columns) pkc
          where
              pkc.is_pkey
          group by
              entity
      $function$

;

CREATE OR REPLACE FUNCTION realtime."cast"(val text, type_ regtype)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
    declare
      res jsonb;
    begin
      execute format('select to_jsonb(%L::'|| type_::text || ')', val)  into res;
      return res;
    end
    $function$

;

CREATE OR REPLACE FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text)
 RETURNS boolean
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
      /*
      Casts *val_1* and *val_2* as type *type_* and check the *op* condition for truthiness
      */
      declare
          op_symbol text = (
              case
                  when op = 'eq' then '='
                  when op = 'neq' then '!='
                  when op = 'lt' then '<'
                  when op = 'lte' then '<='
                  when op = 'gt' then '>'
                  when op = 'gte' then '>='
                  when op = 'in' then '= any'
                  else 'UNKNOWN OP'
              end
          );
          res boolean;
      begin
          execute format(
              'select %L::'|| type_::text || ' ' || op_symbol
              || ' ( %L::'
              || (
                  case
                      when op = 'in' then type_::text || '[]'
                      else type_::text end
              )
              || ')', val_1, val_2) into res;
          return res;
      end;
      $function$

;

CREATE OR REPLACE FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[])
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
AS $function$
    /*
    Should the record be visible (true) or filtered out (false) after *filters* are applied
    */
        select
            -- Default to allowed when no filters present
            $2 is null -- no filters. this should not happen because subscriptions has a default
            or array_length($2, 1) is null -- array length of an empty array is null
            or bool_and(
                coalesce(
                    realtime.check_equality_op(
                        op:=f.op,
                        type_:=coalesce(
                            col.type_oid::regtype, -- null when wal2json version <= 2.4
                            col.type_name::regtype
                        ),
                        -- cast jsonb to text
                        val_1:=col.value #>> '{}',
                        val_2:=f.value
                    ),
                    false -- if null, filter does not match
                )
            )
        from
            unnest(filters) f
            join unnest(columns) col
                on f.column_name = col.name;
    $function$

;

CREATE OR REPLACE FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer)
 RETURNS SETOF realtime.wal_rls
 LANGUAGE sql
 SET log_min_messages TO 'fatal'
AS $function$
      with pub as (
        select
          concat_ws(
            ',',
            case when bool_or(pubinsert) then 'insert' else null end,
            case when bool_or(pubupdate) then 'update' else null end,
            case when bool_or(pubdelete) then 'delete' else null end
          ) as w2j_actions,
          coalesce(
            string_agg(
              realtime.quote_wal2json(format('%I.%I', schemaname, tablename)::regclass),
              ','
            ) filter (where ppt.tablename is not null and ppt.tablename not like '% %'),
            ''
          ) w2j_add_tables
        from
          pg_publication pp
          left join pg_publication_tables ppt
            on pp.pubname = ppt.pubname
        where
          pp.pubname = publication
        group by
          pp.pubname
        limit 1
      ),
      w2j as (
        select
          x.*, pub.w2j_add_tables
        from
          pub,
          pg_logical_slot_get_changes(
            slot_name, null, max_changes,
            'include-pk', 'true',
            'include-transaction', 'false',
            'include-timestamp', 'true',
            'include-type-oids', 'true',
            'format-version', '2',
            'actions', pub.w2j_actions,
            'add-tables', pub.w2j_add_tables
          ) x
      )
      select
        xyz.wal,
        xyz.is_rls_enabled,
        xyz.subscription_ids,
        xyz.errors
      from
        w2j,
        realtime.apply_rls(
          wal := w2j.data::jsonb,
          max_record_bytes := max_record_bytes
        ) xyz(wal, is_rls_enabled, subscription_ids, errors)
      where
        w2j.w2j_add_tables <> ''
        and xyz.subscription_ids[1] is not null
    $function$

;

CREATE OR REPLACE FUNCTION realtime.quote_wal2json(entity regclass)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE STRICT
AS $function$
      select
        (
          select string_agg('' || ch,'')
          from unnest(string_to_array(nsp.nspname::text, null)) with ordinality x(ch, idx)
          where
            not (x.idx = 1 and x.ch = '"')
            and not (
              x.idx = array_length(string_to_array(nsp.nspname::text, null), 1)
              and x.ch = '"'
            )
        )
        || '.'
        || (
          select string_agg('' || ch,'')
          from unnest(string_to_array(pc.relname::text, null)) with ordinality x(ch, idx)
          where
            not (x.idx = 1 and x.ch = '"')
            and not (
              x.idx = array_length(string_to_array(nsp.nspname::text, null), 1)
              and x.ch = '"'
            )
          )
      from
        pg_class pc
        join pg_namespace nsp
          on pc.relnamespace = nsp.oid
      where
        pc.oid = entity
    $function$

;

CREATE OR REPLACE FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean DEFAULT true)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  BEGIN
    -- Set the topic configuration
    EXECUTE format('SET LOCAL realtime.topic TO %L', topic);

    -- Attempt to insert the message
    INSERT INTO realtime.messages (payload, event, topic, private, extension)
    VALUES (payload, event, topic, private, 'broadcast');
  EXCEPTION
    WHEN OTHERS THEN
      -- Capture and notify the error
      PERFORM pg_notify(
          'realtime:system',
          jsonb_build_object(
              'error', SQLERRM,
              'function', 'realtime.send',
              'event', event,
              'topic', topic,
              'private', private
          )::text
      );
  END;
END;
$function$

;

CREATE OR REPLACE FUNCTION realtime.subscription_check_filters()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
    /*
    Validates that the user defined filters for a subscription:
    - refer to valid columns that the claimed role may access
    - values are coercable to the correct column type
    */
    declare
        col_names text[] = coalesce(
                array_agg(c.column_name order by c.ordinal_position),
                '{}'::text[]
            )
            from
                information_schema.columns c
            where
                format('%I.%I', c.table_schema, c.table_name)::regclass = new.entity
                and pg_catalog.has_column_privilege(
                    (new.claims ->> 'role'),
                    format('%I.%I', c.table_schema, c.table_name)::regclass,
                    c.column_name,
                    'SELECT'
                );
        filter realtime.user_defined_filter;
        col_type regtype;

        in_val jsonb;
    begin
        for filter in select * from unnest(new.filters) loop
            -- Filtered column is valid
            if not filter.column_name = any(col_names) then
                raise exception 'invalid column for filter %', filter.column_name;
            end if;

            -- Type is sanitized and safe for string interpolation
            col_type = (
                select atttypid::regtype
                from pg_catalog.pg_attribute
                where attrelid = new.entity
                      and attname = filter.column_name
            );
            if col_type is null then
                raise exception 'failed to lookup type for column %', filter.column_name;
            end if;

            -- Set maximum number of entries for in filter
            if filter.op = 'in'::realtime.equality_op then
                in_val = realtime.cast(filter.value, (col_type::text || '[]')::regtype);
                if coalesce(jsonb_array_length(in_val), 0) > 100 then
                    raise exception 'too many values for `in` filter. Maximum 100';
                end if;
            else
                -- raises an exception if value is not coercable to type
                perform realtime.cast(filter.value, col_type);
            end if;

        end loop;

        -- Apply consistent order to filters so the unique constraint on
        -- (subscription_id, entity, filters) can't be tricked by a different filter order
        new.filters = coalesce(
            array_agg(f order by f.column_name, f.op, f.value),
            '{}'
        ) from unnest(new.filters) f;

        return new;
    end;
    $function$

;

CREATE OR REPLACE FUNCTION realtime.to_regrole(role_name text)
 RETURNS regrole
 LANGUAGE sql
 IMMUTABLE
AS $function$ select role_name::regrole $function$

;

CREATE OR REPLACE FUNCTION realtime.topic()
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
select nullif(current_setting('realtime.topic', true), '')::text;
$function$

;

CREATE OR REPLACE FUNCTION storage.add_prefixes(_bucket_id text, _name text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    prefixes text[];
BEGIN
    prefixes := "storage"."get_prefixes"("_name");

    IF array_length(prefixes, 1) > 0 THEN
        INSERT INTO storage.prefixes (name, bucket_id)
        SELECT UNNEST(prefixes) as name, "_bucket_id" ON CONFLICT DO NOTHING;
    END IF;
END;
$function$

;

CREATE OR REPLACE FUNCTION storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  INSERT INTO "storage"."objects" ("bucket_id", "name", "owner", "metadata") VALUES (bucketid, name, owner, metadata);
  -- hack to rollback the successful insert
  RAISE sqlstate 'PT200' using
  message = 'ROLLBACK',
  detail = 'rollback successful insert';
END
$function$

;

CREATE OR REPLACE FUNCTION storage.delete_prefix(_bucket_id text, _name text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    -- Check if we can delete the prefix
    IF EXISTS(
        SELECT FROM "storage"."prefixes"
        WHERE "prefixes"."bucket_id" = "_bucket_id"
          AND level = "storage"."get_level"("_name") + 1
          AND "prefixes"."name" COLLATE "C" LIKE "_name" || '/%'
        LIMIT 1
    )
    OR EXISTS(
        SELECT FROM "storage"."objects"
        WHERE "objects"."bucket_id" = "_bucket_id"
          AND "storage"."get_level"("objects"."name") = "storage"."get_level"("_name") + 1
          AND "objects"."name" COLLATE "C" LIKE "_name" || '/%'
        LIMIT 1
    ) THEN
    -- There are sub-objects, skip deletion
    RETURN false;
    ELSE
        DELETE FROM "storage"."prefixes"
        WHERE "prefixes"."bucket_id" = "_bucket_id"
          AND level = "storage"."get_level"("_name")
          AND "prefixes"."name" = "_name";
        RETURN true;
    END IF;
END;
$function$

;

CREATE OR REPLACE FUNCTION storage.delete_prefix_hierarchy_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    prefix text;
BEGIN
    prefix := "storage"."get_prefix"(OLD."name");

    IF coalesce(prefix, '') != '' THEN
        PERFORM "storage"."delete_prefix"(OLD."bucket_id", prefix);
    END IF;

    RETURN OLD;
END;
$function$

;

CREATE OR REPLACE FUNCTION storage.enforce_bucket_name_length()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
    if length(new.name) > 100 then
        raise exception 'bucket name "%" is too long (% characters). Max is 100.', new.name, length(new.name);
    end if;
    return new;
end;
$function$

;

CREATE OR REPLACE FUNCTION storage.extension(name text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
DECLARE
    _parts text[];
    _filename text;
BEGIN
    SELECT string_to_array(name, '/') INTO _parts;
    SELECT _parts[array_length(_parts,1)] INTO _filename;
    RETURN reverse(split_part(reverse(_filename), '.', 1));
END
$function$

;

CREATE OR REPLACE FUNCTION storage.filename(name text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
_parts text[];
BEGIN
	select string_to_array(name, '/') into _parts;
	return _parts[array_length(_parts,1)];
END
$function$

;

CREATE OR REPLACE FUNCTION storage.foldername(name text)
 RETURNS text[]
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
DECLARE
    _parts text[];
BEGIN
    -- Split on "/" to get path segments
    SELECT string_to_array(name, '/') INTO _parts;
    -- Return everything except the last segment
    RETURN _parts[1 : array_length(_parts,1) - 1];
END
$function$

;

CREATE OR REPLACE FUNCTION storage.get_level(name text)
 RETURNS integer
 LANGUAGE sql
 IMMUTABLE STRICT
AS $function$
SELECT array_length(string_to_array("name", '/'), 1);
$function$

;

CREATE OR REPLACE FUNCTION storage.get_prefix(name text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE STRICT
AS $function$
SELECT
    CASE WHEN strpos("name", '/') > 0 THEN
             regexp_replace("name", '[\/]{1}[^\/]+\/?$', '')
         ELSE
             ''
        END;
$function$

;

CREATE OR REPLACE FUNCTION storage.get_prefixes(name text)
 RETURNS text[]
 LANGUAGE plpgsql
 IMMUTABLE STRICT
AS $function$
DECLARE
    parts text[];
    prefixes text[];
    prefix text;
BEGIN
    -- Split the name into parts by '/'
    parts := string_to_array("name", '/');
    prefixes := '{}';

    -- Construct the prefixes, stopping one level below the last part
    FOR i IN 1..array_length(parts, 1) - 1 LOOP
            prefix := array_to_string(parts[1:i], '/');
            prefixes := array_append(prefixes, prefix);
    END LOOP;

    RETURN prefixes;
END;
$function$

;

CREATE OR REPLACE FUNCTION storage.get_size_by_bucket()
 RETURNS TABLE(size bigint, bucket_id text)
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
    return query
        select sum((metadata->>'size')::bigint) as size, obj.bucket_id
        from "storage".objects as obj
        group by obj.bucket_id;
END
$function$

;

CREATE OR REPLACE FUNCTION storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, next_key_token text DEFAULT ''::text, next_upload_token text DEFAULT ''::text)
 RETURNS TABLE(key text, id text, created_at timestamp with time zone)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(key COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                        substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1)))
                    ELSE
                        key
                END AS key, id, created_at
            FROM
                storage.s3_multipart_uploads
            WHERE
                bucket_id = $5 AND
                key ILIKE $1 || ''%'' AND
                CASE
                    WHEN $4 != '''' AND $6 = '''' THEN
                        CASE
                            WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                                substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                key COLLATE "C" > $4
                            END
                    ELSE
                        true
                END AND
                CASE
                    WHEN $6 != '''' THEN
                        id COLLATE "C" > $6
                    ELSE
                        true
                    END
            ORDER BY
                key COLLATE "C" ASC, created_at ASC) as e order by key COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_key_token, bucket_id, next_upload_token;
END;
$function$

;

CREATE OR REPLACE FUNCTION storage.list_objects_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, start_after text DEFAULT ''::text, next_token text DEFAULT ''::text)
 RETURNS TABLE(name text, id uuid, metadata jsonb, updated_at timestamp with time zone)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(name COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(name from length($1) + 1)) > 0 THEN
                        substring(name from 1 for length($1) + position($2 IN substring(name from length($1) + 1)))
                    ELSE
                        name
                END AS name, id, metadata, updated_at
            FROM
                storage.objects
            WHERE
                bucket_id = $5 AND
                name ILIKE $1 || ''%'' AND
                CASE
                    WHEN $6 != '''' THEN
                    name COLLATE "C" > $6
                ELSE true END
                AND CASE
                    WHEN $4 != '''' THEN
                        CASE
                            WHEN position($2 IN substring(name from length($1) + 1)) > 0 THEN
                                substring(name from 1 for length($1) + position($2 IN substring(name from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                name COLLATE "C" > $4
                            END
                    ELSE
                        true
                END
            ORDER BY
                name COLLATE "C" ASC) as e order by name COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_token, bucket_id, start_after;
END;
$function$

;

CREATE OR REPLACE FUNCTION storage.objects_insert_prefix_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    NEW.level := "storage"."get_level"(NEW."name");

    RETURN NEW;
END;
$function$

;

CREATE OR REPLACE FUNCTION storage.objects_update_prefix_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    old_prefixes TEXT[];
BEGIN
    -- Ensure this is an update operation and the name has changed
    IF TG_OP = 'UPDATE' AND (NEW."name" <> OLD."name" OR NEW."bucket_id" <> OLD."bucket_id") THEN
        -- Retrieve old prefixes
        old_prefixes := "storage"."get_prefixes"(OLD."name");

        -- Remove old prefixes that are only used by this object
        WITH all_prefixes as (
            SELECT unnest(old_prefixes) as prefix
        ),
        can_delete_prefixes as (
             SELECT prefix
             FROM all_prefixes
             WHERE NOT EXISTS (
                 SELECT 1 FROM "storage"."objects"
                 WHERE "bucket_id" = OLD."bucket_id"
                   AND "name" <> OLD."name"
                   AND "name" LIKE (prefix || '%')
             )
         )
        DELETE FROM "storage"."prefixes" WHERE name IN (SELECT prefix FROM can_delete_prefixes);

        -- Add new prefixes
        PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    END IF;
    -- Set the new level
    NEW."level" := "storage"."get_level"(NEW."name");

    RETURN NEW;
END;
$function$

;

CREATE OR REPLACE FUNCTION storage.operation()
 RETURNS text
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
    RETURN current_setting('storage.operation', true);
END;
$function$

;

CREATE OR REPLACE FUNCTION storage.prefixes_insert_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    RETURN NEW;
END;
$function$

;

CREATE OR REPLACE FUNCTION storage.search(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text)
 RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
 LANGUAGE plpgsql
AS $function$
declare
    can_bypass_rls BOOLEAN;
begin
    SELECT rolbypassrls
    INTO can_bypass_rls
    FROM pg_roles
    WHERE rolname = coalesce(nullif(current_setting('role', true), 'none'), current_user);

    IF can_bypass_rls THEN
        RETURN QUERY SELECT * FROM storage.search_v1_optimised(prefix, bucketname, limits, levels, offsets, search, sortcolumn, sortorder);
    ELSE
        RETURN QUERY SELECT * FROM storage.search_legacy_v1(prefix, bucketname, limits, levels, offsets, search, sortcolumn, sortorder);
    END IF;
end;
$function$

;

CREATE OR REPLACE FUNCTION storage.search_legacy_v1(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text)
 RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
    v_order_by text;
    v_sort_order text;
begin
    case
        when sortcolumn = 'name' then
            v_order_by = 'name';
        when sortcolumn = 'updated_at' then
            v_order_by = 'updated_at';
        when sortcolumn = 'created_at' then
            v_order_by = 'created_at';
        when sortcolumn = 'last_accessed_at' then
            v_order_by = 'last_accessed_at';
        else
            v_order_by = 'name';
        end case;

    case
        when sortorder = 'asc' then
            v_sort_order = 'asc';
        when sortorder = 'desc' then
            v_sort_order = 'desc';
        else
            v_sort_order = 'asc';
        end case;

    v_order_by = v_order_by || ' ' || v_sort_order;

    return query execute
        'with folders as (
           select path_tokens[$1] as folder
           from storage.objects
             where objects.name ilike $2 || $3 || ''%''
               and bucket_id = $4
               and array_length(objects.path_tokens, 1) <> $1
           group by folder
           order by folder ' || v_sort_order || '
     )
     (select folder as "name",
            null as id,
            null as updated_at,
            null as created_at,
            null as last_accessed_at,
            null as metadata from folders)
     union all
     (select path_tokens[$1] as "name",
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
     from storage.objects
     where objects.name ilike $2 || $3 || ''%''
       and bucket_id = $4
       and array_length(objects.path_tokens, 1) = $1
     order by ' || v_order_by || ')
     limit $5
     offset $6' using levels, prefix, search, bucketname, limits, offsets;
end;
$function$

;

CREATE OR REPLACE FUNCTION storage.search_v1_optimised(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text)
 RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
    v_order_by text;
    v_sort_order text;
begin
    case
        when sortcolumn = 'name' then
            v_order_by = 'name';
        when sortcolumn = 'updated_at' then
            v_order_by = 'updated_at';
        when sortcolumn = 'created_at' then
            v_order_by = 'created_at';
        when sortcolumn = 'last_accessed_at' then
            v_order_by = 'last_accessed_at';
        else
            v_order_by = 'name';
        end case;

    case
        when sortorder = 'asc' then
            v_sort_order = 'asc';
        when sortorder = 'desc' then
            v_sort_order = 'desc';
        else
            v_sort_order = 'asc';
        end case;

    v_order_by = v_order_by || ' ' || v_sort_order;

    return query execute
        'with folders as (
           select (string_to_array(name, ''/''))[level] as name
           from storage.prefixes
             where lower(prefixes.name) like lower($2 || $3) || ''%''
               and bucket_id = $4
               and level = $1
           order by name ' || v_sort_order || '
     )
     (select name,
            null as id,
            null as updated_at,
            null as created_at,
            null as last_accessed_at,
            null as metadata from folders)
     union all
     (select path_tokens[level] as "name",
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
     from storage.objects
     where lower(objects.name) like lower($2 || $3) || ''%''
       and bucket_id = $4
       and level = $1
     order by ' || v_order_by || ')
     limit $5
     offset $6' using levels, prefix, search, bucketname, limits, offsets;
end;
$function$

;

CREATE OR REPLACE FUNCTION storage.search_v2(prefix text, bucket_name text, limits integer DEFAULT 100, levels integer DEFAULT 1, start_after text DEFAULT ''::text)
 RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, metadata jsonb)
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
    RETURN query EXECUTE
        $sql$
        SELECT * FROM (
            (
                SELECT
                    split_part(name, '/', $4) AS key,
                    name || '/' AS name,
                    NULL::uuid AS id,
                    NULL::timestamptz AS updated_at,
                    NULL::timestamptz AS created_at,
                    NULL::jsonb AS metadata
                FROM storage.prefixes
                WHERE name COLLATE "C" LIKE $1 || '%'
                AND bucket_id = $2
                AND level = $4
                AND name COLLATE "C" > $5
                ORDER BY prefixes.name COLLATE "C" LIMIT $3
            )
            UNION ALL
            (SELECT split_part(name, '/', $4) AS key,
                name,
                id,
                updated_at,
                created_at,
                metadata
            FROM storage.objects
            WHERE name COLLATE "C" LIKE $1 || '%'
                AND bucket_id = $2
                AND level = $4
                AND name COLLATE "C" > $5
            ORDER BY name COLLATE "C" LIMIT $3)
        ) obj
        ORDER BY name COLLATE "C" LIMIT $3;
        $sql$
        USING prefix, bucket_name, limits, levels, start_after;
END;
$function$

;

CREATE OR REPLACE FUNCTION storage.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$function$

;

CREATE OR REPLACE FUNCTION supabase_functions.http_request()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'supabase_functions'
AS $function$
    DECLARE
      request_id bigint;
      payload jsonb;
      url text := TG_ARGV[0]::text;
      method text := TG_ARGV[1]::text;
      headers jsonb DEFAULT '{}'::jsonb;
      params jsonb DEFAULT '{}'::jsonb;
      timeout_ms integer DEFAULT 1000;
    BEGIN
      IF url IS NULL OR url = 'null' THEN
        RAISE EXCEPTION 'url argument is missing';
      END IF;

      IF method IS NULL OR method = 'null' THEN
        RAISE EXCEPTION 'method argument is missing';
      END IF;

      IF TG_ARGV[2] IS NULL OR TG_ARGV[2] = 'null' THEN
        headers = '{"Content-Type": "application/json"}'::jsonb;
      ELSE
        headers = TG_ARGV[2]::jsonb;
      END IF;

      IF TG_ARGV[3] IS NULL OR TG_ARGV[3] = 'null' THEN
        params = '{}'::jsonb;
      ELSE
        params = TG_ARGV[3]::jsonb;
      END IF;

      IF TG_ARGV[4] IS NULL OR TG_ARGV[4] = 'null' THEN
        timeout_ms = 1000;
      ELSE
        timeout_ms = TG_ARGV[4]::integer;
      END IF;

      CASE
        WHEN method = 'GET' THEN
          SELECT http_get INTO request_id FROM net.http_get(
            url,
            params,
            headers,
            timeout_ms
          );
        WHEN method = 'POST' THEN
          payload = jsonb_build_object(
            'old_record', OLD,
            'record', NEW,
            'type', TG_OP,
            'table', TG_TABLE_NAME,
            'schema', TG_TABLE_SCHEMA
          );

          SELECT http_post INTO request_id FROM net.http_post(
            url,
            payload,
            params,
            headers,
            timeout_ms
          );
        ELSE
          RAISE EXCEPTION 'method argument % is invalid', method;
      END CASE;

      INSERT INTO supabase_functions.hooks
        (hook_table_id, hook_name, request_id)
      VALUES
        (TG_RELID, TG_NAME, request_id);

      RETURN NEW;
    END
  $function$

;

CREATE OR REPLACE FUNCTION vault._crypto_aead_det_decrypt(message bytea, additional bytea, key_id bigint, context bytea DEFAULT '\x7067736f6469756d'::bytea, nonce bytea DEFAULT NULL::bytea)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE
AS '$libdir/supabase_vault', $function$pgsodium_crypto_aead_det_decrypt_by_id$function$

;

CREATE OR REPLACE FUNCTION vault._crypto_aead_det_encrypt(message bytea, additional bytea, key_id bigint, context bytea DEFAULT '\x7067736f6469756d'::bytea, nonce bytea DEFAULT NULL::bytea)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE
AS '$libdir/supabase_vault', $function$pgsodium_crypto_aead_det_encrypt_by_id$function$

;

CREATE OR REPLACE FUNCTION vault._crypto_aead_det_noncegen()
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE
AS '$libdir/supabase_vault', $function$pgsodium_crypto_aead_det_noncegen$function$

;

CREATE OR REPLACE FUNCTION vault.create_secret(new_secret text, new_name text DEFAULT NULL::text, new_description text DEFAULT ''::text, new_key_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  rec record;
BEGIN
  INSERT INTO vault.secrets (secret, name, description)
  VALUES (
    new_secret,
    new_name,
    new_description
  )
  RETURNING * INTO rec;
  UPDATE vault.secrets s
  SET secret = encode(vault._crypto_aead_det_encrypt(
    message := convert_to(rec.secret, 'utf8'),
    additional := convert_to(s.id::text, 'utf8'),
    key_id := 0,
    context := 'pgsodium'::bytea,
    nonce := rec.nonce
  ), 'base64')
  WHERE id = rec.id;
  RETURN rec.id;
END
$function$

;

CREATE OR REPLACE FUNCTION vault.update_secret(secret_id uuid, new_secret text DEFAULT NULL::text, new_name text DEFAULT NULL::text, new_description text DEFAULT NULL::text, new_key_id uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  decrypted_secret text := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE id = secret_id);
BEGIN
  UPDATE vault.secrets s
  SET
    secret = CASE WHEN new_secret IS NULL THEN s.secret
                  ELSE encode(vault._crypto_aead_det_encrypt(
                    message := convert_to(new_secret, 'utf8'),
                    additional := convert_to(s.id::text, 'utf8'),
                    key_id := 0,
                    context := 'pgsodium'::bytea,
                    nonce := s.nonce
                  ), 'base64') END,
    name = coalesce(new_name, s.name),
    description = coalesce(new_description, s.description),
    updated_at = now()
  WHERE s.id = secret_id;
END
$function$

;


-- TRIGGERS
-- ============================================

CREATE TRIGGER cron_job_cache_invalidate AFTER INSERT OR DELETE OR UPDATE OR TRUNCATE ON cron.job FOR EACH STATEMENT EXECUTE FUNCTION cron.job_cache_invalidate()
;

CREATE TRIGGER update_approval_routes_updated_at BEFORE UPDATE ON public.approval_routes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
;

CREATE TRIGGER audit_approval_steps AFTER INSERT OR UPDATE ON public.approval_steps FOR EACH ROW EXECUTE FUNCTION log_approval_actions()
;

CREATE TRIGGER update_attachments_updated_at BEFORE UPDATE ON public.attachments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
;

CREATE TRIGGER update_contract_statuses_updated_at BEFORE UPDATE ON public.contract_statuses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
;

CREATE TRIGGER update_contractors_updated_at BEFORE UPDATE ON public.contractors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
;

CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
;

CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
;

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
;

CREATE TRIGGER audit_invoice_attachments AFTER INSERT OR DELETE ON public.invoice_attachments FOR EACH ROW EXECUTE FUNCTION log_attachment_changes()
;

CREATE TRIGGER update_delivery_date_on_payment_change AFTER INSERT OR DELETE OR UPDATE ON public.invoice_payments FOR EACH ROW EXECUTE FUNCTION recalculate_invoice_delivery_date()
;

CREATE TRIGGER update_invoice_statuses_updated_at BEFORE UPDATE ON public.invoice_statuses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
;

CREATE TRIGGER update_invoice_types_updated_at BEFORE UPDATE ON public.invoice_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
;

CREATE TRIGGER audit_invoice_changes AFTER INSERT OR DELETE OR UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION log_invoice_changes()
;

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
;

CREATE TRIGGER update_letters_updated_at BEFORE UPDATE ON public.letters FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
;

CREATE TRIGGER trigger_calculate_material_class_level BEFORE INSERT OR UPDATE OF parent_id ON public.material_classes FOR EACH ROW EXECUTE FUNCTION calculate_material_class_level()
;

CREATE TRIGGER update_material_classes_updated_at BEFORE UPDATE ON public.material_classes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
;

CREATE TRIGGER update_material_nomenclature_updated_at BEFORE UPDATE ON public.material_nomenclature FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
;

CREATE TRIGGER update_material_request_items_count_trigger AFTER INSERT OR DELETE ON public.material_request_items FOR EACH ROW EXECUTE FUNCTION update_material_request_items_count()
;

CREATE TRIGGER update_material_requests_updated_at BEFORE UPDATE ON public.material_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
;

CREATE TRIGGER update_payment_approvals_updated_at BEFORE UPDATE ON public.payment_approvals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
;

CREATE TRIGGER audit_payment_attachments AFTER INSERT OR DELETE ON public.payment_attachments FOR EACH ROW EXECUTE FUNCTION log_attachment_changes()
;

CREATE TRIGGER update_payment_statuses_updated_at BEFORE UPDATE ON public.payment_statuses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
;

CREATE TRIGGER update_payment_types_updated_at BEFORE UPDATE ON public.payment_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
;

CREATE TRIGGER audit_payment_changes AFTER INSERT OR DELETE OR UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION log_payment_changes()
;

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
;

CREATE TRIGGER update_positions_updated_at BEFORE UPDATE ON public.positions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
;

CREATE TRIGGER update_project_budgets_updated_at BEFORE UPDATE ON public.project_budgets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
;

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
;

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON public.roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
;

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
;

CREATE TRIGGER update_workflow_stages_updated_at BEFORE UPDATE ON public.workflow_stages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
;

CREATE TRIGGER tr_check_filters BEFORE INSERT OR UPDATE ON realtime.subscription FOR EACH ROW EXECUTE FUNCTION realtime.subscription_check_filters()
;

CREATE TRIGGER enforce_bucket_name_length_trigger BEFORE INSERT OR UPDATE OF name ON storage.buckets FOR EACH ROW EXECUTE FUNCTION storage.enforce_bucket_name_length()
;

CREATE TRIGGER objects_delete_delete_prefix AFTER DELETE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger()
;

CREATE TRIGGER objects_insert_create_prefix BEFORE INSERT ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.objects_insert_prefix_trigger()
;

CREATE TRIGGER objects_update_create_prefix BEFORE UPDATE ON storage.objects FOR EACH ROW WHEN (((new.name <> old.name) OR (new.bucket_id <> old.bucket_id))) EXECUTE FUNCTION storage.objects_update_prefix_trigger()
;

CREATE TRIGGER update_objects_updated_at BEFORE UPDATE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.update_updated_at_column()
;

CREATE TRIGGER prefixes_create_hierarchy BEFORE INSERT ON storage.prefixes FOR EACH ROW WHEN ((pg_trigger_depth() < 1)) EXECUTE FUNCTION storage.prefixes_insert_trigger()
;

CREATE TRIGGER prefixes_delete_hierarchy AFTER DELETE ON storage.prefixes FOR EACH ROW EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger()
;


-- INDEXES
-- ============================================

CREATE INDEX extensions_tenant_external_id_index ON _realtime.extensions USING btree (tenant_external_id)
;

CREATE UNIQUE INDEX extensions_tenant_external_id_type_index ON _realtime.extensions USING btree (tenant_external_id, type)
;

CREATE UNIQUE INDEX tenants_external_id_index ON _realtime.tenants USING btree (external_id)
;

CREATE INDEX audit_logs_instance_id_idx ON auth.audit_log_entries USING btree (instance_id)
;

CREATE INDEX flow_state_created_at_idx ON auth.flow_state USING btree (created_at DESC)
;

CREATE INDEX idx_auth_code ON auth.flow_state USING btree (auth_code)
;

CREATE INDEX idx_user_id_auth_method ON auth.flow_state USING btree (user_id, authentication_method)
;

CREATE INDEX identities_email_idx ON auth.identities USING btree (email text_pattern_ops)
;

CREATE UNIQUE INDEX identities_provider_id_provider_unique ON auth.identities USING btree (provider_id, provider)
;

CREATE INDEX identities_user_id_idx ON auth.identities USING btree (user_id)
;

CREATE UNIQUE INDEX amr_id_pk ON auth.mfa_amr_claims USING btree (id)
;

CREATE INDEX mfa_challenge_created_at_idx ON auth.mfa_challenges USING btree (created_at DESC)
;

CREATE INDEX factor_id_created_at_idx ON auth.mfa_factors USING btree (user_id, created_at)
;

CREATE UNIQUE INDEX mfa_factors_last_challenged_at_key ON auth.mfa_factors USING btree (last_challenged_at)
;

CREATE UNIQUE INDEX mfa_factors_user_friendly_name_unique ON auth.mfa_factors USING btree (friendly_name, user_id) WHERE (TRIM(BOTH FROM friendly_name) <> ''::text)
;

CREATE INDEX mfa_factors_user_id_idx ON auth.mfa_factors USING btree (user_id)
;

CREATE UNIQUE INDEX unique_phone_factor_per_user ON auth.mfa_factors USING btree (user_id, phone)
;

CREATE INDEX one_time_tokens_relates_to_hash_idx ON auth.one_time_tokens USING hash (relates_to)
;

CREATE INDEX one_time_tokens_token_hash_hash_idx ON auth.one_time_tokens USING hash (token_hash)
;

CREATE UNIQUE INDEX one_time_tokens_user_id_token_type_key ON auth.one_time_tokens USING btree (user_id, token_type)
;

CREATE INDEX refresh_tokens_instance_id_idx ON auth.refresh_tokens USING btree (instance_id)
;

CREATE INDEX refresh_tokens_instance_id_user_id_idx ON auth.refresh_tokens USING btree (instance_id, user_id)
;

CREATE INDEX refresh_tokens_parent_idx ON auth.refresh_tokens USING btree (parent)
;

CREATE INDEX refresh_tokens_session_id_revoked_idx ON auth.refresh_tokens USING btree (session_id, revoked)
;

CREATE UNIQUE INDEX refresh_tokens_token_unique ON auth.refresh_tokens USING btree (token)
;

CREATE INDEX refresh_tokens_updated_at_idx ON auth.refresh_tokens USING btree (updated_at DESC)
;

CREATE UNIQUE INDEX saml_providers_entity_id_key ON auth.saml_providers USING btree (entity_id)
;

CREATE INDEX saml_providers_sso_provider_id_idx ON auth.saml_providers USING btree (sso_provider_id)
;

CREATE INDEX saml_relay_states_created_at_idx ON auth.saml_relay_states USING btree (created_at DESC)
;

CREATE INDEX saml_relay_states_for_email_idx ON auth.saml_relay_states USING btree (for_email)
;

CREATE INDEX saml_relay_states_sso_provider_id_idx ON auth.saml_relay_states USING btree (sso_provider_id)
;

CREATE INDEX sessions_not_after_idx ON auth.sessions USING btree (not_after DESC)
;

CREATE INDEX sessions_user_id_idx ON auth.sessions USING btree (user_id)
;

CREATE INDEX user_id_created_at_idx ON auth.sessions USING btree (user_id, created_at)
;

CREATE UNIQUE INDEX sso_domains_domain_idx ON auth.sso_domains USING btree (lower(domain))
;

CREATE INDEX sso_domains_sso_provider_id_idx ON auth.sso_domains USING btree (sso_provider_id)
;

CREATE UNIQUE INDEX sso_providers_resource_id_idx ON auth.sso_providers USING btree (lower(resource_id))
;

CREATE UNIQUE INDEX confirmation_token_idx ON auth.users USING btree (confirmation_token) WHERE ((confirmation_token)::text !~ '^[0-9 ]*$'::text)
;

CREATE UNIQUE INDEX email_change_token_current_idx ON auth.users USING btree (email_change_token_current) WHERE ((email_change_token_current)::text !~ '^[0-9 ]*$'::text)
;

CREATE UNIQUE INDEX email_change_token_new_idx ON auth.users USING btree (email_change_token_new) WHERE ((email_change_token_new)::text !~ '^[0-9 ]*$'::text)
;

CREATE UNIQUE INDEX reauthentication_token_idx ON auth.users USING btree (reauthentication_token) WHERE ((reauthentication_token)::text !~ '^[0-9 ]*$'::text)
;

CREATE UNIQUE INDEX recovery_token_idx ON auth.users USING btree (recovery_token) WHERE ((recovery_token)::text !~ '^[0-9 ]*$'::text)
;

CREATE UNIQUE INDEX users_email_partial_key ON auth.users USING btree (email) WHERE (is_sso_user = false)
;

CREATE INDEX users_instance_id_email_idx ON auth.users USING btree (instance_id, lower((email)::text))
;

CREATE INDEX users_instance_id_idx ON auth.users USING btree (instance_id)
;

CREATE INDEX users_is_anonymous_idx ON auth.users USING btree (is_anonymous)
;

CREATE UNIQUE INDEX users_phone_key ON auth.users USING btree (phone)
;

CREATE UNIQUE INDEX jobname_username_uniq ON cron.job USING btree (jobname, username)
;

CREATE INDEX _http_response_created_idx ON net._http_response USING btree (created)
;

CREATE INDEX idx_approval_routes_invoice_type ON public.approval_routes USING btree (invoice_type_id)
;

CREATE UNIQUE INDEX approval_steps_payment_approval_id_stage_id_key ON public.approval_steps USING btree (payment_approval_id, stage_id)
;

CREATE INDEX idx_approval_steps_acted_by ON public.approval_steps USING btree (acted_by)
;

CREATE INDEX idx_approval_steps_approval ON public.approval_steps USING btree (payment_approval_id)
;

CREATE INDEX idx_attachments_created_by ON public.attachments USING btree (created_by)
;

CREATE INDEX idx_audit_log_action ON public.audit_log USING btree (action)
;

CREATE INDEX idx_audit_log_created_at ON public.audit_log USING btree (created_at DESC)
;

CREATE INDEX idx_audit_log_entity ON public.audit_log USING btree (entity_type, entity_id)
;

CREATE INDEX idx_audit_log_user_id ON public.audit_log USING btree (user_id)
;

CREATE INDEX idx_contract_attachments_attachment_id ON public.contract_attachments USING btree (attachment_id)
;

CREATE INDEX idx_contract_attachments_contract_id ON public.contract_attachments USING btree (contract_id)
;

CREATE INDEX idx_contract_invoices_contract_id ON public.contract_invoices USING btree (contract_id)
;

CREATE INDEX idx_contract_invoices_invoice_id ON public.contract_invoices USING btree (invoice_id)
;

CREATE UNIQUE INDEX contract_projects_unique ON public.contract_projects USING btree (contract_id, project_id)
;

CREATE INDEX idx_contract_projects_contract_id ON public.contract_projects USING btree (contract_id)
;

CREATE INDEX idx_contract_projects_project_id ON public.contract_projects USING btree (project_id)
;

CREATE UNIQUE INDEX contract_statuses_code_key ON public.contract_statuses USING btree (code)
;

CREATE INDEX idx_contract_statuses_code ON public.contract_statuses USING btree (code)
;

CREATE INDEX idx_contract_statuses_sort_order ON public.contract_statuses USING btree (sort_order)
;

CREATE UNIQUE INDEX contractors_inn_key ON public.contractors USING btree (inn)
;

CREATE INDEX idx_contractors_inn ON public.contractors USING btree (inn)
;

CREATE INDEX idx_contractors_updated_at ON public.contractors USING btree (updated_at DESC)
;

CREATE INDEX idx_contracts_contract_date ON public.contracts USING btree (contract_date)
;

CREATE INDEX idx_contracts_contract_number ON public.contracts USING btree (contract_number)
;

CREATE INDEX idx_contracts_payer_id ON public.contracts USING btree (payer_id)
;

CREATE INDEX idx_contracts_project_id ON public.contracts USING btree (project_id)
;

CREATE INDEX idx_contracts_status_id ON public.contracts USING btree (status_id)
;

CREATE INDEX idx_contracts_supplier_id ON public.contracts USING btree (supplier_id)
;

CREATE INDEX idx_contracts_updated_at ON public.contracts USING btree (updated_at DESC)
;

CREATE UNIQUE INDEX departments_name_key ON public.departments USING btree (name)
;

CREATE INDEX idx_employees_department_id ON public.employees USING btree (department_id)
;

CREATE INDEX idx_employees_full_name ON public.employees USING btree (full_name)
;

CREATE INDEX idx_employees_is_active ON public.employees USING btree (is_active)
;

CREATE INDEX idx_employees_position_id ON public.employees USING btree (position_id)
;

CREATE INDEX idx_invoice_attachments_attachment_id ON public.invoice_attachments USING btree (attachment_id)
;

CREATE INDEX idx_invoice_attachments_invoice_id ON public.invoice_attachments USING btree (invoice_id)
;

CREATE INDEX idx_invoice_payments_invoice_id ON public.invoice_payments USING btree (invoice_id)
;

CREATE INDEX idx_invoice_payments_payment_id ON public.invoice_payments USING btree (payment_id)
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

CREATE INDEX idx_invoices_contract_id ON public.invoices USING btree (contract_id)
;

CREATE INDEX idx_invoices_created_at ON public.invoices USING btree (created_at DESC)
;

CREATE INDEX idx_invoices_invoice_date ON public.invoices USING btree (invoice_date)
;

CREATE INDEX idx_invoices_invoice_type_id ON public.invoices USING btree (invoice_type_id)
;

CREATE INDEX idx_invoices_is_archived ON public.invoices USING btree (is_archived)
;

CREATE INDEX idx_invoices_material_request ON public.invoices USING btree (material_request_id)
;

CREATE INDEX idx_invoices_material_request_id ON public.invoices USING btree (material_request_id)
;

CREATE INDEX idx_invoices_payer_id ON public.invoices USING btree (payer_id)
;

CREATE INDEX idx_invoices_project_id ON public.invoices USING btree (project_id)
;

CREATE INDEX idx_invoices_responsible_id ON public.invoices USING btree (responsible_id)
;

CREATE INDEX idx_invoices_status_id ON public.invoices USING btree (status_id)
;

CREATE INDEX idx_invoices_supplier_id ON public.invoices USING btree (supplier_id)
;

CREATE INDEX idx_invoices_updated_at ON public.invoices USING btree (updated_at DESC)
;

CREATE INDEX idx_invoices_user_id ON public.invoices USING btree (user_id)
;

CREATE INDEX idx_letter_attachments_attachment_id ON public.letter_attachments USING btree (attachment_id)
;

CREATE INDEX idx_letter_attachments_letter_id ON public.letter_attachments USING btree (letter_id)
;

CREATE UNIQUE INDEX letter_attachments_letter_id_attachment_id_key ON public.letter_attachments USING btree (letter_id, attachment_id)
;

CREATE INDEX idx_letter_links_child_id ON public.letter_links USING btree (child_id)
;

CREATE INDEX idx_letter_links_parent_id ON public.letter_links USING btree (parent_id)
;

CREATE UNIQUE INDEX letter_links_parent_id_child_id_key ON public.letter_links USING btree (parent_id, child_id)
;

CREATE UNIQUE INDEX letter_statuses_code_key ON public.letter_statuses USING btree (code)
;

CREATE UNIQUE INDEX letter_statuses_name_key ON public.letter_statuses USING btree (name)
;

CREATE INDEX idx_letters_created_at ON public.letters USING btree (created_at)
;

CREATE INDEX idx_letters_direction ON public.letters USING btree (direction)
;

CREATE INDEX idx_letters_letter_date ON public.letters USING btree (letter_date)
;

CREATE INDEX idx_letters_project_id ON public.letters USING btree (project_id)
;

CREATE INDEX idx_letters_reg_date ON public.letters USING btree (reg_date)
;

CREATE INDEX idx_letters_responsible_user_id ON public.letters USING btree (responsible_user_id)
;

CREATE INDEX idx_letters_status_id ON public.letters USING btree (status_id)
;

CREATE INDEX idx_material_classes_is_active ON public.material_classes USING btree (is_active)
;

CREATE INDEX idx_material_classes_level ON public.material_classes USING btree (level)
;

CREATE INDEX idx_material_classes_parent ON public.material_classes USING btree (parent_id)
;

CREATE INDEX idx_material_classes_parent_active ON public.material_classes USING btree (parent_id, is_active)
;

CREATE UNIQUE INDEX material_classes_name_parent_key ON public.material_classes USING btree (name, parent_id)
;

CREATE INDEX idx_material_nomenclature_active ON public.material_nomenclature USING btree (is_active)
;

CREATE INDEX idx_material_nomenclature_class ON public.material_nomenclature USING btree (material_class_id)
;

CREATE INDEX idx_material_nomenclature_name ON public.material_nomenclature USING btree (name)
;

CREATE INDEX idx_material_request_items_nomenclature ON public.material_request_items USING btree (nomenclature_id)
;

CREATE INDEX idx_material_request_items_request ON public.material_request_items USING btree (material_request_id)
;

CREATE INDEX idx_material_request_items_sort ON public.material_request_items USING btree (sort_order)
;

CREATE INDEX idx_material_requests_date ON public.material_requests USING btree (request_date)
;

CREATE INDEX idx_material_requests_employee ON public.material_requests USING btree (employee_id)
;

CREATE INDEX idx_material_requests_project ON public.material_requests USING btree (project_id)
;

CREATE INDEX idx_payment_approvals_payment ON public.payment_approvals USING btree (payment_id)
;

CREATE INDEX idx_payment_approvals_status ON public.payment_approvals USING btree (status_id)
;

CREATE INDEX idx_payment_attachments_attachment_id ON public.payment_attachments USING btree (attachment_id)
;

CREATE INDEX idx_payment_attachments_payment_id ON public.payment_attachments USING btree (payment_id)
;

CREATE UNIQUE INDEX payment_statuses_code_key ON public.payment_statuses USING btree (code)
;

CREATE UNIQUE INDEX payment_types_code_key ON public.payment_types USING btree (code)
;

CREATE INDEX idx_payments_created_by ON public.payments USING btree (created_by)
;

CREATE INDEX idx_payments_invoice_id ON public.payments USING btree (invoice_id)
;

CREATE INDEX idx_payments_is_archived ON public.payments USING btree (is_archived)
;

CREATE INDEX idx_payments_payment_date ON public.payments USING btree (payment_date)
;

CREATE INDEX idx_payments_status_id ON public.payments USING btree (status_id)
;

CREATE INDEX idx_payments_updated_at ON public.payments USING btree (updated_at DESC)
;

CREATE UNIQUE INDEX payments_payment_number_key ON public.payments USING btree (payment_number)
;

CREATE UNIQUE INDEX positions_name_key ON public.positions USING btree (name)
;

CREATE INDEX idx_project_budgets_created_by ON public.project_budgets USING btree (created_by)
;

CREATE INDEX idx_project_budgets_project_id ON public.project_budgets USING btree (project_id)
;

CREATE UNIQUE INDEX project_budgets_project_id_key ON public.project_budgets USING btree (project_id)
;

CREATE INDEX idx_projects_code ON public.projects USING btree (code)
;

CREATE INDEX idx_projects_is_active ON public.projects USING btree (is_active)
;

CREATE UNIQUE INDEX projects_code_key ON public.projects USING btree (code)
;

CREATE INDEX idx_roles_allowed_pages ON public.roles USING gin (allowed_pages)
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

CREATE INDEX idx_workflow_stages_is_active ON public.workflow_stages USING btree (is_active)
;

CREATE INDEX idx_workflow_stages_payment_status ON public.workflow_stages USING btree (payment_status_id)
;

CREATE INDEX idx_workflow_stages_permissions ON public.workflow_stages USING gin (permissions)
;

CREATE INDEX idx_workflow_stages_role ON public.workflow_stages USING btree (role_id)
;

CREATE INDEX idx_workflow_stages_route ON public.workflow_stages USING btree (route_id)
;

CREATE UNIQUE INDEX workflow_stages_route_id_order_index_key ON public.workflow_stages USING btree (route_id, order_index)
;

CREATE INDEX ix_realtime_subscription_entity ON realtime.subscription USING btree (entity)
;

CREATE UNIQUE INDEX pk_subscription ON realtime.subscription USING btree (id)
;

CREATE UNIQUE INDEX subscription_subscription_id_entity_filters_key ON realtime.subscription USING btree (subscription_id, entity, filters)
;

CREATE UNIQUE INDEX bname ON storage.buckets USING btree (name)
;

CREATE UNIQUE INDEX idx_iceberg_namespaces_bucket_id ON storage.iceberg_namespaces USING btree (bucket_id, name)
;

CREATE UNIQUE INDEX idx_iceberg_tables_namespace_id ON storage.iceberg_tables USING btree (namespace_id, name)
;

CREATE UNIQUE INDEX migrations_name_key ON storage.migrations USING btree (name)
;

CREATE UNIQUE INDEX bucketid_objname ON storage.objects USING btree (bucket_id, name)
;

CREATE UNIQUE INDEX idx_name_bucket_level_unique ON storage.objects USING btree (name COLLATE "C", bucket_id, level)
;

CREATE INDEX idx_objects_bucket_id_name ON storage.objects USING btree (bucket_id, name COLLATE "C")
;

CREATE INDEX idx_objects_lower_name ON storage.objects USING btree ((path_tokens[level]), lower(name) text_pattern_ops, bucket_id, level)
;

CREATE INDEX name_prefix_search ON storage.objects USING btree (name text_pattern_ops)
;

CREATE UNIQUE INDEX objects_bucket_id_level_idx ON storage.objects USING btree (bucket_id, level, name COLLATE "C")
;

CREATE INDEX idx_prefixes_lower_name ON storage.prefixes USING btree (bucket_id, level, ((string_to_array(name, '/'::text))[level]), lower(name) text_pattern_ops)
;

CREATE INDEX idx_multipart_uploads_list ON storage.s3_multipart_uploads USING btree (bucket_id, key, created_at)
;

CREATE INDEX supabase_functions_hooks_h_table_id_h_name_idx ON supabase_functions.hooks USING btree (hook_table_id, hook_name)
;

CREATE INDEX supabase_functions_hooks_request_id_idx ON supabase_functions.hooks USING btree (request_id)
;

CREATE UNIQUE INDEX secrets_name_idx ON vault.secrets USING btree (name) WHERE (name IS NOT NULL)
;
