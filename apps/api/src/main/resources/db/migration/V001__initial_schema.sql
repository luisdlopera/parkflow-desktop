-- ============================================================================
-- V001: Initial Schema - Consolidated Baseline
-- ============================================================================
-- All constraints (PK, UNIQUE, FK, CHECK) are defined inline.
-- Tables are ordered by dependency (parents before children).
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. Independent / Root Tables
-- ============================================================================

CREATE TABLE companies (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    name VARCHAR(200) NOT NULL,
    legal_name VARCHAR(200),
    nit VARCHAR(20),
    email VARCHAR(200),
    phone VARCHAR(50),
    city VARCHAR(100),
    address VARCHAR(300),
    contact_name VARCHAR(150),
    operation_mode VARCHAR(20) DEFAULT 'OFFLINE'::VARCHAR NOT NULL,
    plan VARCHAR(20) DEFAULT 'LOCAL'::VARCHAR NOT NULL,
    status VARCHAR(20) DEFAULT 'TRIAL'::VARCHAR NOT NULL,
    max_devices INT DEFAULT 1,
    max_locations INT DEFAULT 1,
    max_users INT DEFAULT 5,
    trial_days INT DEFAULT 14,
    offline_lease_hours INT DEFAULT 48,
    offline_mode_allowed BOOLEAN DEFAULT TRUE,
    allow_sync BOOLEAN DEFAULT TRUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    license_signature TEXT,
    public_key TEXT,
    observations TEXT,
    admin_notes TEXT,
    customer_message TEXT,
    expires_at TIMESTAMPTZ,
    grace_until TIMESTAMPTZ,
    last_payment_at TIMESTAMPTZ,
    trial_started_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    slug VARCHAR(120),
    onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
    operational_profile VARCHAR(30) NOT NULL DEFAULT 'MIXED',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT companies_pkey PRIMARY KEY (id),
    CONSTRAINT companies_nit_key UNIQUE (nit),
    CONSTRAINT chk_companies_max_devices CHECK (max_devices >= 1),
    CONSTRAINT chk_companies_max_locations CHECK (max_locations >= 1),
    CONSTRAINT chk_companies_max_users CHECK (max_users >= 1),
    CONSTRAINT chk_companies_trial_days CHECK (trial_days >= 0)
);

CREATE TABLE authorized_devices (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    device_id VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    platform VARCHAR(255) NOT NULL,
    fingerprint VARCHAR(255) NOT NULL,
    authorized BOOLEAN DEFAULT TRUE NOT NULL,
    revoked_at TIMESTAMPTZ,
    last_seen_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT authorized_devices_pkey PRIMARY KEY (id),
    CONSTRAINT authorized_devices_device_id_key UNIQUE (device_id)
);

CREATE TABLE master_vehicle_type (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    code VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    icon VARCHAR(40) NOT NULL DEFAULT '🚗',
    color VARCHAR(20) NOT NULL DEFAULT '#2563EB',
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    requires_plate BOOLEAN DEFAULT TRUE NOT NULL,
    requires_photo BOOLEAN DEFAULT FALSE NOT NULL,
    has_own_rate BOOLEAN NOT NULL DEFAULT TRUE,
    quick_access BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INT DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT master_vehicle_type_pkey PRIMARY KEY (id),
    CONSTRAINT master_vehicle_type_code_key UNIQUE (code)
);

CREATE TABLE payment_methods (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    requires_reference BOOLEAN DEFAULT FALSE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    display_order INT DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT payment_methods_pkey PRIMARY KEY (id),
    CONSTRAINT payment_methods_code_key UNIQUE (code)
);

CREATE TABLE devices (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    name VARCHAR(255) NOT NULL,
    connection_type VARCHAR(255) NOT NULL,
    protocol VARCHAR(255) NOT NULL,
    serial_port VARCHAR(255),
    tcp_host VARCHAR(255),
    tcp_port INT,
    usb_path VARCHAR(255),
    baud_rate INT,
    is_enabled BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT devices_pkey PRIMARY KEY (id)
);

CREATE TABLE plans (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    code VARCHAR(40) NOT NULL,
    name VARCHAR(120) NOT NULL,
    monthly_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    yearly_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT plans_pkey PRIMARY KEY (id),
    CONSTRAINT plans_code_key UNIQUE (code),
    CONSTRAINT chk_plans_monthly_price CHECK (monthly_price >= 0),
    CONSTRAINT chk_plans_yearly_price CHECK (yearly_price >= 0)
);

CREATE TABLE roles (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    code VARCHAR(40) NOT NULL,
    name VARCHAR(120) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT roles_pkey PRIMARY KEY (id),
    CONSTRAINT roles_code_key UNIQUE (code)
);

CREATE TABLE permissions (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    code VARCHAR(80) NOT NULL,
    description VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT permissions_pkey PRIMARY KEY (id),
    CONSTRAINT permissions_code_key UNIQUE (code)
);

-- ============================================================================
-- 2. Tables depending on companies (Level 1)
-- ============================================================================

CREATE TABLE parking_sites (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    company_id UUID NOT NULL,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(120) NOT NULL,
    address VARCHAR(300),
    city VARCHAR(100),
    phone VARCHAR(50),
    manager_name VARCHAR(150),
    timezone VARCHAR(50) DEFAULT 'America/Bogota'::VARCHAR NOT NULL,
    currency VARCHAR(10) DEFAULT 'COP'::VARCHAR NOT NULL,
    max_capacity INT DEFAULT 0 NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT parking_sites_pkey PRIMARY KEY (id),
    CONSTRAINT parking_sites_company_code_key UNIQUE (company_id, code),
    CONSTRAINT parking_sites_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    CONSTRAINT chk_parking_sites_max_capacity CHECK (max_capacity >= 0)
);

CREATE TABLE app_user (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    company_id UUID,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    document VARCHAR(255),
    phone VARCHAR(255),
    role VARCHAR(255) NOT NULL, -- LEGACY: migrar a user_roles
    password_hash VARCHAR(255) NOT NULL,
    password_changed_at TIMESTAMPTZ,
    last_access_at TIMESTAMPTZ,
    site VARCHAR(255), -- DEPRECATED: usar site_id cuando se implemente
    terminal VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    can_void_tickets BOOLEAN DEFAULT FALSE NOT NULL,
    can_reprint_tickets BOOLEAN DEFAULT FALSE NOT NULL,
    can_close_cash BOOLEAN DEFAULT FALSE NOT NULL,
    require_password_change BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT app_user_pkey PRIMARY KEY (id),
    CONSTRAINT app_user_email_key UNIQUE (email),
    CONSTRAINT fk_app_user_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL
);

CREATE TABLE company_modules (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    company_id UUID NOT NULL,
    module_type VARCHAR(30) NOT NULL,
    enabled BOOLEAN DEFAULT FALSE NOT NULL,
    enabled_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    configuration_json TEXT,
    limits_json TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ,

    CONSTRAINT company_modules_pkey PRIMARY KEY (id),
    CONSTRAINT company_modules_company_id_module_type_key UNIQUE (company_id, module_type),
    CONSTRAINT company_modules_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE TABLE licensed_devices (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    company_id UUID NOT NULL,
    device_fingerprint VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE'::VARCHAR NOT NULL,
    license_key VARCHAR(200),
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    revocation_reason VARCHAR(500),
    signature TEXT,
    last_heartbeat_at TIMESTAMPTZ,
    last_seen_at TIMESTAMPTZ,
    last_ip_address VARCHAR(50),
    hostname VARCHAR(100),
    mac_address VARCHAR(50),
    operating_system VARCHAR(50),
    app_version VARCHAR(50),
    cpu_info VARCHAR(200),
    is_currently_online BOOLEAN DEFAULT FALSE,
    heartbeat_count BIGINT DEFAULT 0,
    pending_command VARCHAR(50),
    pending_command_payload TEXT,
    command_acknowledged BOOLEAN DEFAULT FALSE,
    pending_sync_events BIGINT DEFAULT 0,
    synced_events BIGINT DEFAULT 0,
    failed_sync_events BIGINT DEFAULT 0,
    last_error_report TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT licensed_devices_pkey PRIMARY KEY (id),
    CONSTRAINT licensed_devices_device_fingerprint_key UNIQUE (device_fingerprint),
    CONSTRAINT licensed_devices_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE TABLE company_settings (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    company_id UUID NOT NULL,
    settings_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT company_settings_pkey PRIMARY KEY (id),
    CONSTRAINT company_settings_company_id_key UNIQUE (company_id),
    CONSTRAINT fk_company_settings_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE TABLE onboarding_progress (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    company_id UUID NOT NULL,
    current_step INT NOT NULL DEFAULT 1,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    skipped BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    skipped_at TIMESTAMPTZ,
    progress_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT onboarding_progress_pkey PRIMARY KEY (id),
    CONSTRAINT onboarding_progress_company_id_key UNIQUE (company_id),
    CONSTRAINT fk_onboarding_progress_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE TABLE subscriptions (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    company_id UUID NOT NULL,
    plan_id UUID NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT subscriptions_pkey PRIMARY KEY (id),
    CONSTRAINT fk_subscriptions_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    CONSTRAINT fk_subscriptions_plan FOREIGN KEY (plan_id) REFERENCES plans(id)
);

CREATE TABLE company_settings_snapshot (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    company_id UUID NOT NULL,
    version INT NOT NULL,
    settings_json JSONB NOT NULL,
    progress_data JSONB NOT NULL,
    reason VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(255) NOT NULL,

    CONSTRAINT company_settings_snapshot_pkey PRIMARY KEY (id),
    CONSTRAINT fk_company_settings_snapshot_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE TABLE global_audit_log (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    company_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    user_id UUID,
    username VARCHAR(100),
    ip_address VARCHAR(45),
    device VARCHAR(255),
    previous_payload TEXT,
    new_payload TEXT,
    metadata TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT global_audit_log_pkey PRIMARY KEY (id),
    CONSTRAINT fk_global_audit_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT
);

CREATE TABLE parking_space (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    company_id UUID NOT NULL,
    code VARCHAR(30) NOT NULL,
    label VARCHAR(80),
    type VARCHAR(30) NOT NULL DEFAULT 'GENERAL',
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT parking_space_pkey PRIMARY KEY (id),
    CONSTRAINT uq_parking_space_company_code UNIQUE (company_id, code)
);

-- ============================================================================
-- 3. Tables depending on companies + authorized_devices (Level 2)
-- ============================================================================

CREATE TABLE license_audit_log (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    company_id UUID NOT NULL,
    device_id UUID,
    action VARCHAR(50) NOT NULL,
    description TEXT,
    old_value TEXT,
    new_value TEXT,
    ip_address VARCHAR(50),
    session_id VARCHAR(100),
    performed_by VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT license_audit_log_pkey PRIMARY KEY (id),
    CONSTRAINT license_audit_log_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    CONSTRAINT license_audit_log_device_id_fkey FOREIGN KEY (device_id) REFERENCES licensed_devices(id) ON DELETE SET NULL
);

CREATE TABLE license_block_events (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    company_id UUID NOT NULL,
    device_id UUID,
    event_type VARCHAR(50) NOT NULL,
    reason_code VARCHAR(100) NOT NULL,
    reason_description VARCHAR(500) NOT NULL,
    technical_details TEXT,
    request_metadata TEXT,
    ip_address VARCHAR(50),
    device_fingerprint VARCHAR(100),
    device_hostname VARCHAR(100),
    device_os VARCHAR(50),
    app_version VARCHAR(50),
    last_heartbeat_at TIMESTAMPTZ,
    minutes_since_last_heartbeat INT,
    company_status_at_block VARCHAR(20),
    company_plan_at_block VARCHAR(20),
    expires_at_at_block TIMESTAMPTZ,
    grace_until_at_block TIMESTAMPTZ,
    days_since_expiration INT,
    signature_valid BOOLEAN,
    fingerprint_valid BOOLEAN,
    tamper_check_passed BOOLEAN,
    tamper_check_details VARCHAR(200),
    tamper_violation_count INT DEFAULT 0,
    payment_received_after_block BOOLEAN DEFAULT FALSE,
    payment_reference VARCHAR(100),
    payment_date TIMESTAMPTZ,
    auto_blocked BOOLEAN DEFAULT FALSE NOT NULL,
    blocked_by VARCHAR(100),
    corrective_action VARCHAR(100),
    false_positive BOOLEAN DEFAULT FALSE,
    resolved BOOLEAN DEFAULT FALSE NOT NULL,
    resolved_at TIMESTAMPTZ,
    resolved_by VARCHAR(100),
    resolution_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT license_block_events_pkey PRIMARY KEY (id),
    CONSTRAINT license_block_events_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    CONSTRAINT license_block_events_device_id_fkey FOREIGN KEY (device_id) REFERENCES licensed_devices(id) ON DELETE SET NULL
);

CREATE TABLE auth_audit_log (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    action VARCHAR(255) NOT NULL,
    user_id UUID,
    device_pk UUID,
    outcome VARCHAR(255) NOT NULL,
    metadata_json TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT auth_audit_log_pkey PRIMARY KEY (id),
    CONSTRAINT auth_audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES app_user(id),
    CONSTRAINT auth_audit_log_device_pk_fkey FOREIGN KEY (device_pk) REFERENCES authorized_devices(id)
);

CREATE TABLE auth_sessions (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    user_id UUID NOT NULL,
    device_pk UUID NOT NULL,
    refresh_token_hash VARCHAR(255) NOT NULL,
    refresh_jti VARCHAR(255) NOT NULL,
    refresh_expires_at TIMESTAMPTZ NOT NULL,
    access_expires_at TIMESTAMPTZ NOT NULL,
    active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    last_seen_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    revoked_at TIMESTAMPTZ,

    CONSTRAINT auth_sessions_pkey PRIMARY KEY (id),
    CONSTRAINT auth_sessions_refresh_jti_key UNIQUE (refresh_jti),
    CONSTRAINT auth_sessions_refresh_token_hash_key UNIQUE (refresh_token_hash),
    CONSTRAINT auth_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES app_user(id),
    CONSTRAINT auth_sessions_device_pk_fkey FOREIGN KEY (device_pk) REFERENCES authorized_devices(id)
);

CREATE TABLE password_reset_tokens (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    user_id UUID NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    ip_address VARCHAR(255),
    used BOOLEAN DEFAULT FALSE NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,

    CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id),
    CONSTRAINT password_reset_tokens_token_hash_key UNIQUE (token_hash),
    CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES app_user(id) ON DELETE CASCADE
);

CREATE TABLE role_permissions (
    role_id UUID NOT NULL,
    permission_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT role_permissions_pkey PRIMARY KEY (role_id, permission_id),
    CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

CREATE TABLE user_roles (
    user_id UUID NOT NULL,
    role_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT user_roles_pkey PRIMARY KEY (user_id, role_id),
    CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES app_user(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

-- ============================================================================
-- 4. Configuration tables (depend on parking_sites, companies, app_user)
-- ============================================================================

CREATE TABLE printers (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    site_id UUID NOT NULL,
    name VARCHAR(120) NOT NULL,
    type VARCHAR(20) NOT NULL,
    connection VARCHAR(20) NOT NULL,
    paper_width_mm INT DEFAULT 80 NOT NULL,
    endpoint_or_device VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    is_default BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT printers_pkey PRIMARY KEY (id),
    CONSTRAINT printers_site_id_fkey FOREIGN KEY (site_id) REFERENCES parking_sites(id) ON DELETE CASCADE
);

CREATE TABLE operational_parameters (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    site_id UUID NOT NULL,
    company_id UUID NOT NULL,
    allow_entry_without_printer BOOLEAN DEFAULT FALSE NOT NULL,
    allow_exit_without_payment BOOLEAN DEFAULT FALSE NOT NULL,
    allow_reprint BOOLEAN DEFAULT TRUE NOT NULL,
    allow_void BOOLEAN DEFAULT TRUE NOT NULL,
    require_photo_entry BOOLEAN DEFAULT FALSE NOT NULL,
    require_photo_exit BOOLEAN DEFAULT FALSE NOT NULL,
    tolerance_minutes INT DEFAULT 0 NOT NULL,
    max_time_no_charge INT DEFAULT 0 NOT NULL,
    legal_message TEXT,
    offline_mode_enabled BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT operational_parameters_pkey PRIMARY KEY (id),
    CONSTRAINT operational_parameters_site_id_key UNIQUE (site_id),
    CONSTRAINT operational_parameters_site_id_fkey FOREIGN KEY (site_id) REFERENCES parking_sites(id) ON DELETE CASCADE,
    CONSTRAINT chk_op_params_tolerance CHECK (tolerance_minutes >= 0),
    CONSTRAINT chk_op_params_max_time CHECK (max_time_no_charge >= 0)
);

CREATE TABLE rate (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    company_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    vehicle_type VARCHAR(255),
    rate_type VARCHAR(255) NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    grace_minutes INT DEFAULT 0 NOT NULL,
    tolerance_minutes INT DEFAULT 0 NOT NULL,
    fraction_minutes INT DEFAULT 60 NOT NULL,
    rounding_mode VARCHAR(255) DEFAULT 'UP'::VARCHAR NOT NULL,
    lost_ticket_surcharge NUMERIC(10,2) DEFAULT 0 NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    site VARCHAR(255) DEFAULT NULL, -- DEPRECATED: usar site_id
    site_id UUID,
    base_value NUMERIC(10,2) DEFAULT 0 NOT NULL,
    base_minutes INT DEFAULT 0 NOT NULL,
    additional_value NUMERIC(10,2) DEFAULT 0 NOT NULL,
    additional_minutes INT DEFAULT 0 NOT NULL,
    min_session_value NUMERIC(10,2),
    max_session_value NUMERIC(10,2),
    max_daily_value NUMERIC(10,2),
    night_surcharge_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
    holiday_surcharge_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
    applies_days_bitmap SMALLINT,
    applies_night BOOLEAN DEFAULT FALSE NOT NULL,
    applies_holiday BOOLEAN DEFAULT FALSE NOT NULL,
    category VARCHAR(20) NOT NULL DEFAULT 'STANDARD',
    window_start TIME,
    window_end TIME,
    scheduled_active_from TIMESTAMPTZ,
    scheduled_active_to TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT rate_pkey PRIMARY KEY (id),
    CONSTRAINT rate_site_id_fkey FOREIGN KEY (site_id) REFERENCES parking_sites(id),
    CONSTRAINT chk_rate_amount_nonneg CHECK (amount >= 0),
    CONSTRAINT chk_rate_grace_minutes_nonneg CHECK (grace_minutes >= 0),
    CONSTRAINT chk_rate_tolerance_nonneg CHECK (tolerance_minutes >= 0),
    CONSTRAINT chk_rate_fraction_minutes_positive CHECK (fraction_minutes > 0),
    CONSTRAINT chk_rate_lost_ticket_surcharge_nonneg CHECK (lost_ticket_surcharge >= 0),
    CONSTRAINT chk_rate_base_value_nonneg CHECK (base_value >= 0),
    CONSTRAINT chk_rate_additional_value_nonneg CHECK (additional_value >= 0),
    CONSTRAINT chk_rate_min_max_session CHECK (max_session_value IS NULL OR min_session_value IS NULL OR max_session_value >= min_session_value),
    CONSTRAINT chk_rate_night_surcharge_nonneg CHECK (night_surcharge_percent >= 0),
    CONSTRAINT chk_rate_holiday_surcharge_nonneg CHECK (holiday_surcharge_percent >= 0)
);

CREATE TABLE rate_fractions (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    rate_id UUID NOT NULL,
    from_minute INT NOT NULL,
    to_minute INT NOT NULL,
    fraction_value NUMERIC(10,2) NOT NULL,
    round_up BOOLEAN DEFAULT TRUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT rate_fractions_pkey PRIMARY KEY (id),
    CONSTRAINT rate_fractions_rate_id_key UNIQUE (rate_id, from_minute, to_minute),
    CONSTRAINT rate_fractions_rate_id_fkey FOREIGN KEY (rate_id) REFERENCES rate(id) ON DELETE CASCADE,
    CONSTRAINT chk_rate_fractions_range CHECK (to_minute > from_minute),
    CONSTRAINT chk_rate_fractions_value_nonneg CHECK (fraction_value >= 0)
);

CREATE TABLE vehicle (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    company_id UUID NOT NULL,
    plate VARCHAR(20) NOT NULL,
    type VARCHAR(255) NOT NULL, -- DEPRECATED: usar vehicle_type_id
    vehicle_type_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT vehicle_pkey PRIMARY KEY (id),
    CONSTRAINT fk_vehicle_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT,
    CONSTRAINT fk_vehicle_type_master FOREIGN KEY (vehicle_type_id) REFERENCES master_vehicle_type(id) ON DELETE SET NULL
);

CREATE TABLE monthly_contract (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    company_id UUID NOT NULL,
    rate_id UUID NOT NULL,
    plate VARCHAR(20) NOT NULL,
    vehicle_type VARCHAR(30),
    holder_name VARCHAR(120) NOT NULL,
    holder_document VARCHAR(40),
    holder_phone VARCHAR(30),
    holder_email VARCHAR(120),
    site VARCHAR(80) NOT NULL DEFAULT 'DEFAULT', -- DEPRECATED: usar site_id
    site_id UUID,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    notes TEXT,
    created_by_id UUID,
    updated_by_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT monthly_contract_pkey PRIMARY KEY (id),
    CONSTRAINT monthly_contract_rate_id_fkey FOREIGN KEY (rate_id) REFERENCES rate(id),
    CONSTRAINT monthly_contract_site_id_fkey FOREIGN KEY (site_id) REFERENCES parking_sites(id),
    CONSTRAINT monthly_contract_created_by_fkey FOREIGN KEY (created_by_id) REFERENCES app_user(id) ON DELETE SET NULL,
    CONSTRAINT chk_monthly_contract_amount_nonneg CHECK (amount >= 0),
    CONSTRAINT chk_monthly_contract_dates CHECK (end_date >= start_date)
);

CREATE TABLE agreement (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    company_id UUID NOT NULL,
    code VARCHAR(40) NOT NULL,
    company_name VARCHAR(200) NOT NULL,
    discount_percent NUMERIC(5,2) DEFAULT 0 NOT NULL,
    max_hours_per_day INT DEFAULT 0 NOT NULL,
    flat_amount NUMERIC(12,2),
    rate_id UUID,
    site VARCHAR(80), -- DEPRECATED: usar site_id
    site_id UUID,
    valid_from DATE,
    valid_to DATE,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT agreement_pkey PRIMARY KEY (id),
    CONSTRAINT agreement_company_code_key UNIQUE (company_id, code),
    CONSTRAINT agreement_rate_id_fkey FOREIGN KEY (rate_id) REFERENCES rate(id) ON DELETE SET NULL,
    CONSTRAINT agreement_site_id_fkey FOREIGN KEY (site_id) REFERENCES parking_sites(id) ON DELETE SET NULL,
    CONSTRAINT chk_agreement_discount_percent CHECK (discount_percent >= 0 AND discount_percent <= 100),
    CONSTRAINT chk_agreement_dates CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from)
);

CREATE TABLE prepaid_package (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    company_id UUID NOT NULL,
    name VARCHAR(120) NOT NULL,
    hours_included INT NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    vehicle_type VARCHAR(30),
    site VARCHAR(80), -- DEPRECATED: usar site_id
    site_id UUID,
    expires_days INT DEFAULT 30 NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT prepaid_package_pkey PRIMARY KEY (id),
    CONSTRAINT prepaid_package_site_id_fkey FOREIGN KEY (site_id) REFERENCES parking_sites(id) ON DELETE SET NULL,
    CONSTRAINT chk_prepaid_package_amount_nonneg CHECK (amount >= 0),
    CONSTRAINT chk_prepaid_package_hours CHECK (hours_included > 0),
    CONSTRAINT chk_prepaid_package_expires CHECK (expires_days > 0)
);

CREATE TABLE prepaid_balance (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    company_id UUID NOT NULL,
    package_id UUID NOT NULL,
    plate VARCHAR(20) NOT NULL,
    holder_name VARCHAR(120),
    remaining_minutes INT NOT NULL,
    purchased_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_by_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT prepaid_balance_pkey PRIMARY KEY (id),
    CONSTRAINT prepaid_balance_package_id_fkey FOREIGN KEY (package_id) REFERENCES prepaid_package(id),
    CONSTRAINT prepaid_balance_created_by_fkey FOREIGN KEY (created_by_id) REFERENCES app_user(id) ON DELETE SET NULL,
    CONSTRAINT chk_prepaid_balance_remaining_minutes_nonneg CHECK (remaining_minutes >= 0)
);

-- ============================================================================
-- 5. Parking Operations (depend on vehicle, rate, app_user)
-- ============================================================================

CREATE TABLE parking_session (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    company_id UUID NOT NULL,
    ticket_number VARCHAR(255) NOT NULL,
    plate VARCHAR(20),
    vehicle_id UUID NOT NULL,
    rate_id UUID,
    entry_operator_id UUID,
    exit_operator_id UUID,
    entry_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    exit_at TIMESTAMPTZ,
    status VARCHAR(255) NOT NULL,
    sync_status VARCHAR(20) NOT NULL,
    entry_notes VARCHAR(255),
    exit_notes VARCHAR(255),
    entry_image_url VARCHAR(255),
    exit_image_url VARCHAR(255),
    lost_ticket BOOLEAN DEFAULT FALSE NOT NULL,
    lost_ticket_reason VARCHAR(255),
    reprint_count INT DEFAULT 0 NOT NULL,
    total_amount NUMERIC(10,2),
    tax_amount NUMERIC(10,2),
    discount_amount NUMERIC(10,2),
    net_amount NUMERIC(10,2),
    payment_method VARCHAR(50),
    country_code VARCHAR(2) DEFAULT 'CO',
    entry_mode VARCHAR(20) DEFAULT 'VISITOR',
    no_plate BOOLEAN DEFAULT FALSE,
    no_plate_reason VARCHAR(200),
    is_monthly_session BOOLEAN DEFAULT FALSE,
    agreement_code VARCHAR(50),
    applied_prepaid_minutes INT DEFAULT 0,
    version BIGINT DEFAULT 0,
    site VARCHAR(255), -- DEPRECATED: usar site_id cuando se implemente
    site_code VARCHAR(255), -- DEPRECATED: usar site_id cuando se implemente
    lane VARCHAR(255),
    booth VARCHAR(255),
    terminal VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT parking_session_pkey PRIMARY KEY (id),
    CONSTRAINT parking_session_company_id_ticket_number_key UNIQUE (company_id, ticket_number),
    CONSTRAINT fk_parking_session_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT,
    CONSTRAINT parking_session_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES vehicle(id),
    CONSTRAINT parking_session_rate_id_fkey FOREIGN KEY (rate_id) REFERENCES rate(id),
    CONSTRAINT parking_session_entry_operator_id_fkey FOREIGN KEY (entry_operator_id) REFERENCES app_user(id),
    CONSTRAINT parking_session_exit_operator_id_fkey FOREIGN KEY (exit_operator_id) REFERENCES app_user(id),
    CONSTRAINT chk_parking_session_status CHECK (status IN ('ACTIVE','CLOSED','LOST_TICKET','CANCELED')),
    CONSTRAINT chk_parking_session_exit_after_entry CHECK (exit_at IS NULL OR exit_at >= entry_at),
    CONSTRAINT chk_parking_session_reprint_count CHECK (reprint_count >= 0),
    CONSTRAINT chk_parking_session_total_amount CHECK (total_amount IS NULL OR total_amount >= 0),
    CONSTRAINT chk_parking_session_tax_amount CHECK (tax_amount IS NULL OR tax_amount >= 0),
    CONSTRAINT chk_parking_session_discount_amount CHECK (discount_amount IS NULL OR discount_amount >= 0),
    CONSTRAINT chk_parking_session_net_amount CHECK (net_amount IS NULL OR net_amount >= 0)
);

CREATE TABLE payment (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    company_id UUID NOT NULL,
    session_id UUID NOT NULL,
    method VARCHAR(255) NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    paid_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT payment_pkey PRIMARY KEY (id),
    CONSTRAINT payment_session_id_key UNIQUE (session_id),
    CONSTRAINT fk_payment_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT,
    CONSTRAINT payment_session_id_fkey FOREIGN KEY (session_id) REFERENCES parking_session(id) ON DELETE CASCADE,
    CONSTRAINT chk_payment_amount_nonneg CHECK (amount >= 0)
);

CREATE TABLE session_event (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    session_id UUID NOT NULL,
    type VARCHAR(255) NOT NULL,
    actor_user_id UUID,
    metadata TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT session_event_pkey PRIMARY KEY (id),
    CONSTRAINT session_event_session_id_fkey FOREIGN KEY (session_id) REFERENCES parking_session(id) ON DELETE CASCADE,
    CONSTRAINT session_event_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES app_user(id)
);

CREATE TABLE vehicle_condition_report (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    session_id UUID NOT NULL,
    stage VARCHAR(255) NOT NULL,
    observations VARCHAR(255),
    checklist_json TEXT,
    photo_urls_json TEXT,
    created_by_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT vehicle_condition_report_pkey PRIMARY KEY (id),
    CONSTRAINT vehicle_condition_report_session_id_fkey FOREIGN KEY (session_id) REFERENCES parking_session(id) ON DELETE CASCADE,
    CONSTRAINT vehicle_condition_report_created_by_id_fkey FOREIGN KEY (created_by_id) REFERENCES app_user(id)
);

CREATE TABLE operation_idempotency (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    idempotency_key VARCHAR(200) NOT NULL,
    operation_type VARCHAR(32) NOT NULL,
    session_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT operation_idempotency_pkey PRIMARY KEY (id),
    CONSTRAINT operation_idempotency_idempotency_key_key UNIQUE (idempotency_key),
    CONSTRAINT operation_idempotency_session_id_fkey FOREIGN KEY (session_id) REFERENCES parking_session(id) ON DELETE CASCADE
);

CREATE TABLE parking_space_assignment (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    company_id UUID NOT NULL,
    parking_space_id UUID NOT NULL,
    parking_session_id UUID NOT NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    released_at TIMESTAMPTZ,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT parking_space_assignment_pkey PRIMARY KEY (id),
    CONSTRAINT uq_parking_space_assignment_session UNIQUE (parking_session_id),
    CONSTRAINT fk_parking_space_assignment_space FOREIGN KEY (parking_space_id) REFERENCES parking_space(id),
    CONSTRAINT fk_parking_space_assignment_session FOREIGN KEY (parking_session_id) REFERENCES parking_session(id)
);

CREATE TABLE prepaid_deduction (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    balance_id UUID NOT NULL,
    session_id UUID,
    minutes_deducted INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT prepaid_deduction_pkey PRIMARY KEY (id),
    CONSTRAINT prepaid_deduction_balance_id_fkey FOREIGN KEY (balance_id) REFERENCES prepaid_balance(id) ON DELETE CASCADE,
    CONSTRAINT prepaid_deduction_session_id_fkey FOREIGN KEY (session_id) REFERENCES parking_session(id) ON DELETE SET NULL,
    CONSTRAINT chk_prepaid_deduction_minutes CHECK (minutes_deducted > 0)
);

CREATE TABLE custodied_item (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    session_id UUID NOT NULL,
    item_type VARCHAR(50) NOT NULL,
    identifier VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'RECEIVED',
    observations TEXT,
    photo_url VARCHAR(500),
    received_by_id UUID,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    returned_by_id UUID,
    returned_at TIMESTAMPTZ,
    company_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT custodied_item_pkey PRIMARY KEY (id),
    CONSTRAINT custodied_item_session_id_fkey FOREIGN KEY (session_id) REFERENCES parking_session(id) ON DELETE CASCADE,
    CONSTRAINT custodied_item_received_by_id_fkey FOREIGN KEY (received_by_id) REFERENCES app_user(id),
    CONSTRAINT custodied_item_returned_by_id_fkey FOREIGN KEY (returned_by_id) REFERENCES app_user(id)
);

-- ============================================================================
-- 6. Printing subsystem
-- ============================================================================

CREATE TABLE print_jobs (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    session_id UUID NOT NULL,
    company_id UUID NOT NULL,
    created_by_user_id UUID,
    document_type VARCHAR(255) NOT NULL,
    idempotency_key VARCHAR(255) NOT NULL,
    payload_hash VARCHAR(255) NOT NULL,
    status VARCHAR(255) DEFAULT 'CREATED'::VARCHAR NOT NULL,
    terminal_id VARCHAR(80),
    ticket_snapshot_json TEXT,
    attempts INT DEFAULT 0 NOT NULL,
    last_error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT print_jobs_pkey PRIMARY KEY (id),
    CONSTRAINT print_jobs_idempotency_key_key UNIQUE (idempotency_key),
    CONSTRAINT print_jobs_session_id_fkey FOREIGN KEY (session_id) REFERENCES parking_session(id) ON DELETE CASCADE,
    CONSTRAINT print_jobs_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES app_user(id) ON DELETE SET NULL
);

CREATE TABLE print_attempts (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    print_job_id UUID NOT NULL,
    attempt_key VARCHAR(255) NOT NULL,
    status VARCHAR(255) DEFAULT 'CREATED'::VARCHAR NOT NULL,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT print_attempts_pkey PRIMARY KEY (id),
    CONSTRAINT print_attempts_attempt_key_key UNIQUE (attempt_key),
    CONSTRAINT print_attempts_print_job_id_fkey FOREIGN KEY (print_job_id) REFERENCES print_jobs(id) ON DELETE CASCADE
);

-- ============================================================================
-- 7. Cash Management
-- ============================================================================

CREATE TABLE cash_register (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    site VARCHAR(80) NOT NULL, -- DEPRECATED: usar site_id
    terminal VARCHAR(80) NOT NULL,
    site_id UUID,
    code VARCHAR(20),
    label VARCHAR(120),
    name VARCHAR(120),
    printer_id UUID,
    responsible_user_id UUID,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT cash_register_pkey PRIMARY KEY (id),
    CONSTRAINT cash_register_site_terminal_key UNIQUE (site, terminal),
    CONSTRAINT cash_register_printer_id_fkey FOREIGN KEY (printer_id) REFERENCES printers(id),
    CONSTRAINT cash_register_responsible_user_id_fkey FOREIGN KEY (responsible_user_id) REFERENCES app_user(id),
    CONSTRAINT cash_register_site_id_fkey FOREIGN KEY (site_id) REFERENCES parking_sites(id)
);

CREATE TABLE cash_session (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    company_id UUID NOT NULL,
    cash_register_id UUID NOT NULL,
    operator_id UUID NOT NULL,
    status VARCHAR(20) NOT NULL,
    opening_amount NUMERIC(14,2) DEFAULT 0 NOT NULL,
    opened_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    closed_at TIMESTAMPTZ,
    closed_by_id UUID,
    expected_amount NUMERIC(14,2),
    counted_amount NUMERIC(14,2),
    difference_amount NUMERIC(14,2),
    count_cash NUMERIC(14,2),
    count_card NUMERIC(14,2),
    count_transfer NUMERIC(14,2),
    count_other NUMERIC(14,2),
    notes TEXT,
    closing_notes TEXT,
    closing_witness_name VARCHAR(200),
    support_document_number VARCHAR(120),
    counted_at TIMESTAMPTZ,
    count_operator_id UUID,
    open_idempotency_key VARCHAR(120),
    close_idempotency_key VARCHAR(120),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT cash_session_pkey PRIMARY KEY (id),
    CONSTRAINT cash_session_cash_register_id_fkey FOREIGN KEY (cash_register_id) REFERENCES cash_register(id),
    CONSTRAINT cash_session_operator_id_fkey FOREIGN KEY (operator_id) REFERENCES app_user(id),
    CONSTRAINT cash_session_closed_by_id_fkey FOREIGN KEY (closed_by_id) REFERENCES app_user(id),
    CONSTRAINT cash_session_count_operator_id_fkey FOREIGN KEY (count_operator_id) REFERENCES app_user(id),
    CONSTRAINT chk_cash_session_status CHECK (status IN ('OPEN','CLOSED')),
    CONSTRAINT chk_cash_session_opening_amount_nonneg CHECK (opening_amount >= 0)
);

CREATE TABLE cash_movement (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    cash_session_id UUID NOT NULL,
    company_id UUID NOT NULL,
    movement_type VARCHAR(40) NOT NULL,
    payment_method VARCHAR(20) NOT NULL,
    amount NUMERIC(14,2) NOT NULL,
    parking_session_id UUID,
    status VARCHAR(20) DEFAULT 'POSTED'::VARCHAR NOT NULL,
    terminal VARCHAR(80),
    reason TEXT,
    metadata TEXT,
    external_reference VARCHAR(120),
    idempotency_key VARCHAR(120),
    voided_at TIMESTAMPTZ,
    voided_by_id UUID,
    void_reason TEXT,
    created_by_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT cash_movement_pkey PRIMARY KEY (id),
    CONSTRAINT cash_movement_cash_session_id_fkey FOREIGN KEY (cash_session_id) REFERENCES cash_session(id),
    CONSTRAINT cash_movement_created_by_id_fkey FOREIGN KEY (created_by_id) REFERENCES app_user(id),
    CONSTRAINT cash_movement_parking_session_id_fkey FOREIGN KEY (parking_session_id) REFERENCES parking_session(id),
    CONSTRAINT cash_movement_voided_by_id_fkey FOREIGN KEY (voided_by_id) REFERENCES app_user(id),
    CONSTRAINT chk_cash_movement_status CHECK (status IN ('POSTED','VOIDED')),
    CONSTRAINT chk_cash_movement_amount_nonneg CHECK (amount >= 0)
);

CREATE TABLE cash_closing_report (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    cash_session_id UUID NOT NULL,
    generated_by_id UUID NOT NULL,
    expected_total NUMERIC(14,2) NOT NULL,
    counted_total NUMERIC(14,2) NOT NULL,
    difference NUMERIC(14,2) NOT NULL,
    total_cash NUMERIC(14,2) NOT NULL,
    total_card NUMERIC(14,2) NOT NULL,
    total_transfer NUMERIC(14,2) NOT NULL,
    total_other NUMERIC(14,2) NOT NULL,
    observations TEXT,
    generated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT cash_closing_report_pkey PRIMARY KEY (id),
    CONSTRAINT cash_closing_report_cash_session_id_key UNIQUE (cash_session_id),
    CONSTRAINT cash_closing_report_cash_session_id_fkey FOREIGN KEY (cash_session_id) REFERENCES cash_session(id) ON DELETE CASCADE,
    CONSTRAINT cash_closing_report_generated_by_id_fkey FOREIGN KEY (generated_by_id) REFERENCES app_user(id)
);

CREATE TABLE cash_audit_log (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    cash_session_id UUID,
    cash_movement_id UUID,
    action VARCHAR(80) NOT NULL,
    actor_user_id UUID NOT NULL,
    terminal_id VARCHAR(80),
    client_ip VARCHAR(64),
    old_value TEXT,
    new_value TEXT,
    reason TEXT,
    metadata TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT cash_audit_log_pkey PRIMARY KEY (id),
    CONSTRAINT cash_audit_log_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES app_user(id),
    CONSTRAINT cash_audit_log_cash_session_id_fkey FOREIGN KEY (cash_session_id) REFERENCES cash_session(id) ON DELETE CASCADE,
    CONSTRAINT cash_audit_log_cash_movement_id_fkey FOREIGN KEY (cash_movement_id) REFERENCES cash_movement(id) ON DELETE CASCADE
);

CREATE TABLE cash_fe_sequence (
    site_code VARCHAR(80) NOT NULL,
    terminal VARCHAR(80) NOT NULL DEFAULT '',
    last_value BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT cash_fe_sequence_pk PRIMARY KEY (site_code, terminal)
);

-- ============================================================================
-- 8. Sync & Counters
-- ============================================================================

CREATE TABLE sync_events (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    company_id UUID NOT NULL,
    idempotency_key VARCHAR(255) NOT NULL,
    event_type VARCHAR(255) NOT NULL,
    direction VARCHAR(255) NOT NULL,
    origin VARCHAR(255) NOT NULL,
    aggregate_id VARCHAR(255) NOT NULL,
    session_id VARCHAR(255),
    device_id VARCHAR(255),
    user_id VARCHAR(255),
    payload_json TEXT NOT NULL,
    synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT sync_events_pkey PRIMARY KEY (id),
    CONSTRAINT sync_events_idempotency_key_key UNIQUE (idempotency_key)
);

CREATE TABLE ticket_counter (
    counter_key VARCHAR(255) NOT NULL,
    company_id UUID NOT NULL,
    last_number INT DEFAULT 0 NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT ticket_counter_pkey PRIMARY KEY (counter_key)
);

CREATE TABLE parking_parameters (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    site_code VARCHAR(255) NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT parking_parameters_pkey PRIMARY KEY (id),
    CONSTRAINT parking_parameters_site_code_key UNIQUE (site_code)
);

-- ============================================================================
-- Seed Base Data
-- ============================================================================

INSERT INTO plans (code, name, monthly_price, yearly_price) VALUES
    ('basic', 'Basic', 0, 0),
    ('pro', 'Pro', 99000, 990000),
    ('enterprise', 'Enterprise', 299000, 2990000)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    monthly_price = EXCLUDED.monthly_price,
    yearly_price = EXCLUDED.yearly_price,
    updated_at = NOW();

INSERT INTO roles (code, name) VALUES
    ('admin', 'Administrador'),
    ('supervisor', 'Supervisor'),
    ('cashier', 'Cajero'),
    ('operator', 'Operador'),
    ('auditor', 'Auditor')
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    updated_at = NOW();

INSERT INTO permissions (code, description) VALUES
    ('auth.login', 'Autenticación de usuarios'),
    ('users.manage', 'Gestión de usuarios'),
    ('rates.manage', 'Gestión de tarifas'),
    ('sessions.read', 'Consulta de sesiones'),
    ('sessions.write', 'Operación de ingreso/salida'),
    ('cash.manage', 'Gestión de caja'),
    ('reports.read', 'Consulta de reportes'),
    ('audit.read', 'Consulta de auditoría'),
    ('settings.manage', 'Configuración general')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON (
    (r.code='admin') OR
    (r.code='supervisor' AND p.code IN ('sessions.read','sessions.write','rates.manage','cash.manage','reports.read')) OR
    (r.code='cashier' AND p.code IN ('sessions.read','sessions.write','cash.manage')) OR
    (r.code='operator' AND p.code IN ('sessions.read','sessions.write')) OR
    (r.code='auditor' AND p.code IN ('audit.read','reports.read','sessions.read'))
)
ON CONFLICT DO NOTHING;

INSERT INTO companies (id, name, legal_name, nit, email, slug, status, max_devices, max_users, max_locations)
VALUES ('00000000-0000-0000-0000-000000000001', 'Empresa Demo', 'Empresa Demo S.A.S.', '900123456', 'admin@parkflow.local', 'empresa-demo', 'ACTIVE', 10, 50, 5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO parking_sites (id, company_id, code, name, city, timezone, currency, max_capacity)
VALUES ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'DEFAULT', 'Sede Principal', 'Bogotá', 'America/Bogota', 'COP', 0)
ON CONFLICT (id) DO NOTHING;



-- NOTA: master_vehicle_type ahora se puebla bajo demanda desde el onboarding
-- Cada empresa crea sus tipos seleccionados y se linkean via company_vehicle_type

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
    ('OTHER', 'Otro', TRUE, 12)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    requires_reference = EXCLUDED.requires_reference,
    display_order = EXCLUDED.display_order,
    updated_at = NOW();

INSERT INTO rate (company_id, name, vehicle_type, rate_type, amount, grace_minutes, tolerance_minutes, fraction_minutes, rounding_mode, lost_ticket_surcharge, is_active, site, base_value, base_minutes, additional_value, additional_minutes, max_daily_value)
SELECT '00000000-0000-0000-0000-000000000001', 'Tarifa Base Carro', 'CAR', 'HOURLY', 2000, 5, 0, 60, 'NEAREST', 15000, TRUE, NULL, 0, 0, 0, 0, 20000
WHERE NOT EXISTS (SELECT 1 FROM rate WHERE company_id = '00000000-0000-0000-0000-000000000001' AND vehicle_type = 'CAR' AND site IS NULL);

INSERT INTO rate (company_id, name, vehicle_type, rate_type, amount, grace_minutes, tolerance_minutes, fraction_minutes, rounding_mode, lost_ticket_surcharge, is_active, site, base_value, base_minutes, additional_value, additional_minutes, max_daily_value)
SELECT '00000000-0000-0000-0000-000000000001', 'Tarifa Base Moto', 'MOTORCYCLE', 'HOURLY', 1000, 5, 0, 60, 'NEAREST', 10000, TRUE, NULL, 0, 0, 0, 0, 10000
WHERE NOT EXISTS (SELECT 1 FROM rate WHERE company_id = '00000000-0000-0000-0000-000000000001' AND vehicle_type = 'MOTORCYCLE' AND site IS NULL);

INSERT INTO rate (company_id, name, vehicle_type, rate_type, amount, grace_minutes, tolerance_minutes, fraction_minutes, rounding_mode, lost_ticket_surcharge, is_active, site, base_value, base_minutes, additional_value, additional_minutes, max_daily_value)
SELECT '00000000-0000-0000-0000-000000000001', 'Tarifa Base Bicicleta', 'BICYCLE', 'HOURLY', 500, 5, 0, 60, 'NEAREST', 5000, TRUE, NULL, 0, 0, 0, 0, 5000
WHERE NOT EXISTS (SELECT 1 FROM rate WHERE company_id = '00000000-0000-0000-0000-000000000001' AND vehicle_type = 'BICYCLE' AND site IS NULL);

INSERT INTO rate (company_id, name, vehicle_type, rate_type, amount, grace_minutes, tolerance_minutes, fraction_minutes, rounding_mode, lost_ticket_surcharge, is_active, site, base_value, base_minutes, additional_value, additional_minutes, max_daily_value)
SELECT '00000000-0000-0000-0000-000000000001', 'Tarifa Base Van', 'VAN', 'HOURLY', 3000, 5, 0, 60, 'NEAREST', 20000, TRUE, NULL, 0, 0, 0, 0, 30000
WHERE NOT EXISTS (SELECT 1 FROM rate WHERE company_id = '00000000-0000-0000-0000-000000000001' AND vehicle_type = 'VAN' AND site IS NULL);

INSERT INTO rate (company_id, name, vehicle_type, rate_type, amount, grace_minutes, tolerance_minutes, fraction_minutes, rounding_mode, lost_ticket_surcharge, is_active, site, base_value, base_minutes, additional_value, additional_minutes, max_daily_value)
SELECT '00000000-0000-0000-0000-000000000001', 'Tarifa Base Camión', 'TRUCK', 'HOURLY', 5000, 5, 0, 60, 'NEAREST', 25000, TRUE, NULL, 0, 0, 0, 0, 50000
WHERE NOT EXISTS (SELECT 1 FROM rate WHERE company_id = '00000000-0000-0000-0000-000000000001' AND vehicle_type = 'TRUCK' AND site IS NULL);

INSERT INTO rate (company_id, name, vehicle_type, rate_type, amount, grace_minutes, tolerance_minutes, fraction_minutes, rounding_mode, lost_ticket_surcharge, is_active, site, base_value, base_minutes, additional_value, additional_minutes, max_daily_value)
SELECT '00000000-0000-0000-0000-000000000001', 'Tarifa Base Bus', 'BUS', 'HOURLY', 4000, 5, 0, 60, 'NEAREST', 20000, TRUE, NULL, 0, 0, 0, 0, 40000
WHERE NOT EXISTS (SELECT 1 FROM rate WHERE company_id = '00000000-0000-0000-0000-000000000001' AND vehicle_type = 'BUS' AND site IS NULL);

INSERT INTO rate (company_id, name, vehicle_type, rate_type, amount, grace_minutes, tolerance_minutes, fraction_minutes, rounding_mode, lost_ticket_surcharge, is_active, site, base_value, base_minutes, additional_value, additional_minutes, max_daily_value)
SELECT '00000000-0000-0000-0000-000000000001', 'Tarifa Base Eléctrico', 'ELECTRIC', 'HOURLY', 2200, 5, 0, 60, 'NEAREST', 15000, TRUE, NULL, 0, 0, 0, 0, 22000
WHERE NOT EXISTS (SELECT 1 FROM rate WHERE company_id = '00000000-0000-0000-0000-000000000001' AND vehicle_type = 'ELECTRIC' AND site IS NULL);

INSERT INTO rate (company_id, name, vehicle_type, rate_type, amount, grace_minutes, tolerance_minutes, fraction_minutes, rounding_mode, lost_ticket_surcharge, is_active, site, base_value, base_minutes, additional_value, additional_minutes, max_daily_value)
SELECT '00000000-0000-0000-0000-000000000001', 'Tarifa Base Otro', 'OTHER', 'HOURLY', 2000, 5, 0, 60, 'NEAREST', 15000, TRUE, NULL, 0, 0, 0, 0, 20000
WHERE NOT EXISTS (SELECT 1 FROM rate WHERE company_id = '00000000-0000-0000-0000-000000000001' AND vehicle_type = 'OTHER' AND site IS NULL);

INSERT INTO operational_parameters (site_id, company_id, allow_entry_without_printer, allow_exit_without_payment, allow_reprint, allow_void, require_photo_entry, require_photo_exit, tolerance_minutes, max_time_no_charge, offline_mode_enabled)
VALUES ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', FALSE, FALSE, TRUE, TRUE, FALSE, FALSE, 5, 15, TRUE)
ON CONFLICT (site_id) DO NOTHING;

INSERT INTO parking_space (company_id, code, label, type, status, sort_order) VALUES
  ('00000000-0000-0000-0000-000000000001', 'C001', 'Celda 001', 'GENERAL', 'ACTIVE', 1),
  ('00000000-0000-0000-0000-000000000001', 'C002', 'Celda 002', 'GENERAL', 'ACTIVE', 2),
  ('00000000-0000-0000-0000-000000000001', 'C003', 'Celda 003', 'GENERAL', 'ACTIVE', 3),
  ('00000000-0000-0000-0000-000000000001', 'C004', 'Celda 004', 'GENERAL', 'ACTIVE', 4),
  ('00000000-0000-0000-0000-000000000001', 'C005', 'Celda 005', 'GENERAL', 'ACTIVE', 5),
  ('00000000-0000-0000-0000-000000000001', 'C006', 'Celda 006', 'GENERAL', 'ACTIVE', 6),
  ('00000000-0000-0000-0000-000000000001', 'C007', 'Celda 007', 'GENERAL', 'ACTIVE', 7),
  ('00000000-0000-0000-0000-000000000001', 'C008', 'Celda 008', 'GENERAL', 'ACTIVE', 8),
  ('00000000-0000-0000-0000-000000000001', 'C009', 'Celda 009', 'GENERAL', 'ACTIVE', 9),
  ('00000000-0000-0000-0000-000000000001', 'C010', 'Celda 010', 'GENERAL', 'ACTIVE', 10),
  ('00000000-0000-0000-0000-000000000001', 'C011', 'Celda 011', 'GENERAL', 'ACTIVE', 11),
  ('00000000-0000-0000-0000-000000000001', 'C012', 'Celda 012', 'GENERAL', 'ACTIVE', 12),
  ('00000000-0000-0000-0000-000000000001', 'C013', 'Celda 013', 'GENERAL', 'ACTIVE', 13),
  ('00000000-0000-0000-0000-000000000001', 'C014', 'Celda 014', 'GENERAL', 'ACTIVE', 14),
  ('00000000-0000-0000-0000-000000000001', 'C015', 'Celda 015', 'GENERAL', 'ACTIVE', 15),
  ('00000000-0000-0000-0000-000000000001', 'C016', 'Celda 016', 'GENERAL', 'ACTIVE', 16),
  ('00000000-0000-0000-0000-000000000001', 'C017', 'Celda 017', 'GENERAL', 'ACTIVE', 17),
  ('00000000-0000-0000-0000-000000000001', 'C018', 'Celda 018', 'GENERAL', 'ACTIVE', 18),
  ('00000000-0000-0000-0000-000000000001', 'C019', 'Celda 019', 'GENERAL', 'ACTIVE', 19),
  ('00000000-0000-0000-0000-000000000001', 'C020', 'Celda 020', 'GENERAL', 'ACTIVE', 20)
ON CONFLICT (company_id, code) DO NOTHING;

-- ============================================================================
-- Indexes
-- ============================================================================

-- app_user
CREATE INDEX IF NOT EXISTS idx_users_company_id ON app_user(company_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_companies_slug_idx ON companies(slug) WHERE slug IS NOT NULL;

-- vehicle
CREATE INDEX IF NOT EXISTS idx_vehicles_plate ON vehicle(plate);
CREATE INDEX IF NOT EXISTS idx_vehicles_company_id ON vehicle(company_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_vehicle_type_id ON vehicle(vehicle_type_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_company_plate ON vehicle(company_id, plate);
CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicle_plate_company ON vehicle(plate, company_id);

-- parking_session
CREATE INDEX IF NOT EXISTS idx_parking_sessions_vehicle_id ON parking_session(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_parking_sessions_status ON parking_session(status);
CREATE INDEX IF NOT EXISTS idx_parking_sessions_entry_at ON parking_session(entry_at);
CREATE INDEX IF NOT EXISTS idx_parking_sessions_exit_at ON parking_session(exit_at);
CREATE INDEX IF NOT EXISTS idx_parking_sessions_company_id ON parking_session(company_id);
CREATE INDEX IF NOT EXISTS idx_parking_sessions_company_status ON parking_session(company_id, status);
CREATE INDEX IF NOT EXISTS idx_parking_session_plate ON parking_session(plate) WHERE plate IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_parking_session_active_company_plate
ON parking_session(company_id, plate)
WHERE status = 'ACTIVE' AND plate IS NOT NULL AND company_id IS NOT NULL;

-- payment
CREATE INDEX IF NOT EXISTS idx_payments_session_id ON payment(session_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payment(created_at);
CREATE INDEX IF NOT EXISTS idx_payments_company_id ON payment(company_id);

-- cash_register
CREATE INDEX IF NOT EXISTS idx_cash_registers_site_id ON cash_register(site_id);

-- cash_movement
CREATE INDEX IF NOT EXISTS idx_cash_movements_cash_session_id ON cash_movement(cash_session_id);
CREATE INDEX IF NOT EXISTS idx_cash_movements_created_at ON cash_movement(created_at);
CREATE INDEX IF NOT EXISTS idx_cash_movement_company ON cash_movement(company_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_cash_movement_idempotency ON cash_movement(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- cash_session
CREATE INDEX IF NOT EXISTS idx_cash_session_company ON cash_session(company_id);
CREATE INDEX IF NOT EXISTS idx_cash_session_register_status ON cash_session(cash_register_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS uq_cash_session_one_open_per_register
    ON cash_session(cash_register_id)
    WHERE status = 'OPEN';

-- global_audit_log
CREATE INDEX IF NOT EXISTS idx_audit_logs_company_id ON global_audit_log(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON global_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON global_audit_log(created_at);

-- printers: solo un default por site
CREATE UNIQUE INDEX IF NOT EXISTS printers_unique_default_per_site
    ON printers (site_id)
    WHERE is_default = TRUE;

-- monthly_contract
CREATE INDEX IF NOT EXISTS idx_monthly_contract_company ON monthly_contract(company_id);
CREATE INDEX IF NOT EXISTS idx_monthly_contract_plate ON monthly_contract(plate);
CREATE INDEX IF NOT EXISTS idx_monthly_contract_active ON monthly_contract(company_id, is_active) WHERE is_active = TRUE;

-- agreement
CREATE INDEX IF NOT EXISTS idx_agreement_company_active ON agreement(company_id, is_active) WHERE is_active = TRUE;

-- prepaid_balance
CREATE INDEX IF NOT EXISTS idx_prepaid_balance_company ON prepaid_balance(company_id);
CREATE INDEX IF NOT EXISTS idx_prepaid_balance_plate ON prepaid_balance(plate);

-- auth_sessions
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_active ON auth_sessions(user_id, active) WHERE active = TRUE;

-- sync_events
CREATE INDEX IF NOT EXISTS idx_sync_events_company_synced ON sync_events(company_id, synced_at) WHERE synced_at IS NULL;

-- company_settings_snapshot
CREATE INDEX IF NOT EXISTS idx_company_settings_snapshot_company ON company_settings_snapshot(company_id);

-- parking_space
CREATE INDEX IF NOT EXISTS idx_parking_space_company_status ON parking_space(company_id, status);
CREATE INDEX IF NOT EXISTS idx_parking_space_company_sort ON parking_space(company_id, sort_order);

-- parking_space_assignment
CREATE INDEX IF NOT EXISTS idx_parking_space_assignment_company_active ON parking_space_assignment(company_id, status, released_at);
CREATE INDEX IF NOT EXISTS idx_parking_space_assignment_space_active ON parking_space_assignment(parking_space_id, status, released_at);
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_space_assignment
  ON parking_space_assignment(parking_space_id)
  WHERE released_at IS NULL;

-- custodied_item
CREATE INDEX IF NOT EXISTS idx_custodied_item_session ON custodied_item(session_id);
CREATE INDEX IF NOT EXISTS idx_custodied_item_status ON custodied_item(status);
CREATE INDEX IF NOT EXISTS idx_custodied_item_type ON custodied_item(item_type);
CREATE INDEX IF NOT EXISTS idx_custodied_item_company ON custodied_item(company_id);


-- V002
ALTER TABLE payment_methods ADD COLUMN company_id UUID;
ALTER TABLE payment_methods ADD CONSTRAINT fk_payment_methods_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

-- V003
ALTER TABLE printers ADD COLUMN company_id UUID;
ALTER TABLE printers ADD CONSTRAINT fk_printers_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

-- V004
ALTER TABLE rate ALTER COLUMN applies_days_bitmap TYPE INTEGER;

-- V005
ALTER TABLE auth_audit_log DROP CONSTRAINT auth_audit_log_user_id_fkey;
ALTER TABLE auth_audit_log ADD CONSTRAINT auth_audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES app_user(id) ON DELETE CASCADE;

-- V006
CREATE TABLE IF NOT EXISTS onboarding_question_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    step_number INTEGER NOT NULL UNIQUE,
    title VARCHAR(200) NOT NULL,
    description VARCHAR(500),
    enabled BOOLEAN NOT NULL DEFAULT true,
    required BOOLEAN NOT NULL DEFAULT false,
    plan_restricted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
