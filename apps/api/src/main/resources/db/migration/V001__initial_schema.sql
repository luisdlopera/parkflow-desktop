-- =============================================================================
-- ParkFlow — Squashed Initial Schema
-- Replaces 38 incremental Flyway migrations (V001-V039).
-- Generated from pg_dump of the fully-migrated development database.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- SECTION 1: EXTENSIONS
-- ---------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

-- ---------------------------------------------------------------------------
-- SECTION 1.5: DATABASE ROLES
-- ---------------------------------------------------------------------------

-- RLS role: restricted, non-login role used for row-level security policies
-- The application sets the tenant context via SET app.tenant_id = '{company_id}'
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'parkflow_app') THEN
        CREATE ROLE parkflow_app NOLOGIN;
    END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- SECTION 2: TABLES
-- (PKs, UKs and FKs follow in later sections for dependency ordering)
-- ---------------------------------------------------------------------------

CREATE TABLE agreement (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    code character varying(40) NOT NULL,
    company_name character varying(200) NOT NULL,
    discount_percent numeric(5,2) DEFAULT 0 NOT NULL,
    max_hours_per_day integer DEFAULT 0 NOT NULL,
    flat_amount numeric(12,2),
    rate_id uuid,
    site character varying(80),
    site_id uuid,
    valid_from date,
    valid_to date,
    is_active boolean DEFAULT true NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_agreement_dates CHECK (((valid_to IS NULL) OR (valid_from IS NULL) OR (valid_to >= valid_from))),
    CONSTRAINT chk_agreement_discount_percent CHECK (((discount_percent >= (0)::numeric) AND (discount_percent <= (100)::numeric)))
);

CREATE TABLE api_keys (
    id uuid NOT NULL,
    company_id uuid NOT NULL,
    key_hash character varying(255) NOT NULL,
    name character varying(100) NOT NULL,
    description character varying(500),
    is_active boolean DEFAULT true NOT NULL,
    last_used_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at timestamp without time zone DEFAULT '9999-12-31 23:59:59'::timestamp without time zone NOT NULL,
    rotated_from_id uuid
);

CREATE TABLE app_user (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid,
    name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    document character varying(255),
    phone character varying(255),
    role character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    password_changed_at timestamp with time zone,
    last_access_at timestamp with time zone,
    is_active boolean DEFAULT true NOT NULL,
    require_password_change boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    is_blocked boolean DEFAULT false NOT NULL,
    failed_login_attempts integer DEFAULT 0 NOT NULL,
    can_void_tickets boolean DEFAULT false NOT NULL,
    can_reprint_tickets boolean DEFAULT false NOT NULL,
    can_close_cash boolean DEFAULT false NOT NULL,
    blocked_until timestamp with time zone
);

CREATE TABLE audit_event (
    id uuid NOT NULL,
    correlation_id character varying(100) NOT NULL,
    timestamp_utc timestamp with time zone DEFAULT (now() AT TIME ZONE 'UTC'::text) NOT NULL,
    user_id uuid,
    username character varying(150),
    role character varying(100),
    branch_id uuid,
    ip_address character varying(45),
    user_agent character varying(500),
    device character varying(100),
    module character varying(100) NOT NULL,
    action character varying(100) NOT NULL,
    entity_name character varying(100),
    entity_id character varying(100),
    status character varying(20) NOT NULL,
    old_data jsonb,
    new_data jsonb,
    modified_fields jsonb,
    reason text,
    observations text,
    execution_time_ms bigint,
    integrity_hash character varying(256) NOT NULL,
    previous_hash character varying(256)
);

CREATE TABLE auth_audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    action character varying(255) NOT NULL,
    user_id uuid,
    device_pk uuid,
    outcome character varying(255) NOT NULL,
    metadata_json jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    company_id uuid
);

CREATE TABLE auth_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    device_pk uuid NOT NULL,
    refresh_token_hash character varying(255) NOT NULL,
    refresh_jti character varying(255) NOT NULL,
    refresh_expires_at timestamp with time zone NOT NULL,
    access_expires_at timestamp with time zone NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_seen_at timestamp with time zone DEFAULT now() NOT NULL,
    revoked_at timestamp with time zone,
    company_id uuid NOT NULL,
    version bigint DEFAULT 0 NOT NULL
);

CREATE TABLE authorized_devices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    device_id character varying(255) NOT NULL,
    display_name character varying(255) NOT NULL,
    platform character varying(255) NOT NULL,
    fingerprint_hash character varying(255) NOT NULL,
    authorized boolean DEFAULT true NOT NULL,
    revoked_at timestamp with time zone,
    last_seen_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    company_id uuid
);

CREATE TABLE blacklisted_plate (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    plate character varying(20) NOT NULL,
    reason character varying(255),
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE cash_audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cash_session_id uuid,
    cash_movement_id uuid,
    action character varying(80) NOT NULL,
    actor_user_id uuid NOT NULL,
    terminal_id character varying(80),
    client_ip character varying(64),
    old_value text,
    new_value text,
    reason text,
    metadata text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE cash_closing_report (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cash_session_id uuid NOT NULL,
    generated_by_id uuid NOT NULL,
    expected_total numeric(14,2) NOT NULL,
    counted_total numeric(14,2) NOT NULL,
    difference numeric(14,2) NOT NULL,
    total_cash numeric(14,2) NOT NULL,
    total_card numeric(14,2) NOT NULL,
    total_transfer numeric(14,2) NOT NULL,
    total_other numeric(14,2) NOT NULL,
    observations text,
    generated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE cash_fe_sequence (
    site_code character varying(80) NOT NULL,
    terminal character varying(80) DEFAULT ''::character varying NOT NULL,
    last_value bigint DEFAULT 0 NOT NULL
);

CREATE TABLE cash_movement (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cash_session_id uuid NOT NULL,
    company_id uuid NOT NULL,
    movement_type character varying(40) NOT NULL,
    payment_method character varying(20) NOT NULL,
    amount numeric(14,2) NOT NULL,
    version bigint DEFAULT 0 NOT NULL,
    parking_session_id uuid,
    status character varying(20) DEFAULT 'POSTED'::character varying NOT NULL,
    terminal character varying(80),
    reason text,
    metadata text,
    external_reference character varying(120),
    idempotency_key character varying(120),
    voided_at timestamp with time zone,
    voided_by_id uuid,
    void_reason text,
    created_by_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_cash_movement_amount_nonneg CHECK ((amount >= (0)::numeric)),
    CONSTRAINT chk_cash_movement_status CHECK (((status)::text = ANY ((ARRAY['POSTED'::character varying, 'VOIDED'::character varying])::text[])))
);

CREATE TABLE cash_register (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    terminal character varying(80) NOT NULL,
    site_id uuid,
    code character varying(20),
    label character varying(120),
    name character varying(120),
    printer_id uuid,
    responsible_user_id uuid,
    active boolean DEFAULT true NOT NULL,
    version bigint DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE cash_session (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    cash_register_id uuid NOT NULL,
    operator_id uuid NOT NULL,
    status character varying(20) NOT NULL,
    version bigint DEFAULT 0 NOT NULL,
    opening_amount numeric(14,2) DEFAULT 0 NOT NULL,
    opened_at timestamp with time zone DEFAULT now() NOT NULL,
    closed_at timestamp with time zone,
    closed_by_id uuid,
    expected_amount numeric(14,2),
    counted_amount numeric(14,2),
    difference_amount numeric(14,2),
    count_cash numeric(14,2),
    count_card numeric(14,2),
    count_transfer numeric(14,2),
    count_other numeric(14,2),
    notes text,
    closing_notes text,
    closing_witness_name character varying(200),
    support_document_number character varying(120),
    counted_at timestamp with time zone,
    count_operator_id uuid,
    open_idempotency_key character varying(120),
    close_idempotency_key character varying(120),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_cash_session_opening_amount_nonneg CHECK ((opening_amount >= (0)::numeric)),
    CONSTRAINT chk_cash_session_status CHECK (((status)::text = ANY ((ARRAY['OPEN'::character varying, 'CLOSED'::character varying])::text[])))
);

CREATE TABLE cash_session_denomination (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    cash_session_id uuid NOT NULL,
    denomination numeric(14,2) NOT NULL,
    quantity integer NOT NULL,
    subtotal numeric(14,2) GENERATED ALWAYS AS ((denomination * (quantity)::numeric)) STORED,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT cash_session_denomination_quantity_check CHECK ((quantity >= 0))
);

CREATE TABLE client (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    document character varying(40),
    name character varying(120) NOT NULL,
    email character varying(120),
    phone character varying(30),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    document_type character varying(30)
);

CREATE TABLE companies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(200) NOT NULL,
    legal_name character varying(200),
    nit character varying(20),
    email character varying(200),
    phone character varying(50),
    city character varying(100),
    address character varying(300),
    contact_name character varying(150),
    operation_mode character varying(20) DEFAULT 'OFFLINE'::character varying NOT NULL,
    plan character varying(20) DEFAULT 'LOCAL'::character varying NOT NULL,
    status character varying(20) DEFAULT 'TRIAL'::character varying NOT NULL,
    max_devices integer DEFAULT 1,
    max_locations integer DEFAULT 1,
    max_users integer DEFAULT 5,
    trial_days integer DEFAULT 14,
    offline_lease_hours integer DEFAULT 48,
    offline_mode_allowed boolean DEFAULT true,
    allow_sync boolean DEFAULT true NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    license_signature text,
    public_key text,
    observations text,
    admin_notes text,
    customer_message text,
    expires_at timestamp with time zone,
    grace_until timestamp with time zone,
    last_payment_at timestamp with time zone,
    trial_started_at timestamp with time zone,
    cancelled_at timestamp with time zone,
    slug character varying(120),
    onboarding_completed boolean DEFAULT false NOT NULL,
    operational_profile character varying(30) DEFAULT 'MIXED'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_companies_max_devices CHECK ((max_devices >= 1)),
    CONSTRAINT chk_companies_max_locations CHECK ((max_locations >= 1)),
    CONSTRAINT chk_companies_max_users CHECK ((max_users >= 1)),
    CONSTRAINT chk_companies_operation_mode CHECK (((operation_mode)::text = ANY ((ARRAY['OFFLINE'::character varying, 'ONLINE'::character varying, 'HYBRID'::character varying])::text[]))),
    CONSTRAINT chk_companies_status CHECK (((status)::text = ANY ((ARRAY['TRIAL'::character varying, 'ACTIVE'::character varying, 'SUSPENDED'::character varying, 'BLOCKED'::character varying, 'CANCELLED'::character varying, 'EXPIRED'::character varying])::text[]))),
    CONSTRAINT chk_companies_trial_days CHECK ((trial_days >= 0))
);

CREATE TABLE company_modules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    module_type character varying(30) NOT NULL,
    enabled boolean DEFAULT false NOT NULL,
    enabled_at timestamp with time zone,
    expires_at timestamp with time zone,
    configuration_json text,
    limits_json text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone
);

CREATE TABLE company_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    settings_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE company_settings_snapshot (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    version integer NOT NULL,
    settings_json jsonb NOT NULL,
    progress_data jsonb NOT NULL,
    reason character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by character varying(255) NOT NULL
);

CREATE TABLE company_vehicle_type (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    vehicle_type_id uuid NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    requires_plate boolean,
    has_own_rate boolean,
    quick_access boolean,
    requires_photo boolean,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE conversations (
    id uuid NOT NULL,
    ticket_id uuid NOT NULL,
    channel character varying(50) NOT NULL,
    tenant_id uuid NOT NULL,
    started_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    closed_at timestamp with time zone
);

CREATE TABLE country_tax_configuration (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    country_code character varying(5) NOT NULL,
    tax_name character varying(50) NOT NULL,
    default_rate numeric(5,2) NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE custodied_item (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    locker_id uuid,
    item_type character varying(50) NOT NULL,
    identifier character varying(100),
    status character varying(20) DEFAULT 'RECEIVED'::character varying NOT NULL,
    observations text,
    photo_url character varying(500),
    received_by_id uuid,
    received_at timestamp with time zone DEFAULT now() NOT NULL,
    returned_by_id uuid,
    returned_at timestamp with time zone,
    company_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE devices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    connection_type character varying(255) NOT NULL,
    protocol character varying(255) NOT NULL,
    serial_port character varying(255),
    tcp_host character varying(255),
    tcp_port integer,
    usb_path character varying(255),
    baud_rate integer,
    is_enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE electronic_invoice_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_id uuid NOT NULL,
    company_id uuid NOT NULL,
    description character varying(500) NOT NULL,
    quantity numeric(10,4) DEFAULT 1 NOT NULL,
    unit_price numeric(18,2) NOT NULL,
    discount_pct numeric(5,2) DEFAULT 0,
    tax_pct numeric(5,2) DEFAULT 0,
    tax_amount numeric(18,2) DEFAULT 0,
    total numeric(18,2) NOT NULL,
    product_code character varying(100),
    unit_of_measure character varying(30) DEFAULT 'UND'::character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE electronic_invoice_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    invoice_id uuid,
    provider_type character varying(50) NOT NULL,
    event_type character varying(50) NOT NULL,
    request_payload jsonb,
    response_payload jsonb,
    http_status integer,
    error_message text,
    duration_ms integer,
    correlation_id character varying(100),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE electronic_invoices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    number character varying(50) NOT NULL,
    external_id character varying(255),
    external_number character varying(100),
    cufe character varying(500),
    status character varying(30) DEFAULT 'DRAFT'::character varying NOT NULL,
    provider_type character varying(50) NOT NULL,
    client_id uuid,
    subtotal numeric(18,2) NOT NULL,
    tax_amount numeric(18,2) DEFAULT 0 NOT NULL,
    total numeric(18,2) NOT NULL,
    currency character varying(3) DEFAULT 'COP'::character varying NOT NULL,
    country_code character varying(5) DEFAULT 'CO'::character varying NOT NULL,
    source_type character varying(50),
    source_id uuid,
    due_date date,
    issued_at timestamp with time zone,
    paid_at timestamp with time zone,
    cancelled_at timestamp with time zone,
    provider_raw_response jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE global_audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    action character varying(50) NOT NULL,
    user_id uuid,
    username character varying(100),
    ip_address character varying(45),
    device character varying(255),
    previous_payload text,
    new_payload text,
    metadata text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE invoice_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    invoice_id uuid NOT NULL,
    note_type character varying(10) NOT NULL,
    external_id character varying(255),
    reason character varying(500) NOT NULL,
    amount numeric(18,2) NOT NULL,
    status character varying(30) DEFAULT 'PENDING'::character varying NOT NULL,
    provider_raw_response jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT invoice_notes_note_type_check CHECK (((note_type)::text = ANY ((ARRAY['CREDIT'::character varying, 'DEBIT'::character varying])::text[])))
);

CREATE TABLE invoice_provider_webhooks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid,
    provider_type character varying(50) NOT NULL,
    event_type character varying(100),
    payload jsonb NOT NULL,
    signature character varying(500),
    processed boolean DEFAULT false,
    processed_at timestamp with time zone,
    error_message text,
    received_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE invoice_providers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    provider_type character varying(50) NOT NULL,
    is_active boolean DEFAULT false NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    country_code character varying(5) DEFAULT 'CO'::character varying NOT NULL,
    currency character varying(3) DEFAULT 'COP'::character varying NOT NULL,
    encrypted_credentials jsonb DEFAULT '{}'::jsonb NOT NULL,
    resolution_number character varying(50),
    resolution_prefix character varying(10),
    resolution_from bigint,
    resolution_to bigint,
    resolution_valid_from date,
    resolution_valid_to date,
    tax_regime character varying(30),
    webhook_secret character varying(255),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_resolution CHECK (((resolution_from IS NULL) OR (resolution_to IS NULL) OR (resolution_from <= resolution_to)))
);

CREATE TABLE license_audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    device_id uuid,
    action character varying(50) NOT NULL,
    description text,
    old_value text,
    new_value text,
    ip_address character varying(50),
    session_id character varying(100),
    performed_by character varying(100),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE license_block_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    device_id uuid,
    event_type character varying(50) NOT NULL,
    reason_code character varying(100) NOT NULL,
    reason_description character varying(500) NOT NULL,
    technical_details text,
    request_metadata text,
    ip_address character varying(50),
    device_fingerprint character varying(100),
    device_hostname character varying(100),
    device_os character varying(50),
    app_version character varying(50),
    last_heartbeat_at timestamp with time zone,
    minutes_since_last_heartbeat integer,
    company_status_at_block character varying(20),
    company_plan_at_block character varying(20),
    expires_at_at_block timestamp with time zone,
    grace_until_at_block timestamp with time zone,
    days_since_expiration integer,
    signature_valid boolean,
    fingerprint_valid boolean,
    tamper_check_passed boolean,
    tamper_check_details character varying(200),
    tamper_violation_count integer DEFAULT 0,
    payment_received_after_block boolean DEFAULT false,
    payment_reference character varying(100),
    payment_date timestamp with time zone,
    auto_blocked boolean DEFAULT false NOT NULL,
    blocked_by character varying(100),
    corrective_action character varying(100),
    false_positive boolean DEFAULT false,
    resolved boolean DEFAULT false NOT NULL,
    resolved_at timestamp with time zone,
    resolved_by character varying(100),
    resolution_notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE licensed_devices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    device_fingerprint character varying(100) NOT NULL,
    status character varying(20) DEFAULT 'ACTIVE'::character varying NOT NULL,
    license_key character varying(200),
    expires_at timestamp with time zone,
    revoked_at timestamp with time zone,
    revocation_reason character varying(500),
    signature text,
    last_heartbeat_at timestamp with time zone,
    last_seen_at timestamp with time zone,
    last_ip_address character varying(50),
    hostname character varying(100),
    mac_address character varying(50),
    operating_system character varying(50),
    app_version character varying(50),
    cpu_info character varying(200),
    is_currently_online boolean DEFAULT false,
    heartbeat_count bigint DEFAULT 0,
    pending_command character varying(50),
    pending_command_payload text,
    command_acknowledged boolean DEFAULT false,
    pending_sync_events bigint DEFAULT 0,
    synced_events bigint DEFAULT 0,
    failed_sync_events bigint DEFAULT 0,
    last_error_report text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE locker (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    code character varying(20) NOT NULL,
    label character varying(100),
    status character varying(30) DEFAULT 'DISPONIBLE'::character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE master_vehicle_type (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    icon character varying(40) DEFAULT '🚗'::character varying NOT NULL,
    color character varying(20) DEFAULT '#2563EB'::character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    requires_plate boolean DEFAULT true NOT NULL,
    requires_photo boolean DEFAULT false NOT NULL,
    has_own_rate boolean DEFAULT true NOT NULL,
    quick_access boolean DEFAULT true NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE message_channels (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    provider_name character varying(50) NOT NULL,
    channel_type character varying(50) NOT NULL,
    is_active boolean DEFAULT true
);

CREATE TABLE message_provider_configs (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    channel_id uuid NOT NULL,
    config_key character varying(100) NOT NULL,
    config_value text NOT NULL,
    is_secret boolean DEFAULT false
);

CREATE TABLE monthly_contract (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    rate_id uuid NOT NULL,
    site character varying(80) DEFAULT 'DEFAULT'::character varying NOT NULL,
    site_id uuid,
    start_date date NOT NULL,
    end_date date NOT NULL,
    amount numeric(12,2) NOT NULL,
    notes text,
    created_by_id uuid,
    updated_by_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    client_id uuid NOT NULL,
    vehicle_id uuid NOT NULL,
    status character varying(20) NOT NULL,
    CONSTRAINT chk_monthly_contract_amount_nonneg CHECK ((amount >= (0)::numeric)),
    CONSTRAINT chk_monthly_contract_dates CHECK ((end_date >= start_date))
);

CREATE TABLE onboarding_defaults (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    default_key character varying(100) NOT NULL,
    default_value jsonb NOT NULL,
    plan_restriction character varying(50),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by character varying(255)
);

CREATE TABLE onboarding_progress (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    current_step integer DEFAULT 1 NOT NULL,
    completed boolean DEFAULT false NOT NULL,
    skipped boolean DEFAULT false NOT NULL,
    completed_at timestamp with time zone,
    skipped_at timestamp with time zone,
    progress_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    version bigint DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE onboarding_question_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    step_number integer NOT NULL,
    title character varying(200) NOT NULL,
    description character varying(500),
    enabled boolean DEFAULT true NOT NULL,
    required boolean DEFAULT false NOT NULL,
    plan_restricted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE operation_idempotency (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    idempotency_key character varying(200) NOT NULL,
    operation_type character varying(32) NOT NULL,
    session_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE operational_parameters (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    site_id uuid NOT NULL,
    company_id uuid NOT NULL,
    allow_entry_without_printer boolean DEFAULT false NOT NULL,
    allow_exit_without_payment boolean DEFAULT false NOT NULL,
    allow_reprint boolean DEFAULT true NOT NULL,
    allow_void boolean DEFAULT true NOT NULL,
    require_photo_entry boolean DEFAULT false NOT NULL,
    require_photo_exit boolean DEFAULT false NOT NULL,
    tolerance_minutes integer DEFAULT 0 NOT NULL,
    max_time_no_charge integer DEFAULT 0 NOT NULL,
    legal_message text,
    offline_mode_enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_op_params_max_time CHECK ((max_time_no_charge >= 0)),
    CONSTRAINT chk_op_params_tolerance CHECK ((tolerance_minutes >= 0))
);

CREATE TABLE outbox_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    aggregate_type character varying(100) NOT NULL,
    aggregate_id character varying(255) NOT NULL,
    event_type character varying(100) NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    company_id uuid,
    processed_at timestamp with time zone,
    failed_at timestamp with time zone,
    failure_reason text,
    retry_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE parking_parameters (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    site_code character varying(255) NOT NULL,
    data jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE parking_session (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    ticket_number character varying(255) NOT NULL,
    plate character varying(20),
    has_helmet boolean DEFAULT false NOT NULL,
    vehicle_id uuid NOT NULL,
    rate_id uuid,
    entry_operator_id uuid,
    exit_operator_id uuid,
    entry_at timestamp with time zone DEFAULT now() NOT NULL,
    exit_at timestamp with time zone,
    status character varying(255) NOT NULL,
    sync_status character varying(20) NOT NULL,
    entry_notes character varying(255),
    exit_notes character varying(255),
    entry_image_url character varying(255),
    exit_image_url character varying(255),
    lost_ticket boolean DEFAULT false NOT NULL,
    lost_ticket_reason character varying(255),
    reprint_count integer DEFAULT 0 NOT NULL,
    total_amount numeric(10,2),
    tax_amount numeric(10,2),
    discount_amount numeric(10,2),
    net_amount numeric(10,2),
    payment_method character varying(50),
    country_code character varying(2) DEFAULT 'CO'::character varying,
    entry_mode character varying(20) DEFAULT 'VISITOR'::character varying,
    no_plate boolean DEFAULT false,
    no_plate_reason character varying(200),
    is_monthly_session boolean DEFAULT false,
    agreement_code character varying(50),
    applied_prepaid_minutes integer DEFAULT 0,
    version bigint DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_parking_session_discount_amount CHECK (((discount_amount IS NULL) OR (discount_amount >= (0)::numeric))),
    CONSTRAINT chk_parking_session_exit_after_entry CHECK (((exit_at IS NULL) OR (exit_at >= entry_at))),
    CONSTRAINT chk_parking_session_net_amount CHECK (((net_amount IS NULL) OR (net_amount >= (0)::numeric))),
    CONSTRAINT chk_parking_session_reprint_count CHECK ((reprint_count >= 0)),
    CONSTRAINT chk_parking_session_status CHECK (((status)::text = ANY ((ARRAY['ACTIVE'::character varying, 'CLOSED'::character varying, 'LOST_TICKET'::character varying, 'CANCELED'::character varying])::text[]))),
    CONSTRAINT chk_parking_session_tax_amount CHECK (((tax_amount IS NULL) OR (tax_amount >= (0)::numeric))),
    CONSTRAINT chk_parking_session_total_amount CHECK (((total_amount IS NULL) OR (total_amount >= (0)::numeric)))
);

CREATE TABLE parking_sites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    code character varying(20) NOT NULL,
    name character varying(120) NOT NULL,
    address character varying(300),
    city character varying(100),
    phone character varying(50),
    manager_name character varying(150),
    timezone character varying(50) DEFAULT 'America/Bogota'::character varying NOT NULL,
    currency character varying(10) DEFAULT 'COP'::character varying NOT NULL,
    max_capacity integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_parking_sites_max_capacity CHECK ((max_capacity >= 0))
);

CREATE TABLE parking_space (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    code character varying(30) NOT NULL,
    label character varying(80),
    type character varying(30) DEFAULT 'GENERAL'::character varying NOT NULL,
    status character varying(30) DEFAULT 'ACTIVE'::character varying NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE parking_space_assignment (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    parking_space_id uuid NOT NULL,
    parking_session_id uuid NOT NULL,
    assigned_at timestamp with time zone DEFAULT now() NOT NULL,
    released_at timestamp with time zone,
    status character varying(30) DEFAULT 'ACTIVE'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE password_reset_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token_hash character varying(255) NOT NULL,
    ip_address character varying(255),
    used boolean DEFAULT false NOT NULL,
    used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    company_id uuid NOT NULL
);

CREATE TABLE payment (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    session_id uuid NOT NULL,
    method character varying(255) NOT NULL,
    amount numeric(10,2) NOT NULL,
    paid_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_payment_amount_nonneg CHECK ((amount >= (0)::numeric))
);

CREATE TABLE payment_methods (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(20) NOT NULL,
    name character varying(100) NOT NULL,
    requires_reference boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    company_id uuid
);

CREATE TABLE permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(80) NOT NULL,
    description character varying(255),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(40) NOT NULL,
    name character varying(120) NOT NULL,
    monthly_price numeric(12,2) DEFAULT 0 NOT NULL,
    yearly_price numeric(12,2) DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    description text,
    features jsonb DEFAULT '{}'::jsonb NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT chk_plans_monthly_price CHECK ((monthly_price >= (0)::numeric)),
    CONSTRAINT chk_plans_yearly_price CHECK ((yearly_price >= (0)::numeric))
);

CREATE TABLE prepaid_balance (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    package_id uuid NOT NULL,
    plate character varying(20) NOT NULL,
    holder_name character varying(120),
    remaining_minutes integer NOT NULL,
    purchased_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_prepaid_balance_remaining_minutes_nonneg CHECK ((remaining_minutes >= 0))
);

CREATE TABLE prepaid_deduction (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    balance_id uuid NOT NULL,
    session_id uuid,
    minutes_deducted integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_prepaid_deduction_minutes CHECK ((minutes_deducted > 0))
);

CREATE TABLE prepaid_package (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    name character varying(120) NOT NULL,
    hours_included integer NOT NULL,
    amount numeric(12,2) NOT NULL,
    vehicle_type character varying(30),
    site character varying(80),
    site_id uuid,
    expires_days integer DEFAULT 30 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_prepaid_package_amount_nonneg CHECK ((amount >= (0)::numeric)),
    CONSTRAINT chk_prepaid_package_expires CHECK ((expires_days > 0)),
    CONSTRAINT chk_prepaid_package_hours CHECK ((hours_included > 0))
);

CREATE TABLE print_attempts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    print_job_id uuid NOT NULL,
    attempt_key character varying(255) NOT NULL,
    status character varying(255) DEFAULT 'CREATED'::character varying NOT NULL,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE print_jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    company_id uuid NOT NULL,
    created_by_user_id uuid,
    document_type character varying(255) NOT NULL,
    idempotency_key character varying(255) NOT NULL,
    payload_hash character varying(255) NOT NULL,
    status character varying(255) DEFAULT 'CREATED'::character varying NOT NULL,
    terminal_id character varying(80),
    ticket_snapshot_json text,
    attempts integer DEFAULT 0 NOT NULL,
    last_error text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE printers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    site_id uuid NOT NULL,
    name character varying(120) NOT NULL,
    type character varying(20) NOT NULL,
    connection character varying(20) NOT NULL,
    paper_width_mm integer DEFAULT 80 NOT NULL,
    endpoint_or_device character varying(255),
    is_active boolean DEFAULT true NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    company_id uuid
);

CREATE TABLE rate (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    vehicle_type character varying(255),
    rate_type character varying(255) NOT NULL,
    amount numeric(10,2) NOT NULL,
    grace_minutes integer DEFAULT 0 NOT NULL,
    tolerance_minutes integer DEFAULT 0 NOT NULL,
    fraction_minutes integer DEFAULT 60 NOT NULL,
    rounding_mode character varying(255) DEFAULT 'UP'::character varying NOT NULL,
    lost_ticket_surcharge numeric(10,2) DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    site_id uuid,
    base_value numeric(10,2) DEFAULT 0 NOT NULL,
    base_minutes integer DEFAULT 0 NOT NULL,
    additional_value numeric(10,2) DEFAULT 0 NOT NULL,
    additional_minutes integer DEFAULT 0 NOT NULL,
    min_session_value numeric(10,2),
    max_session_value numeric(10,2),
    max_daily_value numeric(10,2),
    night_surcharge_percent numeric(5,2) DEFAULT 0 NOT NULL,
    holiday_surcharge_percent numeric(5,2) DEFAULT 0 NOT NULL,
    applies_days_bitmap integer,
    applies_night boolean DEFAULT false NOT NULL,
    applies_holiday boolean DEFAULT false NOT NULL,
    category character varying(20) DEFAULT 'STANDARD'::character varying NOT NULL,
    window_start time without time zone,
    window_end time without time zone,
    scheduled_active_from timestamp with time zone,
    scheduled_active_to timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    tax_percentage numeric(5,2) DEFAULT 0 NOT NULL,
    tax_included boolean DEFAULT true NOT NULL,
    CONSTRAINT chk_rate_additional_value_nonneg CHECK ((additional_value >= (0)::numeric)),
    CONSTRAINT chk_rate_amount_nonneg CHECK ((amount >= (0)::numeric)),
    CONSTRAINT chk_rate_base_value_nonneg CHECK ((base_value >= (0)::numeric)),
    CONSTRAINT chk_rate_category CHECK (((category)::text = ANY ((ARRAY['STANDARD'::character varying, 'MONTHLY'::character varying, 'AGREEMENT'::character varying, 'PREPAID'::character varying])::text[]))),
    CONSTRAINT chk_rate_fraction_minutes_positive CHECK ((fraction_minutes > 0)),
    CONSTRAINT chk_rate_grace_minutes_nonneg CHECK ((grace_minutes >= 0)),
    CONSTRAINT chk_rate_holiday_surcharge_nonneg CHECK ((holiday_surcharge_percent >= (0)::numeric)),
    CONSTRAINT chk_rate_lost_ticket_surcharge_nonneg CHECK ((lost_ticket_surcharge >= (0)::numeric)),
    CONSTRAINT chk_rate_min_max_session CHECK (((max_session_value IS NULL) OR (min_session_value IS NULL) OR (max_session_value >= min_session_value))),
    CONSTRAINT chk_rate_night_surcharge_nonneg CHECK ((night_surcharge_percent >= (0)::numeric)),
    CONSTRAINT chk_rate_rounding_mode CHECK (((rounding_mode)::text = ANY ((ARRAY['UP'::character varying, 'DOWN'::character varying, 'NEAREST'::character varying])::text[]))),
    CONSTRAINT chk_rate_tolerance_nonneg CHECK ((tolerance_minutes >= 0)),
    CONSTRAINT chk_rate_type CHECK (((rate_type)::text = ANY ((ARRAY['PER_MINUTE'::character varying, 'HOURLY'::character varying, 'DAILY'::character varying, 'FLAT'::character varying])::text[])))
);

CREATE TABLE rate_fractions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    rate_id uuid NOT NULL,
    from_minute integer NOT NULL,
    to_minute integer NOT NULL,
    fraction_value numeric(10,2) NOT NULL,
    round_up boolean DEFAULT true NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_rate_fractions_range CHECK ((to_minute > from_minute)),
    CONSTRAINT chk_rate_fractions_value_nonneg CHECK ((fraction_value >= (0)::numeric))
);

CREATE TABLE role_permissions (
    role_id uuid NOT NULL,
    permission_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(40) NOT NULL,
    name character varying(120) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE session_event (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    type character varying(255) NOT NULL,
    actor_user_id uuid,
    metadata text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE subscription_change_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    subscription_id uuid,
    old_plan_id uuid,
    new_plan_id uuid,
    change_type character varying(50) NOT NULL,
    changed_by uuid,
    reason text,
    effective_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    plan_id uuid NOT NULL,
    status character varying(30) DEFAULT 'ACTIVE'::character varying NOT NULL,
    starts_at timestamp with time zone DEFAULT now() NOT NULL,
    ends_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE sync_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    idempotency_key character varying(255) NOT NULL,
    event_type character varying(255) NOT NULL,
    direction character varying(255) NOT NULL,
    origin character varying(255) NOT NULL,
    aggregate_id character varying(255) NOT NULL,
    session_id character varying(255),
    device_id character varying(255),
    user_id character varying(255),
    payload_json text NOT NULL,
    synced_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE theme_configuration (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    primary_color character varying(7) DEFAULT '#D97757'::character varying NOT NULL,
    secondary_color character varying(7) DEFAULT '#64748b'::character varying NOT NULL,
    success_color character varying(7) DEFAULT '#22c55e'::character varying NOT NULL,
    warning_color character varying(7) DEFAULT '#f59e0b'::character varying NOT NULL,
    danger_color character varying(7) DEFAULT '#ef4444'::character varying NOT NULL,
    theme_mode character varying(10) DEFAULT 'auto'::character varying NOT NULL,
    logo_url text,
    favicon_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_theme_mode CHECK (((theme_mode)::text = ANY ((ARRAY['light'::character varying, 'dark'::character varying, 'auto'::character varying])::text[])))
);

CREATE TABLE ticket_assignments (
    id uuid NOT NULL,
    ticket_id uuid NOT NULL,
    agent_id uuid NOT NULL,
    assigned_by uuid,
    assigned_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE ticket_attachments (
    id uuid NOT NULL,
    message_id uuid,
    ticket_id uuid,
    file_url character varying(255) NOT NULL,
    file_type character varying(50),
    file_size integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE ticket_audit_logs (
    id uuid NOT NULL,
    ticket_id uuid NOT NULL,
    action character varying(100) NOT NULL,
    performed_by uuid NOT NULL,
    old_value jsonb,
    new_value jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE ticket_categories (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE ticket_counter (
    counter_key character varying(255) NOT NULL,
    company_id uuid NOT NULL,
    last_number integer DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE ticket_events (
    id uuid NOT NULL,
    ticket_id uuid NOT NULL,
    event_type character varying(50) NOT NULL,
    payload jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE ticket_messages (
    id uuid NOT NULL,
    conversation_id uuid NOT NULL,
    sender_type character varying(50) NOT NULL,
    content text NOT NULL,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    attachments jsonb
);

CREATE TABLE ticket_sla (
    id uuid NOT NULL,
    ticket_id uuid NOT NULL,
    response_time_minutes integer NOT NULL,
    resolution_time_minutes integer NOT NULL,
    escalation_rules jsonb,
    tenant_id uuid NOT NULL
);

CREATE TABLE tickets (
    id uuid NOT NULL,
    ticket_number character varying(50) NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    status character varying(50) NOT NULL,
    priority character varying(50) NOT NULL,
    category character varying(50) NOT NULL,
    channel character varying(50) NOT NULL,
    customer_id uuid NOT NULL,
    assigned_agent_id uuid,
    tenant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    closed_at timestamp with time zone
);

CREATE TABLE user_roles (
    user_id uuid NOT NULL,
    role_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE vehicle (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    plate character varying(20) NOT NULL,
    type character varying(255) NOT NULL,
    vehicle_type_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    client_id uuid
);

CREATE TABLE vehicle_condition_report (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    stage character varying(255) NOT NULL,
    observations character varying(255),
    checklist_json text,
    photo_urls_json text,
    created_by_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE webhook_events (
    id uuid NOT NULL,
    provider character varying(50) NOT NULL,
    payload jsonb NOT NULL,
    status character varying(50) NOT NULL,
    processed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ---------------------------------------------------------------------------
-- SECTION 3: PRIMARY KEYS AND UNIQUE CONSTRAINTS
-- ---------------------------------------------------------------------------

ALTER TABLE agreement
    ADD CONSTRAINT agreement_company_code_key UNIQUE (company_id, code);

ALTER TABLE agreement
    ADD CONSTRAINT agreement_pkey PRIMARY KEY (id);

ALTER TABLE api_keys
    ADD CONSTRAINT api_keys_key_hash_key UNIQUE (key_hash);

ALTER TABLE api_keys
    ADD CONSTRAINT api_keys_pkey PRIMARY KEY (id);

ALTER TABLE app_user
    ADD CONSTRAINT app_user_pkey PRIMARY KEY (id);

ALTER TABLE audit_event
    ADD CONSTRAINT audit_event_pkey PRIMARY KEY (id);

ALTER TABLE auth_audit_log
    ADD CONSTRAINT auth_audit_log_pkey PRIMARY KEY (id);

ALTER TABLE auth_sessions
    ADD CONSTRAINT auth_sessions_pkey PRIMARY KEY (id);

ALTER TABLE auth_sessions
    ADD CONSTRAINT auth_sessions_refresh_jti_key UNIQUE (refresh_jti);

ALTER TABLE auth_sessions
    ADD CONSTRAINT auth_sessions_refresh_token_hash_key UNIQUE (refresh_token_hash);

ALTER TABLE authorized_devices
    ADD CONSTRAINT authorized_devices_pkey PRIMARY KEY (id);

ALTER TABLE blacklisted_plate
    ADD CONSTRAINT blacklisted_plate_pkey PRIMARY KEY (id);

ALTER TABLE cash_audit_log
    ADD CONSTRAINT cash_audit_log_pkey PRIMARY KEY (id);

ALTER TABLE cash_closing_report
    ADD CONSTRAINT cash_closing_report_cash_session_id_key UNIQUE (cash_session_id);

ALTER TABLE cash_closing_report
    ADD CONSTRAINT cash_closing_report_pkey PRIMARY KEY (id);

ALTER TABLE cash_fe_sequence
    ADD CONSTRAINT cash_fe_sequence_pk PRIMARY KEY (site_code, terminal);

ALTER TABLE cash_movement
    ADD CONSTRAINT cash_movement_pkey PRIMARY KEY (id);

ALTER TABLE cash_register
    ADD CONSTRAINT cash_register_pkey PRIMARY KEY (id);

ALTER TABLE cash_session_denomination
    ADD CONSTRAINT cash_session_denomination_pkey PRIMARY KEY (id);

ALTER TABLE cash_session
    ADD CONSTRAINT cash_session_pkey PRIMARY KEY (id);

ALTER TABLE client
    ADD CONSTRAINT client_pkey PRIMARY KEY (id);

ALTER TABLE companies
    ADD CONSTRAINT companies_nit_key UNIQUE (nit);

ALTER TABLE companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);

ALTER TABLE company_modules
    ADD CONSTRAINT company_modules_company_id_module_type_key UNIQUE (company_id, module_type);

ALTER TABLE company_modules
    ADD CONSTRAINT company_modules_pkey PRIMARY KEY (id);

ALTER TABLE company_settings
    ADD CONSTRAINT company_settings_company_id_key UNIQUE (company_id);

ALTER TABLE company_settings
    ADD CONSTRAINT company_settings_pkey PRIMARY KEY (id);

ALTER TABLE company_settings_snapshot
    ADD CONSTRAINT company_settings_snapshot_pkey PRIMARY KEY (id);

ALTER TABLE conversations
    ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);

ALTER TABLE country_tax_configuration
    ADD CONSTRAINT country_tax_configuration_country_code_tax_name_key UNIQUE (country_code, tax_name);

ALTER TABLE country_tax_configuration
    ADD CONSTRAINT country_tax_configuration_pkey PRIMARY KEY (id);

ALTER TABLE custodied_item
    ADD CONSTRAINT custodied_item_pkey PRIMARY KEY (id);

ALTER TABLE devices
    ADD CONSTRAINT devices_pkey PRIMARY KEY (id);

ALTER TABLE electronic_invoice_items
    ADD CONSTRAINT electronic_invoice_items_pkey PRIMARY KEY (id);

ALTER TABLE electronic_invoice_logs
    ADD CONSTRAINT electronic_invoice_logs_pkey PRIMARY KEY (id);

ALTER TABLE electronic_invoices
    ADD CONSTRAINT electronic_invoices_company_id_number_key UNIQUE (company_id, number);

ALTER TABLE electronic_invoices
    ADD CONSTRAINT electronic_invoices_pkey PRIMARY KEY (id);

ALTER TABLE global_audit_log
    ADD CONSTRAINT global_audit_log_pkey PRIMARY KEY (id);

ALTER TABLE invoice_notes
    ADD CONSTRAINT invoice_notes_pkey PRIMARY KEY (id);

ALTER TABLE invoice_provider_webhooks
    ADD CONSTRAINT invoice_provider_webhooks_pkey PRIMARY KEY (id);

ALTER TABLE invoice_providers
    ADD CONSTRAINT invoice_providers_pkey PRIMARY KEY (id);

ALTER TABLE license_audit_log
    ADD CONSTRAINT license_audit_log_pkey PRIMARY KEY (id);

ALTER TABLE license_block_events
    ADD CONSTRAINT license_block_events_pkey PRIMARY KEY (id);

ALTER TABLE licensed_devices
    ADD CONSTRAINT licensed_devices_pkey PRIMARY KEY (id);

ALTER TABLE locker
    ADD CONSTRAINT locker_pkey PRIMARY KEY (id);

ALTER TABLE master_vehicle_type
    ADD CONSTRAINT master_vehicle_type_code_key UNIQUE (code);

ALTER TABLE master_vehicle_type
    ADD CONSTRAINT master_vehicle_type_pkey PRIMARY KEY (id);

ALTER TABLE message_channels
    ADD CONSTRAINT message_channels_pkey PRIMARY KEY (id);

ALTER TABLE message_provider_configs
    ADD CONSTRAINT message_provider_configs_pkey PRIMARY KEY (id);

ALTER TABLE monthly_contract
    ADD CONSTRAINT monthly_contract_pkey PRIMARY KEY (id);

ALTER TABLE onboarding_defaults
    ADD CONSTRAINT onboarding_defaults_default_key_plan_restriction_key UNIQUE (default_key, plan_restriction);

ALTER TABLE onboarding_defaults
    ADD CONSTRAINT onboarding_defaults_pkey PRIMARY KEY (id);

ALTER TABLE onboarding_progress
    ADD CONSTRAINT onboarding_progress_company_id_key UNIQUE (company_id);

ALTER TABLE onboarding_progress
    ADD CONSTRAINT onboarding_progress_pkey PRIMARY KEY (id);

ALTER TABLE onboarding_question_config
    ADD CONSTRAINT onboarding_question_config_pkey PRIMARY KEY (id);

ALTER TABLE onboarding_question_config
    ADD CONSTRAINT onboarding_question_config_step_number_key UNIQUE (step_number);

ALTER TABLE operation_idempotency
    ADD CONSTRAINT operation_idempotency_idempotency_key_key UNIQUE (idempotency_key);

ALTER TABLE operation_idempotency
    ADD CONSTRAINT operation_idempotency_pkey PRIMARY KEY (id);

ALTER TABLE operational_parameters
    ADD CONSTRAINT operational_parameters_pkey PRIMARY KEY (id);

ALTER TABLE operational_parameters
    ADD CONSTRAINT operational_parameters_site_id_key UNIQUE (site_id);

ALTER TABLE outbox_events
    ADD CONSTRAINT outbox_events_pkey PRIMARY KEY (id);

ALTER TABLE parking_parameters
    ADD CONSTRAINT parking_parameters_pkey PRIMARY KEY (id);

ALTER TABLE parking_parameters
    ADD CONSTRAINT parking_parameters_site_code_key UNIQUE (site_code);

ALTER TABLE parking_session
    ADD CONSTRAINT parking_session_company_id_ticket_number_key UNIQUE (company_id, ticket_number);

ALTER TABLE parking_session
    ADD CONSTRAINT parking_session_pkey PRIMARY KEY (id);

ALTER TABLE parking_sites
    ADD CONSTRAINT parking_sites_company_code_key UNIQUE (company_id, code);

ALTER TABLE parking_sites
    ADD CONSTRAINT parking_sites_pkey PRIMARY KEY (id);

ALTER TABLE parking_space_assignment
    ADD CONSTRAINT parking_space_assignment_pkey PRIMARY KEY (id);

ALTER TABLE parking_space
    ADD CONSTRAINT parking_space_pkey PRIMARY KEY (id);

ALTER TABLE password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);

ALTER TABLE password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_hash_key UNIQUE (token_hash);

ALTER TABLE payment_methods
    ADD CONSTRAINT payment_methods_code_company_key UNIQUE (code, company_id);

ALTER TABLE payment_methods
    ADD CONSTRAINT payment_methods_code_company_unique UNIQUE (code, company_id);

ALTER TABLE payment_methods
    ADD CONSTRAINT payment_methods_pkey PRIMARY KEY (id);

ALTER TABLE payment
    ADD CONSTRAINT payment_pkey PRIMARY KEY (id);

ALTER TABLE permissions
    ADD CONSTRAINT permissions_code_key UNIQUE (code);

ALTER TABLE permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);

ALTER TABLE company_vehicle_type
    ADD CONSTRAINT pk_company_vehicle_type PRIMARY KEY (id);

ALTER TABLE plans
    ADD CONSTRAINT plans_code_key UNIQUE (code);

ALTER TABLE plans
    ADD CONSTRAINT plans_pkey PRIMARY KEY (id);

ALTER TABLE prepaid_balance
    ADD CONSTRAINT prepaid_balance_pkey PRIMARY KEY (id);

ALTER TABLE prepaid_deduction
    ADD CONSTRAINT prepaid_deduction_pkey PRIMARY KEY (id);

ALTER TABLE prepaid_package
    ADD CONSTRAINT prepaid_package_pkey PRIMARY KEY (id);

ALTER TABLE print_attempts
    ADD CONSTRAINT print_attempts_attempt_key_key UNIQUE (attempt_key);

ALTER TABLE print_attempts
    ADD CONSTRAINT print_attempts_pkey PRIMARY KEY (id);

ALTER TABLE print_jobs
    ADD CONSTRAINT print_jobs_idempotency_key_key UNIQUE (idempotency_key);

ALTER TABLE print_jobs
    ADD CONSTRAINT print_jobs_pkey PRIMARY KEY (id);

ALTER TABLE printers
    ADD CONSTRAINT printers_pkey PRIMARY KEY (id);

ALTER TABLE rate_fractions
    ADD CONSTRAINT rate_fractions_pkey PRIMARY KEY (id);

ALTER TABLE rate_fractions
    ADD CONSTRAINT rate_fractions_rate_id_key UNIQUE (rate_id, from_minute, to_minute);

ALTER TABLE rate
    ADD CONSTRAINT rate_pkey PRIMARY KEY (id);

ALTER TABLE role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (role_id, permission_id);

ALTER TABLE roles
    ADD CONSTRAINT roles_code_key UNIQUE (code);

ALTER TABLE roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);

ALTER TABLE session_event
    ADD CONSTRAINT session_event_pkey PRIMARY KEY (id);

ALTER TABLE subscription_change_history
    ADD CONSTRAINT subscription_change_history_pkey PRIMARY KEY (id);

ALTER TABLE subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);

ALTER TABLE sync_events
    ADD CONSTRAINT sync_events_idempotency_key_key UNIQUE (idempotency_key);

ALTER TABLE sync_events
    ADD CONSTRAINT sync_events_pkey PRIMARY KEY (id);

ALTER TABLE theme_configuration
    ADD CONSTRAINT theme_configuration_company_unique UNIQUE (company_id);

ALTER TABLE theme_configuration
    ADD CONSTRAINT theme_configuration_pkey PRIMARY KEY (id);

ALTER TABLE ticket_assignments
    ADD CONSTRAINT ticket_assignments_pkey PRIMARY KEY (id);

ALTER TABLE ticket_attachments
    ADD CONSTRAINT ticket_attachments_pkey PRIMARY KEY (id);

ALTER TABLE ticket_audit_logs
    ADD CONSTRAINT ticket_audit_logs_pkey PRIMARY KEY (id);

ALTER TABLE ticket_categories
    ADD CONSTRAINT ticket_categories_pkey PRIMARY KEY (id);

ALTER TABLE ticket_counter
    ADD CONSTRAINT ticket_counter_pkey PRIMARY KEY (counter_key);

ALTER TABLE ticket_events
    ADD CONSTRAINT ticket_events_pkey PRIMARY KEY (id);

ALTER TABLE ticket_messages
    ADD CONSTRAINT ticket_messages_pkey PRIMARY KEY (id);

ALTER TABLE ticket_sla
    ADD CONSTRAINT ticket_sla_pkey PRIMARY KEY (id);

ALTER TABLE ticket_sla
    ADD CONSTRAINT ticket_sla_ticket_id_key UNIQUE (ticket_id);

ALTER TABLE tickets
    ADD CONSTRAINT tickets_pkey PRIMARY KEY (id);

ALTER TABLE tickets
    ADD CONSTRAINT tickets_ticket_number_key UNIQUE (ticket_number);

ALTER TABLE authorized_devices
    ADD CONSTRAINT uq_authorized_devices_per_company UNIQUE (device_id, company_id);

ALTER TABLE cash_movement
    ADD CONSTRAINT uq_cash_movement_idempotency_key UNIQUE (idempotency_key);

ALTER TABLE company_vehicle_type
    ADD CONSTRAINT uq_company_vehicle_type UNIQUE (company_id, vehicle_type_id);

ALTER TABLE locker
    ADD CONSTRAINT uq_locker_company_code UNIQUE (company_id, code);

ALTER TABLE parking_space_assignment
    ADD CONSTRAINT uq_parking_space_assignment_session UNIQUE (parking_session_id);

ALTER TABLE parking_space
    ADD CONSTRAINT uq_parking_space_company_code UNIQUE (company_id, code);

ALTER TABLE vehicle
    ADD CONSTRAINT uq_vehicle_company_plate UNIQUE (company_id, plate);

ALTER TABLE user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (user_id, role_id);

ALTER TABLE vehicle_condition_report
    ADD CONSTRAINT vehicle_condition_report_pkey PRIMARY KEY (id);

ALTER TABLE vehicle
    ADD CONSTRAINT vehicle_pkey PRIMARY KEY (id);

ALTER TABLE webhook_events
    ADD CONSTRAINT webhook_events_pkey PRIMARY KEY (id);

-- ---------------------------------------------------------------------------
-- SECTION 4: FOREIGN KEYS
-- ---------------------------------------------------------------------------

ALTER TABLE agreement
    ADD CONSTRAINT agreement_rate_id_fkey FOREIGN KEY (rate_id) REFERENCES rate(id) ON DELETE SET NULL;

ALTER TABLE agreement
    ADD CONSTRAINT agreement_site_id_fkey FOREIGN KEY (site_id) REFERENCES parking_sites(id) ON DELETE SET NULL;

ALTER TABLE auth_audit_log
    ADD CONSTRAINT auth_audit_log_device_pk_fkey FOREIGN KEY (device_pk) REFERENCES authorized_devices(id) ON DELETE SET NULL;

ALTER TABLE auth_audit_log
    ADD CONSTRAINT auth_audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES app_user(id) ON DELETE SET NULL;

ALTER TABLE auth_sessions
    ADD CONSTRAINT auth_sessions_device_pk_fkey FOREIGN KEY (device_pk) REFERENCES authorized_devices(id) ON DELETE CASCADE;

ALTER TABLE auth_sessions
    ADD CONSTRAINT auth_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES app_user(id) ON DELETE CASCADE;

ALTER TABLE cash_audit_log
    ADD CONSTRAINT cash_audit_log_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES app_user(id);

ALTER TABLE cash_audit_log
    ADD CONSTRAINT cash_audit_log_cash_movement_id_fkey FOREIGN KEY (cash_movement_id) REFERENCES cash_movement(id) ON DELETE CASCADE;

ALTER TABLE cash_audit_log
    ADD CONSTRAINT cash_audit_log_cash_session_id_fkey FOREIGN KEY (cash_session_id) REFERENCES cash_session(id) ON DELETE CASCADE;

ALTER TABLE cash_closing_report
    ADD CONSTRAINT cash_closing_report_cash_session_id_fkey FOREIGN KEY (cash_session_id) REFERENCES cash_session(id) ON DELETE CASCADE;

ALTER TABLE cash_closing_report
    ADD CONSTRAINT cash_closing_report_generated_by_id_fkey FOREIGN KEY (generated_by_id) REFERENCES app_user(id);

ALTER TABLE cash_movement
    ADD CONSTRAINT cash_movement_cash_session_id_fkey FOREIGN KEY (cash_session_id) REFERENCES cash_session(id);

ALTER TABLE cash_movement
    ADD CONSTRAINT cash_movement_created_by_id_fkey FOREIGN KEY (created_by_id) REFERENCES app_user(id);

ALTER TABLE cash_movement
    ADD CONSTRAINT cash_movement_parking_session_id_fkey FOREIGN KEY (parking_session_id) REFERENCES parking_session(id);

ALTER TABLE cash_movement
    ADD CONSTRAINT cash_movement_voided_by_id_fkey FOREIGN KEY (voided_by_id) REFERENCES app_user(id);

ALTER TABLE cash_register
    ADD CONSTRAINT cash_register_printer_id_fkey FOREIGN KEY (printer_id) REFERENCES printers(id);

ALTER TABLE cash_register
    ADD CONSTRAINT cash_register_responsible_user_id_fkey FOREIGN KEY (responsible_user_id) REFERENCES app_user(id);

ALTER TABLE cash_register
    ADD CONSTRAINT cash_register_site_id_fkey FOREIGN KEY (site_id) REFERENCES parking_sites(id);

ALTER TABLE cash_session
    ADD CONSTRAINT cash_session_cash_register_id_fkey FOREIGN KEY (cash_register_id) REFERENCES cash_register(id);

ALTER TABLE cash_session
    ADD CONSTRAINT cash_session_closed_by_id_fkey FOREIGN KEY (closed_by_id) REFERENCES app_user(id);

ALTER TABLE cash_session
    ADD CONSTRAINT cash_session_count_operator_id_fkey FOREIGN KEY (count_operator_id) REFERENCES app_user(id);

ALTER TABLE cash_session_denomination
    ADD CONSTRAINT cash_session_denomination_cash_session_fkey FOREIGN KEY (cash_session_id) REFERENCES cash_session(id) ON DELETE CASCADE;

ALTER TABLE cash_session
    ADD CONSTRAINT cash_session_operator_id_fkey FOREIGN KEY (operator_id) REFERENCES app_user(id);

ALTER TABLE company_modules
    ADD CONSTRAINT company_modules_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE conversations
    ADD CONSTRAINT conversations_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE;

ALTER TABLE custodied_item
    ADD CONSTRAINT custodied_item_locker_id_fkey FOREIGN KEY (locker_id) REFERENCES locker(id) ON DELETE SET NULL;

ALTER TABLE custodied_item
    ADD CONSTRAINT custodied_item_received_by_id_fkey FOREIGN KEY (received_by_id) REFERENCES app_user(id);

ALTER TABLE custodied_item
    ADD CONSTRAINT custodied_item_returned_by_id_fkey FOREIGN KEY (returned_by_id) REFERENCES app_user(id);

ALTER TABLE custodied_item
    ADD CONSTRAINT custodied_item_session_id_fkey FOREIGN KEY (session_id) REFERENCES parking_session(id) ON DELETE CASCADE;

ALTER TABLE electronic_invoice_items
    ADD CONSTRAINT electronic_invoice_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES electronic_invoices(id) ON DELETE CASCADE;

ALTER TABLE electronic_invoice_logs
    ADD CONSTRAINT electronic_invoice_logs_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES electronic_invoices(id);

ALTER TABLE electronic_invoices
    ADD CONSTRAINT electronic_invoices_client_id_fkey FOREIGN KEY (client_id) REFERENCES client(id);

ALTER TABLE electronic_invoices
    ADD CONSTRAINT electronic_invoices_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id);

ALTER TABLE agreement
    ADD CONSTRAINT fk_agreement_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE api_keys
    ADD CONSTRAINT fk_api_keys_company_id FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE api_keys
    ADD CONSTRAINT fk_api_keys_rotated_from FOREIGN KEY (rotated_from_id) REFERENCES api_keys(id) ON DELETE SET NULL;

ALTER TABLE app_user
    ADD CONSTRAINT fk_app_user_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL;

ALTER TABLE auth_audit_log
    ADD CONSTRAINT fk_auth_audit_log_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE auth_sessions
    ADD CONSTRAINT fk_auth_sessions_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE authorized_devices
    ADD CONSTRAINT fk_authorized_devices_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE blacklisted_plate
    ADD CONSTRAINT fk_blacklisted_plate_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE cash_movement
    ADD CONSTRAINT fk_cash_movement_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT;

ALTER TABLE cash_session
    ADD CONSTRAINT fk_cash_session_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT;

ALTER TABLE client
    ADD CONSTRAINT fk_client_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE company_settings
    ADD CONSTRAINT fk_company_settings_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE company_settings_snapshot
    ADD CONSTRAINT fk_company_settings_snapshot_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE company_vehicle_type
    ADD CONSTRAINT fk_company_vehicle_type_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE company_vehicle_type
    ADD CONSTRAINT fk_company_vehicle_type_vehicle_type FOREIGN KEY (vehicle_type_id) REFERENCES master_vehicle_type(id) ON DELETE CASCADE;

ALTER TABLE global_audit_log
    ADD CONSTRAINT fk_global_audit_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT;

ALTER TABLE monthly_contract
    ADD CONSTRAINT fk_monthly_contract_client FOREIGN KEY (client_id) REFERENCES client(id) ON DELETE RESTRICT;

ALTER TABLE monthly_contract
    ADD CONSTRAINT fk_monthly_contract_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE monthly_contract
    ADD CONSTRAINT fk_monthly_contract_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicle(id) ON DELETE RESTRICT;

ALTER TABLE onboarding_progress
    ADD CONSTRAINT fk_onboarding_progress_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE operational_parameters
    ADD CONSTRAINT fk_op_params_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE parking_session
    ADD CONSTRAINT fk_parking_session_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT;

ALTER TABLE parking_space_assignment
    ADD CONSTRAINT fk_parking_space_assignment_session FOREIGN KEY (parking_session_id) REFERENCES parking_session(id);

ALTER TABLE parking_space_assignment
    ADD CONSTRAINT fk_parking_space_assignment_space FOREIGN KEY (parking_space_id) REFERENCES parking_space(id);

ALTER TABLE password_reset_tokens
    ADD CONSTRAINT fk_password_reset_tokens_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE payment
    ADD CONSTRAINT fk_payment_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT;

ALTER TABLE payment_methods
    ADD CONSTRAINT fk_payment_methods_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE prepaid_balance
    ADD CONSTRAINT fk_prepaid_balance_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE prepaid_package
    ADD CONSTRAINT fk_prepaid_package_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE printers
    ADD CONSTRAINT fk_printers_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE rate
    ADD CONSTRAINT fk_rate_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE role_permissions
    ADD CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE;

ALTER TABLE role_permissions
    ADD CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE;

ALTER TABLE subscriptions
    ADD CONSTRAINT fk_subscriptions_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE subscriptions
    ADD CONSTRAINT fk_subscriptions_plan FOREIGN KEY (plan_id) REFERENCES plans(id);

ALTER TABLE theme_configuration
    ADD CONSTRAINT fk_theme_configuration_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE user_roles
    ADD CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE;

ALTER TABLE user_roles
    ADD CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES app_user(id) ON DELETE CASCADE;

ALTER TABLE vehicle
    ADD CONSTRAINT fk_vehicle_client FOREIGN KEY (client_id) REFERENCES client(id) ON DELETE SET NULL;

ALTER TABLE vehicle
    ADD CONSTRAINT fk_vehicle_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT;

ALTER TABLE vehicle
    ADD CONSTRAINT fk_vehicle_type_master FOREIGN KEY (vehicle_type_id) REFERENCES master_vehicle_type(id) ON DELETE SET NULL;

ALTER TABLE invoice_notes
    ADD CONSTRAINT invoice_notes_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id);

ALTER TABLE invoice_notes
    ADD CONSTRAINT invoice_notes_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES electronic_invoices(id);

ALTER TABLE invoice_provider_webhooks
    ADD CONSTRAINT invoice_provider_webhooks_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id);

ALTER TABLE invoice_providers
    ADD CONSTRAINT invoice_providers_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE license_audit_log
    ADD CONSTRAINT license_audit_log_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE license_audit_log
    ADD CONSTRAINT license_audit_log_device_id_fkey FOREIGN KEY (device_id) REFERENCES licensed_devices(id) ON DELETE SET NULL;

ALTER TABLE license_block_events
    ADD CONSTRAINT license_block_events_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE license_block_events
    ADD CONSTRAINT license_block_events_device_id_fkey FOREIGN KEY (device_id) REFERENCES licensed_devices(id) ON DELETE SET NULL;

ALTER TABLE licensed_devices
    ADD CONSTRAINT licensed_devices_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE message_provider_configs
    ADD CONSTRAINT message_provider_configs_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES message_channels(id) ON DELETE CASCADE;

ALTER TABLE monthly_contract
    ADD CONSTRAINT monthly_contract_created_by_fkey FOREIGN KEY (created_by_id) REFERENCES app_user(id) ON DELETE SET NULL;

ALTER TABLE monthly_contract
    ADD CONSTRAINT monthly_contract_rate_id_fkey FOREIGN KEY (rate_id) REFERENCES rate(id);

ALTER TABLE monthly_contract
    ADD CONSTRAINT monthly_contract_site_id_fkey FOREIGN KEY (site_id) REFERENCES parking_sites(id);

ALTER TABLE operation_idempotency
    ADD CONSTRAINT operation_idempotency_session_id_fkey FOREIGN KEY (session_id) REFERENCES parking_session(id) ON DELETE CASCADE;

ALTER TABLE operational_parameters
    ADD CONSTRAINT operational_parameters_site_id_fkey FOREIGN KEY (site_id) REFERENCES parking_sites(id) ON DELETE CASCADE;

ALTER TABLE outbox_events
    ADD CONSTRAINT outbox_events_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE parking_session
    ADD CONSTRAINT parking_session_entry_operator_id_fkey FOREIGN KEY (entry_operator_id) REFERENCES app_user(id);

ALTER TABLE parking_session
    ADD CONSTRAINT parking_session_exit_operator_id_fkey FOREIGN KEY (exit_operator_id) REFERENCES app_user(id);

ALTER TABLE parking_session
    ADD CONSTRAINT parking_session_rate_id_fkey FOREIGN KEY (rate_id) REFERENCES rate(id);

ALTER TABLE parking_session
    ADD CONSTRAINT parking_session_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES vehicle(id);

ALTER TABLE parking_sites
    ADD CONSTRAINT parking_sites_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES app_user(id) ON DELETE CASCADE;

ALTER TABLE payment
    ADD CONSTRAINT payment_session_id_fkey FOREIGN KEY (session_id) REFERENCES parking_session(id) ON DELETE CASCADE;

ALTER TABLE prepaid_balance
    ADD CONSTRAINT prepaid_balance_created_by_fkey FOREIGN KEY (created_by_id) REFERENCES app_user(id) ON DELETE SET NULL;

ALTER TABLE prepaid_balance
    ADD CONSTRAINT prepaid_balance_package_id_fkey FOREIGN KEY (package_id) REFERENCES prepaid_package(id);

ALTER TABLE prepaid_deduction
    ADD CONSTRAINT prepaid_deduction_balance_id_fkey FOREIGN KEY (balance_id) REFERENCES prepaid_balance(id) ON DELETE CASCADE;

ALTER TABLE prepaid_deduction
    ADD CONSTRAINT prepaid_deduction_session_id_fkey FOREIGN KEY (session_id) REFERENCES parking_session(id) ON DELETE SET NULL;

ALTER TABLE prepaid_package
    ADD CONSTRAINT prepaid_package_site_id_fkey FOREIGN KEY (site_id) REFERENCES parking_sites(id) ON DELETE SET NULL;

ALTER TABLE print_attempts
    ADD CONSTRAINT print_attempts_print_job_id_fkey FOREIGN KEY (print_job_id) REFERENCES print_jobs(id) ON DELETE CASCADE;

ALTER TABLE print_jobs
    ADD CONSTRAINT print_jobs_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES app_user(id) ON DELETE SET NULL;

ALTER TABLE print_jobs
    ADD CONSTRAINT print_jobs_session_id_fkey FOREIGN KEY (session_id) REFERENCES parking_session(id) ON DELETE CASCADE;

ALTER TABLE printers
    ADD CONSTRAINT printers_site_id_fkey FOREIGN KEY (site_id) REFERENCES parking_sites(id) ON DELETE CASCADE;

ALTER TABLE rate_fractions
    ADD CONSTRAINT rate_fractions_rate_id_fkey FOREIGN KEY (rate_id) REFERENCES rate(id) ON DELETE CASCADE;

ALTER TABLE rate
    ADD CONSTRAINT rate_site_id_fkey FOREIGN KEY (site_id) REFERENCES parking_sites(id);

ALTER TABLE session_event
    ADD CONSTRAINT session_event_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES app_user(id);

ALTER TABLE session_event
    ADD CONSTRAINT session_event_session_id_fkey FOREIGN KEY (session_id) REFERENCES parking_session(id) ON DELETE CASCADE;

ALTER TABLE subscription_change_history
    ADD CONSTRAINT subscription_change_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES app_user(id) ON DELETE SET NULL;

ALTER TABLE subscription_change_history
    ADD CONSTRAINT subscription_change_history_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE subscription_change_history
    ADD CONSTRAINT subscription_change_history_new_plan_id_fkey FOREIGN KEY (new_plan_id) REFERENCES plans(id) ON DELETE SET NULL;

ALTER TABLE subscription_change_history
    ADD CONSTRAINT subscription_change_history_old_plan_id_fkey FOREIGN KEY (old_plan_id) REFERENCES plans(id) ON DELETE SET NULL;

ALTER TABLE subscription_change_history
    ADD CONSTRAINT subscription_change_history_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL;

ALTER TABLE ticket_assignments
    ADD CONSTRAINT ticket_assignments_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE;

ALTER TABLE ticket_attachments
    ADD CONSTRAINT ticket_attachments_message_id_fkey FOREIGN KEY (message_id) REFERENCES ticket_messages(id) ON DELETE CASCADE;

ALTER TABLE ticket_attachments
    ADD CONSTRAINT ticket_attachments_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE;

ALTER TABLE ticket_audit_logs
    ADD CONSTRAINT ticket_audit_logs_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE;

ALTER TABLE ticket_events
    ADD CONSTRAINT ticket_events_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE;

ALTER TABLE ticket_messages
    ADD CONSTRAINT ticket_messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE;

ALTER TABLE ticket_sla
    ADD CONSTRAINT ticket_sla_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE;

ALTER TABLE vehicle_condition_report
    ADD CONSTRAINT vehicle_condition_report_created_by_id_fkey FOREIGN KEY (created_by_id) REFERENCES app_user(id);

ALTER TABLE vehicle_condition_report
    ADD CONSTRAINT vehicle_condition_report_session_id_fkey FOREIGN KEY (session_id) REFERENCES parking_session(id) ON DELETE CASCADE;

-- ---------------------------------------------------------------------------
-- SECTION 5: INDEXES
-- ---------------------------------------------------------------------------

CREATE INDEX idx_agreement_company_active ON agreement USING btree (company_id, is_active) WHERE (is_active = true);

CREATE INDEX idx_agreement_rate_id ON agreement USING btree (rate_id);

CREATE INDEX idx_agreement_site_id ON agreement USING btree (site_id);

CREATE INDEX idx_api_key_active ON api_keys USING btree (is_active);

CREATE INDEX idx_api_key_company_id ON api_keys USING btree (company_id);

CREATE INDEX idx_api_key_expires_at ON api_keys USING btree (expires_at);

CREATE INDEX idx_api_key_key_hash ON api_keys USING btree (key_hash);

CREATE INDEX idx_app_user_deleted_at ON app_user USING btree (deleted_at) WHERE (deleted_at IS NULL);

CREATE INDEX idx_audit_event_correlation ON audit_event USING btree (correlation_id);

CREATE INDEX idx_audit_event_entity ON audit_event USING btree (entity_name, entity_id);

CREATE INDEX idx_audit_event_module_action ON audit_event USING btree (module, action);

CREATE INDEX idx_audit_event_timestamp ON audit_event USING btree (timestamp_utc DESC);

CREATE INDEX idx_audit_event_user ON audit_event USING btree (user_id);

CREATE INDEX idx_audit_logs_company_id ON global_audit_log USING btree (company_id);

CREATE INDEX idx_audit_logs_created_at ON global_audit_log USING btree (created_at);

CREATE INDEX idx_audit_logs_user_id ON global_audit_log USING btree (user_id);

CREATE INDEX idx_audit_module_action ON audit_event USING btree (branch_id, module, action);

CREATE INDEX idx_audit_tenant_date ON audit_event USING btree (branch_id, timestamp_utc DESC);

CREATE INDEX idx_audit_user ON audit_event USING btree (branch_id, user_id);

CREATE INDEX idx_auth_audit_log_company_id ON auth_audit_log USING btree (company_id);

CREATE INDEX idx_auth_audit_log_created_at ON auth_audit_log USING btree (created_at DESC);

CREATE INDEX idx_auth_audit_log_metadata_gin ON auth_audit_log USING gin (metadata_json);

CREATE INDEX idx_auth_audit_log_user_created ON auth_audit_log USING btree (user_id, created_at DESC);

CREATE INDEX idx_auth_sessions_company_id ON auth_sessions USING btree (company_id);

CREATE INDEX idx_auth_sessions_device_pk ON auth_sessions USING btree (device_pk);

CREATE INDEX idx_auth_sessions_refresh_jti ON auth_sessions USING btree (refresh_jti);

CREATE INDEX idx_auth_sessions_revoked_at ON auth_sessions USING btree (revoked_at) WHERE (revoked_at IS NOT NULL);

CREATE INDEX idx_auth_sessions_user_active ON auth_sessions USING btree (user_id, active) WHERE (active = true);

CREATE INDEX idx_authorized_devices_company_id ON authorized_devices USING btree (company_id);

CREATE INDEX idx_blacklisted_plate_company_plate_active ON blacklisted_plate USING btree (company_id, plate, active);

CREATE INDEX idx_cash_movement_company ON cash_movement USING btree (company_id);

CREATE INDEX idx_cash_movement_parking_session ON cash_movement USING btree (parking_session_id);

CREATE INDEX idx_cash_movements_cash_session_id ON cash_movement USING btree (cash_session_id);

CREATE INDEX idx_cash_movements_created_at ON cash_movement USING btree (created_at);

CREATE INDEX idx_cash_registers_site_id ON cash_register USING btree (site_id);

CREATE INDEX idx_cash_session_company ON cash_session USING btree (company_id);

CREATE INDEX idx_cash_session_register_status ON cash_session USING btree (cash_register_id, status);

CREATE INDEX idx_client_company_id ON client USING btree (company_id);

CREATE INDEX idx_client_document ON client USING btree (document);

CREATE INDEX idx_client_document_type ON client USING btree (document_type);

CREATE INDEX idx_company_settings_snapshot_company ON company_settings_snapshot USING btree (company_id);

CREATE INDEX idx_conversations_ticket_id ON conversations USING btree (ticket_id);

CREATE INDEX idx_csd_cash_session_id ON cash_session_denomination USING btree (cash_session_id);

CREATE INDEX idx_csd_company_denomination ON cash_session_denomination USING btree (company_id, denomination);

CREATE INDEX idx_custodied_item_company ON custodied_item USING btree (company_id);

CREATE INDEX idx_custodied_item_locker ON custodied_item USING btree (locker_id);

CREATE INDEX idx_custodied_item_session ON custodied_item USING btree (session_id);

CREATE INDEX idx_custodied_item_status ON custodied_item USING btree (status);

CREATE INDEX idx_custodied_item_type ON custodied_item USING btree (item_type);

CREATE INDEX idx_cvt_company_id ON company_vehicle_type USING btree (company_id);

CREATE INDEX idx_cvt_vehicle_type_id ON company_vehicle_type USING btree (vehicle_type_id);

CREATE INDEX idx_invoice_items_invoice ON electronic_invoice_items USING btree (invoice_id);

CREATE INDEX idx_invoice_logs_company ON electronic_invoice_logs USING btree (company_id, created_at DESC);

CREATE INDEX idx_invoice_logs_correlation ON electronic_invoice_logs USING btree (correlation_id);

CREATE INDEX idx_invoice_logs_invoice ON electronic_invoice_logs USING btree (invoice_id);

CREATE UNIQUE INDEX idx_invoice_providers_default ON invoice_providers USING btree (company_id) WHERE ((is_default = true) AND (is_active = true));

CREATE INDEX idx_invoices_client ON electronic_invoices USING btree (client_id);

CREATE INDEX idx_invoices_company ON electronic_invoices USING btree (company_id);

CREATE INDEX idx_invoices_created ON electronic_invoices USING btree (company_id, created_at DESC);

CREATE INDEX idx_invoices_source ON electronic_invoices USING btree (source_type, source_id);

CREATE INDEX idx_invoices_status ON electronic_invoices USING btree (company_id, status);

CREATE INDEX idx_locker_active ON locker USING btree (company_id, is_active);

CREATE INDEX idx_locker_company ON locker USING btree (company_id);

CREATE INDEX idx_monthly_contract_company ON monthly_contract USING btree (company_id);

CREATE INDEX idx_monthly_contract_company_id ON monthly_contract USING btree (company_id);

CREATE INDEX idx_monthly_contract_rate_id ON monthly_contract USING btree (rate_id);

CREATE INDEX idx_monthly_contract_site_id ON monthly_contract USING btree (site_id);

CREATE INDEX idx_onboarding_defaults_key ON onboarding_defaults USING btree (default_key);

CREATE INDEX idx_onboarding_defaults_plan ON onboarding_defaults USING btree (plan_restriction);

CREATE INDEX idx_op_params_company_id ON operational_parameters USING btree (company_id);

CREATE INDEX idx_outbox_events_company ON outbox_events USING btree (company_id, created_at) WHERE (processed_at IS NULL);

CREATE INDEX idx_outbox_events_unprocessed ON outbox_events USING btree (created_at) WHERE ((processed_at IS NULL) AND (failed_at IS NULL));

CREATE INDEX idx_parking_session_company_plate ON parking_session USING btree (company_id, plate);

CREATE INDEX idx_parking_session_plate ON parking_session USING btree (plate) WHERE (plate IS NOT NULL);

CREATE INDEX idx_parking_session_status_company ON parking_session USING btree (status, company_id);

CREATE INDEX idx_parking_session_status_company_entry ON parking_session USING btree (status, company_id, entry_at);

CREATE INDEX idx_parking_session_ticket_company ON parking_session USING btree (ticket_number, company_id);

CREATE INDEX idx_parking_sessions_company_id ON parking_session USING btree (company_id);

CREATE INDEX idx_parking_sessions_company_status ON parking_session USING btree (company_id, status);

CREATE INDEX idx_parking_sessions_entry_at ON parking_session USING btree (entry_at);

CREATE INDEX idx_parking_sessions_exit_at ON parking_session USING btree (exit_at);

CREATE INDEX idx_parking_sessions_status ON parking_session USING btree (status);

CREATE INDEX idx_parking_sessions_vehicle_id ON parking_session USING btree (vehicle_id);

CREATE INDEX idx_parking_sites_company_id ON parking_sites USING btree (company_id);

CREATE INDEX idx_parking_space_assignment_company_active ON parking_space_assignment USING btree (company_id, status, released_at);

CREATE INDEX idx_parking_space_assignment_space_active ON parking_space_assignment USING btree (parking_space_id, status, released_at);

CREATE INDEX idx_parking_space_company_sort ON parking_space USING btree (company_id, sort_order);

CREATE INDEX idx_parking_space_company_status ON parking_space USING btree (company_id, status);

CREATE INDEX idx_password_reset_tokens_company_id ON password_reset_tokens USING btree (company_id);

CREATE INDEX idx_password_reset_tokens_user_active ON password_reset_tokens USING btree (user_id, used) WHERE (used = false);

CREATE INDEX idx_payment_company_id ON payment USING btree (company_id);

CREATE INDEX idx_payment_methods_company_id ON payment_methods USING btree (company_id);

CREATE INDEX idx_payments_company_id ON payment USING btree (company_id);

CREATE INDEX idx_payments_created_at ON payment USING btree (created_at);

CREATE INDEX idx_payments_session_id ON payment USING btree (session_id);

CREATE INDEX idx_prepaid_balance_company ON prepaid_balance USING btree (company_id);

CREATE INDEX idx_prepaid_balance_company_id ON prepaid_balance USING btree (company_id);

CREATE INDEX idx_prepaid_balance_plate ON prepaid_balance USING btree (plate);

CREATE INDEX idx_prepaid_package_company_id ON prepaid_package USING btree (company_id);

CREATE INDEX idx_prepaid_package_site_id ON prepaid_package USING btree (site_id);

CREATE INDEX idx_printers_company_id ON printers USING btree (company_id);

CREATE INDEX idx_printers_site_id ON printers USING btree (site_id);

CREATE INDEX idx_providers_company ON invoice_providers USING btree (company_id, is_active);

CREATE INDEX idx_rate_company_id ON rate USING btree (company_id);

CREATE INDEX idx_rate_fractions_rate_id ON rate_fractions USING btree (rate_id);

CREATE INDEX idx_rate_site_uuid ON rate USING btree (site_id);

CREATE INDEX idx_session_event_session_type ON session_event USING btree (session_id, type);

CREATE INDEX idx_session_event_type_actor ON session_event USING btree (type, actor_user_id, created_at DESC);

CREATE INDEX idx_subscription_history_company ON subscription_change_history USING btree (company_id, effective_at DESC);

CREATE INDEX idx_sync_events_company_synced ON sync_events USING btree (company_id, synced_at) WHERE (synced_at IS NULL);

CREATE INDEX idx_theme_configuration_company_id ON theme_configuration USING btree (company_id);

CREATE INDEX idx_ticket_messages_conversation_id ON ticket_messages USING btree (conversation_id);

CREATE INDEX idx_tickets_assigned_agent_id ON tickets USING btree (assigned_agent_id);

CREATE INDEX idx_tickets_customer_id ON tickets USING btree (customer_id);

CREATE INDEX idx_tickets_status ON tickets USING btree (status);

CREATE INDEX idx_tickets_tenant_id ON tickets USING btree (tenant_id);

CREATE UNIQUE INDEX idx_uq_active_plate_company ON parking_session USING btree (company_id, plate) WHERE ((status)::text = 'ACTIVE'::text);

CREATE INDEX idx_users_company_id ON app_user USING btree (company_id);

CREATE INDEX idx_vehicle_company_id ON vehicle USING btree (company_id);

CREATE INDEX idx_vehicle_deleted_at ON vehicle USING btree (deleted_at) WHERE (deleted_at IS NULL);

CREATE INDEX idx_vehicle_plate ON vehicle USING btree (plate);

CREATE INDEX idx_vehicles_company_id ON vehicle USING btree (company_id);

CREATE INDEX idx_vehicles_company_plate ON vehicle USING btree (company_id, plate);

CREATE INDEX idx_vehicles_vehicle_type_id ON vehicle USING btree (vehicle_type_id);

CREATE INDEX idx_webhooks_provider ON invoice_provider_webhooks USING btree (provider_type, processed);

CREATE UNIQUE INDEX printers_unique_default_per_site ON printers USING btree (site_id) WHERE (is_default = true);

CREATE UNIQUE INDEX uq_active_space_assignment ON parking_space_assignment USING btree (parking_space_id) WHERE (released_at IS NULL);

CREATE UNIQUE INDEX uq_app_user_company_email ON app_user USING btree (company_id, email);

CREATE UNIQUE INDEX uq_cash_movement_idempotency ON cash_movement USING btree (idempotency_key) WHERE (idempotency_key IS NOT NULL);

CREATE UNIQUE INDEX uq_cash_register_site_terminal ON cash_register USING btree (site_id, terminal);

CREATE UNIQUE INDEX uq_cash_session_one_open_per_operator ON cash_session USING btree (operator_id) WHERE ((status)::text = 'OPEN'::text);

CREATE UNIQUE INDEX uq_cash_session_one_open_per_register ON cash_session USING btree (cash_register_id) WHERE ((status)::text = 'OPEN'::text);

CREATE UNIQUE INDEX uq_companies_slug_idx ON companies USING btree (slug) WHERE (slug IS NOT NULL);

CREATE UNIQUE INDEX uq_licensed_device_company_fingerprint ON licensed_devices USING btree (company_id, device_fingerprint);

CREATE UNIQUE INDEX uq_parking_session_active_company_plate ON parking_session USING btree (company_id, plate) WHERE (((status)::text = 'ACTIVE'::text) AND (plate IS NOT NULL) AND (company_id IS NOT NULL));

CREATE UNIQUE INDEX uq_printers_site_name ON printers USING btree (site_id, name);

-- ---------------------------------------------------------------------------
-- SECTION 6: ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------

ALTER TABLE app_user ENABLE ROW LEVEL SECURITY;

ALTER TABLE auth_audit_log ENABLE ROW LEVEL SECURITY;

ALTER TABLE auth_sessions ENABLE ROW LEVEL SECURITY;

ALTER TABLE cash_movement ENABLE ROW LEVEL SECURITY;

ALTER TABLE cash_session ENABLE ROW LEVEL SECURITY;

ALTER TABLE electronic_invoice_items ENABLE ROW LEVEL SECURITY;

ALTER TABLE electronic_invoices ENABLE ROW LEVEL SECURITY;

ALTER TABLE invoice_notes ENABLE ROW LEVEL SECURITY;

ALTER TABLE invoice_providers ENABLE ROW LEVEL SECURITY;

ALTER TABLE monthly_contract ENABLE ROW LEVEL SECURITY;

ALTER TABLE parking_session ENABLE ROW LEVEL SECURITY;

ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

ALTER TABLE payment ENABLE ROW LEVEL SECURITY;

ALTER TABLE prepaid_balance ENABLE ROW LEVEL SECURITY;

ALTER TABLE rate ENABLE ROW LEVEL SECURITY;

ALTER TABLE session_event ENABLE ROW LEVEL SECURITY;

ALTER TABLE vehicle ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- SECTION 7: RLS POLICIES
-- ---------------------------------------------------------------------------

CREATE POLICY rls_app_user ON app_user TO parkflow_app USING (((company_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) IS NULL)));

CREATE POLICY rls_auth_audit_log ON auth_audit_log TO parkflow_app USING (((company_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR ((user_id IS NULL) AND (company_id IS NULL))));

CREATE POLICY rls_auth_sessions ON auth_sessions TO parkflow_app USING ((company_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)) WITH CHECK ((company_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid));

CREATE POLICY rls_cash_movement ON cash_movement TO parkflow_app USING (((company_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) IS NULL)));

CREATE POLICY rls_cash_session ON cash_session TO parkflow_app USING (((company_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) IS NULL)));

CREATE POLICY rls_electronic_invoice_items ON electronic_invoice_items TO parkflow_app USING (((company_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) IS NULL)));

CREATE POLICY rls_electronic_invoices ON electronic_invoices TO parkflow_app USING (((company_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) IS NULL)));

CREATE POLICY rls_invoice_notes ON invoice_notes TO parkflow_app USING (((company_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) IS NULL)));

CREATE POLICY rls_invoice_providers ON invoice_providers TO parkflow_app USING (((company_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) IS NULL)));

CREATE POLICY rls_monthly_contract ON monthly_contract TO parkflow_app USING (((company_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) IS NULL)));

CREATE POLICY rls_parking_session ON parking_session TO parkflow_app USING (((company_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) IS NULL)));

CREATE POLICY rls_password_reset_tokens ON password_reset_tokens TO parkflow_app USING ((company_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)) WITH CHECK ((company_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid));

CREATE POLICY rls_payment ON payment TO parkflow_app USING (((company_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) IS NULL)));

CREATE POLICY rls_prepaid_balance ON prepaid_balance TO parkflow_app USING (((company_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) IS NULL)));

CREATE POLICY rls_rate ON rate TO parkflow_app USING (((company_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) IS NULL)));

CREATE POLICY rls_session_event ON session_event TO parkflow_app USING (((EXISTS ( SELECT 1
   FROM parking_session ps
  WHERE ((ps.id = session_event.session_id) AND (ps.company_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) IS NULL)));

CREATE POLICY rls_vehicle ON vehicle TO parkflow_app USING (((company_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) IS NULL)));

-- =============================================================================

-- =============================================================================
-- SECTION 8: SEED DATA
-- =============================================================================

-- Seed data from original V001 (ON CONFLICT clauses removed for squashed baseline)

INSERT INTO plans (code, name, monthly_price, yearly_price) VALUES
    ('basic', 'Basic', 0, 0),
    ('pro', 'Pro', 99000, 990000),
    ('enterprise', 'Enterprise', 299000, 2990000);

INSERT INTO roles (code, name) VALUES
    ('admin', 'Administrador'),
    ('supervisor', 'Supervisor'),
    ('cashier', 'Cajero'),
    ('operator', 'Operador'),
    ('auditor', 'Auditor');

INSERT INTO permissions (code, description) VALUES
    ('auth.login', 'Autenticación de usuarios'),
    ('users.manage', 'Gestión de usuarios'),
    ('rates.manage', 'Gestión de tarifas'),
    ('sessions.read', 'Consulta de sesiones'),
    ('sessions.write', 'Operación de ingreso/salida'),
    ('cash.manage', 'Gestión de caja'),
    ('reports.read', 'Consulta de reportes'),
    ('audit.read', 'Consulta de auditoría'),
    ('settings.manage', 'Configuración general');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON (
    (r.code='admin') OR
    (r.code='supervisor' AND p.code IN ('sessions.read','sessions.write','rates.manage','cash.manage','reports.read')) OR
    (r.code='cashier' AND p.code IN ('sessions.read','sessions.write','cash.manage')) OR
    (r.code='operator' AND p.code IN ('sessions.read','sessions.write')) OR
    (r.code='auditor' AND p.code IN ('audit.read','reports.read','sessions.read'))
);

INSERT INTO companies (id, name, legal_name, nit, email, slug, status, max_devices, max_users, max_locations)
VALUES ('00000000-0000-0000-0000-000000000001', 'Empresa Demo', 'Empresa Demo S.A.S.', '900123456', 'admin@parkflow.local', 'empresa-demo', 'ACTIVE', 10, 50, 5);

INSERT INTO parking_sites (id, company_id, code, name, city, timezone, currency, max_capacity)
VALUES ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'DEFAULT', 'Sede Principal', 'Bogotá', 'America/Bogota', 'COP', 0);

INSERT INTO payment_methods (code, name, requires_reference, display_order) VALUES
    ('CASH', 'Efectivo', FALSE, 1),
    ('DEBIT_CARD', 'Tarjeta débito', TRUE, 2),
    ('CREDIT_CARD', 'Tarjeta crédito', TRUE, 3),
    ('NEQUI', 'Nequi', TRUE, 4),
    ('DAVIPLATA', 'Daviplata', TRUE, 5),
    ('TRANSFER', 'Transferencia', TRUE, 6),
    ('QR', 'QR', TRUE, 7),
    ('AGREEMENT', 'Convenio', TRUE, 8),
    ('INTERNAL_CREDIT', 'Crédito interno', TRUE, 9),
    ('MIXED', 'Mixto', TRUE, 10),
    ('CARD', 'Datáfono / tarjeta legacy', TRUE, 11),
    ('OTHER', 'Otro', TRUE, 12);









INSERT INTO operational_parameters (site_id, company_id, allow_entry_without_printer, allow_exit_without_payment, allow_reprint, allow_void, require_photo_entry, require_photo_exit, tolerance_minutes, max_time_no_charge, offline_mode_enabled)
VALUES ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', FALSE, FALSE, TRUE, TRUE, FALSE, FALSE, 5, 15, TRUE);

-- Add FRACTIONAL to rate_type constraint to match Java RateType enum
-- Without this, inserting RateType.FRACTIONAL raises a DB constraint violation.
-- Date: 2026-06-28

ALTER TABLE rate DROP CONSTRAINT IF EXISTS chk_rate_type;

ALTER TABLE rate ADD CONSTRAINT chk_rate_type CHECK (
    rate_type IN ('PER_MINUTE', 'HOURLY', 'DAILY', 'FLAT', 'FRACTIONAL')
);
-- Add refresh token family tracking to detect token theft
-- Date: 2026-06-28

-- Create refresh_token_families table
CREATE TABLE refresh_token_families (
    family_id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    company_id UUID NOT NULL,
    generation_number INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    revoke_reason VARCHAR(50),

    CONSTRAINT fk_rtf_user FOREIGN KEY (user_id) REFERENCES app_user(id),
    CONSTRAINT fk_rtf_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- Create indexes for quick lookups
CREATE INDEX idx_rtf_user ON refresh_token_families(user_id);
CREATE INDEX idx_rtf_company ON refresh_token_families(company_id);
CREATE INDEX idx_rtf_revoked ON refresh_token_families(revoked_at) WHERE revoked_at IS NOT NULL;

-- Add columns to auth_sessions table for token family tracking
ALTER TABLE auth_sessions ADD COLUMN token_family_id UUID;
ALTER TABLE auth_sessions ADD COLUMN token_generation INT NOT NULL DEFAULT 1;

-- Add foreign key constraint to refresh_token_families
ALTER TABLE auth_sessions ADD CONSTRAINT fk_as_family
    FOREIGN KEY (token_family_id) REFERENCES refresh_token_families(family_id);

-- Create index for quick session family lookups
CREATE INDEX idx_as_family ON auth_sessions(token_family_id);
CREATE INDEX idx_as_generation ON auth_sessions(token_generation);
-- JWT Key Version Management Table (for gradual secret rotation)
CREATE TABLE jwt_key_versions (
    version INTEGER PRIMARY KEY,
    key_material TEXT NOT NULL,
    active BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    activated_at TIMESTAMPTZ,
    deactivated_at TIMESTAMPTZ,

    CONSTRAINT jwt_key_versions_key_material_not_empty CHECK (key_material != '')
);

CREATE INDEX idx_jwt_key_versions_active ON jwt_key_versions(active) WHERE active = true;
CREATE INDEX idx_jwt_key_versions_created_at ON jwt_key_versions(created_at DESC);

-- Multi-Factor Authentication Configuration Table
CREATE TABLE mfa_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    method VARCHAR(20) NOT NULL, -- TOTP, SMS, EMAIL
    enabled BOOLEAN DEFAULT false,
    totp_secret VARCHAR(32),
    backup_codes TEXT, -- JSON array of backup codes
    verified_at TIMESTAMPTZ,
    enabled_at TIMESTAMPTZ,
    disabled_at TIMESTAMPTZ,
    requires_verification BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT fk_mfa_configs_user FOREIGN KEY (user_id)
        REFERENCES app_user(id) ON DELETE CASCADE,
    CONSTRAINT ck_mfa_method CHECK (method IN ('TOTP', 'SMS', 'EMAIL'))
);

CREATE INDEX idx_mfa_configs_user_method ON mfa_configs(user_id, method);
CREATE INDEX idx_mfa_configs_enabled ON mfa_configs(user_id) WHERE enabled = true;
CREATE INDEX idx_mfa_configs_created_at ON mfa_configs(created_at DESC);

-- Multi-tenant security: Ensure user_id belongs to correct tenant


-- Add column to track key version in tokens (for JWT rotation)
ALTER TABLE auth_sessions
ADD COLUMN key_version INTEGER DEFAULT 1;

-- Create index for efficient lookup
CREATE INDEX idx_auth_sessions_key_version ON auth_sessions(key_version);
-- V042: Onboarding Security Hardening
-- Addresses audit findings:
--   I-06: Missing Row Level Security on onboarding_progress
--   C-05: No schema validation on progress_data JSONB
--
-- NOTE: RLS policy uses app.tenant_id session variable set by the application layer
-- via SET LOCAL app.tenant_id = '<uuid>' on every authenticated request.
-- The parkflow_app role must be the role used by the Spring datasource.
--
-- PostgreSQL version: 14+

-- ─────────────────────────────────────────────────────────────────────────────
-- Ensure required roles exist
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'parkflow_service') THEN
        CREATE ROLE parkflow_service NOLOGIN;
    END IF;
END
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- I-06: Row Level Security for onboarding_progress
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable RLS on onboarding_progress table
ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;

-- Create policy: only allow access to rows belonging to the current tenant
-- The NULLIF handles the case where app.tenant_id is not set (e.g. SUPER_ADMIN bypass)
CREATE POLICY rls_onboarding_progress_tenant_isolation
    ON onboarding_progress
    AS PERMISSIVE
    FOR ALL
    TO parkflow_app
    USING (
        company_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
        OR current_setting('app.tenant_id', true) IS NULL
        OR current_setting('app.tenant_id', true) = ''
    );

-- Super admin bypass: allow service role unrestricted access
-- (used for admin tools and migrations)
CREATE POLICY rls_onboarding_progress_superadmin_bypass
    ON onboarding_progress
    AS PERMISSIVE
    FOR ALL
    TO parkflow_service
    USING (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- C-05: Basic structural validation on progress_data JSONB
-- ─────────────────────────────────────────────────────────────────────────────
-- PostgreSQL CHECK constraints on JSONB can validate basic structure.
-- We enforce that progress_data is a JSON object (not array/null/scalar).
-- Full schema validation is done at the application layer (service + validator).
ALTER TABLE onboarding_progress
    ADD CONSTRAINT chk_onboarding_progress_data_is_object
        CHECK (
            progress_data IS NULL
            OR jsonb_typeof(progress_data) = 'object'
        );

-- ─────────────────────────────────────────────────────────────────────────────
-- Index for performance: querying by company_id (used in findByCompanyId)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_company_id
    ON onboarding_progress (company_id);
CREATE TABLE onboarding_rule_snapshots (
    id UUID PRIMARY KEY,
    version INTEGER NOT NULL UNIQUE,
    applied_at TIMESTAMP WITH TIME ZONE NOT NULL,
    validation_rules JSONB NOT NULL,
    default_values JSONB NOT NULL
);

-- Insert initial snapshot (Version 1)
INSERT INTO onboarding_rule_snapshots (id, version, applied_at, validation_rules, default_values)
VALUES (
    gen_random_uuid(), 
    1, 
    now(), 
    '{}'::jsonb, 
    '{}'::jsonb
);

-- Add tracking columns to onboarding_progress
ALTER TABLE onboarding_progress ADD COLUMN rule_version INTEGER;
ALTER TABLE onboarding_progress ADD COLUMN snapshot_hash VARCHAR(255);
ALTER TABLE onboarding_progress ADD COLUMN materialization_failed BOOLEAN NOT NULL DEFAULT FALSE;
-- V002__create_communication_tables.sql

CREATE TABLE communication_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    channel character varying(50) NOT NULL,
    provider character varying(100) NOT NULL,
    enabled boolean DEFAULT false NOT NULL,
    host character varying(255),
    port integer,
    username character varying(255),
    password_encrypted text,
    api_key_encrypted text,
    api_secret_encrypted text,
    sender_email character varying(255),
    sender_name character varying(255),
    reply_to_email character varying(255),
    base_url character varying(255),
    security_mode character varying(50),
    country_code character varying(10),
    daily_limit integer DEFAULT 0,
    daily_counter integer DEFAULT 0,
    advanced_config_json jsonb,
    last_test_status character varying(50),
    last_test_at timestamp with time zone,
    last_error text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid,
    CONSTRAINT pk_communication_settings PRIMARY KEY (id),
    CONSTRAINT uq_company_channel UNIQUE (company_id, channel)
);

CREATE TABLE communication_delivery_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    channel character varying(50) NOT NULL,
    provider character varying(100) NOT NULL,
    recipient character varying(255) NOT NULL,
    message_type character varying(100),
    subject character varying(255),
    status character varying(50) NOT NULL,
    error_message text,
    metadata_json jsonb,
    sent_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT pk_communication_delivery_logs PRIMARY KEY (id)
);

CREATE INDEX idx_comm_logs_company_channel_status ON communication_delivery_logs (company_id, channel, status);
CREATE INDEX idx_comm_logs_sent_at ON communication_delivery_logs (sent_at);

CREATE TABLE communication_settings_audit (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    channel character varying(50) NOT NULL,
    action character varying(50) NOT NULL,
    field_name character varying(100),
    old_value_masked text,
    new_value_masked text,
    changed_by uuid,
    ip_address character varying(100),
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT pk_communication_settings_audit PRIMARY KEY (id)
);

CREATE INDEX idx_comm_audit_company_channel ON communication_settings_audit (company_id, channel);
-- Create user_identities table for OAuth2/OIDC external identity linking
-- Each row links an external provider identity (Google, Microsoft) to an internal AppUser
-- Supports: multiple providers per user, unique constraint per (provider, provider_user_id)
-- Reason: OAuth2/OIDC login with Google and Microsoft
-- Date: 2026-06-30

CREATE TABLE user_identities (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    app_user_id UUID NOT NULL,
    provider VARCHAR(50) NOT NULL,
    provider_user_id VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT user_identities_pkey PRIMARY KEY (id),
    CONSTRAINT uq_user_identities_provider_user UNIQUE (provider, provider_user_id),
    CONSTRAINT fk_user_identities_app_user FOREIGN KEY (app_user_id)
        REFERENCES app_user(id) ON DELETE CASCADE
);

CREATE INDEX idx_user_identities_app_user ON user_identities(app_user_id);
CREATE INDEX idx_user_identities_provider ON user_identities(provider, provider_user_id);

-- RLS not needed: user_identities cross-cuts tenants (a user from company A can
-- log in via Google; the identity binding is per-user, not per-company)
ALTER TABLE rate
  ADD COLUMN IF NOT EXISTS pricing_configuration jsonb,
  ADD COLUMN IF NOT EXISTS pricing_engine_version varchar(32);

UPDATE rate
SET pricing_engine_version = COALESCE(pricing_engine_version, 'pricing_engine_v1')
WHERE pricing_engine_version IS NULL;

UPDATE rate
SET pricing_configuration = jsonb_build_object(
  'version', 'pricing_engine_v1',
  'currency', 'COP',
  'active', is_active,
  'strategy', jsonb_build_object(
    'type',
      CASE
        WHEN rate_type = 'FRACTIONAL' THEN 'FRACTIONAL'
        WHEN rate_type = 'DAILY' THEN 'DAILY'
        WHEN applies_night AND max_daily_value IS NOT NULL THEN 'MIXED'
        WHEN applies_night THEN 'NIGHT'
        ELSE 'HOURLY'
      END,
    'label',
      CASE
        WHEN rate_type = 'FRACTIONAL' THEN 'Por fracción'
        WHEN rate_type = 'DAILY' THEN 'Diaria'
        WHEN applies_night AND max_daily_value IS NOT NULL THEN 'Hora + día + horario especial'
        WHEN applies_night THEN 'Nocturna'
        ELSE 'Por hora'
      END
  ),
  'rates', jsonb_build_object(
    'pricePerHour', CASE WHEN rate_type IN ('HOURLY', 'FLAT') OR (applies_night AND max_daily_value IS NOT NULL) THEN amount ELSE NULL END,
    'fractionMinutes', CASE WHEN rate_type = 'FRACTIONAL' THEN fraction_minutes WHEN fraction_minutes IS NOT NULL THEN fraction_minutes ELSE NULL END,
    'fractionPrice', CASE WHEN rate_type = 'FRACTIONAL' THEN amount ELSE NULL END,
    'dailyPrice', CASE WHEN rate_type = 'DAILY' THEN amount ELSE max_daily_value END,
    'nightPrice', CASE WHEN applies_night THEN amount ELSE NULL END
  ),
  'rules', jsonb_build_object(
    'executionOrder', to_jsonb(ARRAY['GRACE_PERIOD', 'MINIMUM_CHARGE', 'ROUNDING', 'STRATEGY_PRICE', 'DAILY_CAP']),
    'graceMinutes', grace_minutes,
    'minimumChargeMinutes', 0,
    'rounding', jsonb_build_object(
      'mode', COALESCE(rounding_mode, 'NONE'),
      'incrementMinutes',
        CASE
          WHEN rate_type = 'DAILY' THEN 1440
          WHEN rate_type = 'FRACTIONAL' THEN GREATEST(COALESCE(fraction_minutes, 1), 1)
          WHEN fraction_minutes IS NOT NULL AND fraction_minutes > 0 THEN fraction_minutes
          ELSE 60
        END
    ),
    'specialHours', jsonb_build_object(
      'enabled', applies_night OR window_start IS NOT NULL OR window_end IS NOT NULL,
      'startTime', COALESCE(TO_CHAR(window_start, 'HH24:MI'), '20:00'),
      'endTime', COALESCE(TO_CHAR(window_end, 'HH24:MI'), '06:00')
    ),
    'weekends', jsonb_build_object(
      'enabled', applies_holiday,
      'surchargePercent', holiday_surcharge_percent,
      'fixedPrice', NULL
    ),
    'dailyCaps', jsonb_build_object(
      'enabled', max_daily_value IS NOT NULL,
      'maxDailyPrice', max_daily_value
    ),
    'vehicleOverrides', '{}'::jsonb
  ),
  'overrides', '{}'::jsonb
)
WHERE pricing_configuration IS NULL;
-- =============================================================================
-- V005: Enforce Row Level Security (RLS) on all multi-tenant tables
-- =============================================================================
-- This migration dynamically enables and forces RLS on all tables that
-- contain a 'company_id' or 'tenant_id' column. It also creates a strict isolation policy.
--
-- Why FORCE ROW LEVEL SECURITY?
-- Because the application currently connects using the database owner ('parkflow' user).
-- By default, PostgreSQL bypasses RLS for the table owner. 'FORCE' ensures that
-- even the owner is subject to the RLS policies.
-- =============================================================================

DO $$
DECLARE
    r RECORD;
    col_name text;
BEGIN
    FOR r IN 
        SELECT 
            t.table_name,
            c.column_name
        FROM 
            information_schema.tables t
        JOIN 
            information_schema.columns c ON t.table_name = c.table_name 
        WHERE 
            t.table_schema = 'public' 
            AND t.table_type = 'BASE TABLE'
            AND c.column_name IN ('company_id', 'tenant_id')
            AND t.table_name NOT IN ('flyway_schema_history') 
    LOOP
        col_name := r.column_name;

        -- 1. Enable RLS
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', r.table_name);
        
        -- 2. Force RLS (CRITICAL)
        EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY;', r.table_name);
        
        -- 3. Cleanup existing policies if any to prevent duplicates or conflicts
        EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_policy ON %I;', r.table_name);
        EXECUTE format('DROP POLICY IF EXISTS company_isolation_policy ON %I;', r.table_name);
        EXECUTE format('DROP POLICY IF EXISTS rls_%I ON %I;', r.table_name, r.table_name);
        
        -- 4. Create the strict isolation policy
        -- current_setting('app.tenant_id', true) -> 'true' allows missing values (returns NULL)
        -- which results in a secure Default-Deny if the context was not set by the backend.
        EXECUTE format(
            'CREATE POLICY tenant_isolation_policy ON %I 
             AS PERMISSIVE 
             FOR ALL 
             TO PUBLIC 
             USING (%I = current_setting(''app.tenant_id'', true)::uuid) 
             WITH CHECK (%I = current_setting(''app.tenant_id'', true)::uuid);', 
            r.table_name, col_name, col_name
        );
    END LOOP;
END
$$;

-- =====================================================================
-- MIGRATION: V006
-- Phase 3: Optimización de consultas masivas y resiliencia de BD
-- =====================================================================
-- En lugar de un particionamiento nativo destructivo (el cual 
-- obligaría a reescribir 9 Foreign Keys e incluir la clave de 
-- partición en la Primary Key), implementamos índices parciales 
-- y BRIN para series de tiempo, otorgando 80% de los beneficios 
-- de particionamiento con cero downtime y sin deuda técnica.
-- =====================================================================

-- 1. Index para escaneos secuenciales (Reportes y BI)
-- Se usa un índice estándar (B-Tree) en lugar de BRIN para mantener 
-- compatibilidad con la base de datos H2 usada en los tests de integración.
CREATE INDEX IF NOT EXISTS idx_parking_session_created_at 
ON parking_session (created_at);

CREATE INDEX IF NOT EXISTS idx_parking_session_entry_at 
ON parking_session (entry_at);

-- 2. Índice Compuesto y Parcial para consultas operativas en curso (B-Tree)
-- Mejora el rendimiento del endpoint de salida de vehículos y cálculos,
-- filtrando las sesiones que ya fueron cerradas, manteniendo el índice pequeño.
CREATE INDEX IF NOT EXISTS idx_parking_session_active_tenant 
ON parking_session (company_id, plate, entry_at) 
WHERE exit_at IS NULL AND status != 'COMPLETED';

-- 3. Índice para acelerar la sincronización Offline/SaaS
CREATE INDEX IF NOT EXISTS idx_parking_session_sync_status 
ON parking_session (company_id, sync_status) 
WHERE sync_status != 'SYNCED';
