-- ============================================================================
-- V1: Initial Schema - Generated from Hibernate entity model
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. Core & Configuration Tables
-- ============================================================================

CREATE TABLE app_user (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    document VARCHAR(255),
    phone VARCHAR(255),
    role VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    password_changed_at TIMESTAMPTZ,
    last_access_at TIMESTAMPTZ,
    site VARCHAR(255),
    terminal VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    can_void_tickets BOOLEAN DEFAULT FALSE NOT NULL,
    can_reprint_tickets BOOLEAN DEFAULT FALSE NOT NULL,
    can_close_cash BOOLEAN DEFAULT FALSE NOT NULL,
    require_password_change BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE TABLE auth_audit_log (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    action VARCHAR(255) NOT NULL,
    user_id uuid,
    device_pk uuid,
    outcome VARCHAR(255) NOT NULL,
    metadata_json TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
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
    revoked_at TIMESTAMPTZ
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
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE TABLE cash_audit_log (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    cash_session_id uuid,
    cash_movement_id uuid,
    action VARCHAR(80) NOT NULL,
    actor_user_id UUID NOT NULL,
    terminal_id VARCHAR(80),
    client_ip VARCHAR(64),
    old_value TEXT,
    new_value TEXT,
    reason TEXT,
    metadata TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
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
    generated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE TABLE cash_movement (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    cash_session_id UUID NOT NULL,
    movement_type VARCHAR(40) NOT NULL,
    payment_method VARCHAR(20) NOT NULL,
    amount NUMERIC(14,2) NOT NULL,
    parking_session_id uuid,
    status VARCHAR(20) DEFAULT 'POSTED'::VARCHAR NOT NULL,
    terminal VARCHAR(80),
    reason TEXT,
    metadata TEXT,
    external_reference VARCHAR(120),
    idempotency_key VARCHAR(120),
    voided_at TIMESTAMPTZ,
    voided_by_id uuid,
    void_reason TEXT,
    created_by_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE TABLE cash_register (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    site VARCHAR(80) NOT NULL,
    terminal VARCHAR(80) NOT NULL,
    site_id uuid,
    code VARCHAR(20),
    label VARCHAR(120),
    name VARCHAR(120),
    printer_id uuid,
    responsible_user_id uuid,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE TABLE cash_session (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    cash_register_id UUID NOT NULL,
    operator_id UUID NOT NULL,
    status VARCHAR(20) NOT NULL,
    opening_amount NUMERIC(14,2) DEFAULT 0 NOT NULL,
    opened_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    closed_at TIMESTAMPTZ,
    closed_by_id uuid,
    expected_amount NUMERIC(14,2),
    counted_amount NUMERIC(14,2),
    difference_amount NUMERIC(14,2),
    count_cash NUMERIC(14,2),
    count_card NUMERIC(14,2),
    count_transfer NUMERIC(14,2),
    count_other NUMERIC(14,2),
    notes TEXT,
    closing_notes TEXT,
    counted_at TIMESTAMPTZ,
    count_operator_id uuid,
    open_idempotency_key VARCHAR(120),
    close_idempotency_key VARCHAR(120),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
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
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
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
    updated_at TIMESTAMPTZ
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
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE TABLE license_audit_log (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    company_id UUID NOT NULL,
    device_id uuid,
    action VARCHAR(50) NOT NULL,
    description TEXT,
    old_value TEXT,
    new_value TEXT,
    ip_address VARCHAR(50),
    session_id VARCHAR(100),
    performed_by VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE TABLE license_block_events (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    company_id UUID NOT NULL,
    device_id uuid,
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
    FALSE_positive BOOLEAN DEFAULT FALSE,
    resolved BOOLEAN DEFAULT FALSE NOT NULL,
    resolved_at TIMESTAMPTZ,
    resolved_by VARCHAR(100),
    resolution_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
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
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE TABLE master_vehicle_type (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    code VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    requires_plate BOOLEAN DEFAULT TRUE NOT NULL,
    requires_photo BOOLEAN DEFAULT FALSE NOT NULL,
    display_order INT DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE TABLE operation_idempotency (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    idempotency_key VARCHAR(200) NOT NULL,
    operation_type VARCHAR(32) NOT NULL,
    session_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE TABLE operational_parameters (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    site_id UUID NOT NULL,
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
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE TABLE parking_parameters (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    site_code VARCHAR(255) NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE TABLE parking_session (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    ticket_number VARCHAR(255) NOT NULL,
    plate VARCHAR(16) NOT NULL,
    vehicle_id UUID NOT NULL,
    rate_id uuid,
    entry_operator_id uuid,
    exit_operator_id uuid,
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
    site VARCHAR(255),
    lane VARCHAR(255),
    booth VARCHAR(255),
    terminal VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
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
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE TABLE password_reset_tokens (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    user_id UUID NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    ip_address VARCHAR(255),
    used BOOLEAN DEFAULT FALSE NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE payment (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    session_id UUID NOT NULL,
    method VARCHAR(255) NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    paid_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE TABLE payment_methods (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    requires_reference BOOLEAN DEFAULT FALSE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    display_order INT DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE TABLE print_attempts (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    print_job_id UUID NOT NULL,
    attempt_key VARCHAR(255) NOT NULL,
    status VARCHAR(255) DEFAULT 'CREATED'::VARCHAR NOT NULL,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE TABLE print_jobs (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    session_id UUID NOT NULL,
    created_by_user_id uuid,
    document_type VARCHAR(255) NOT NULL,
    idempotency_key VARCHAR(255) NOT NULL,
    payload_hash VARCHAR(255) NOT NULL,
    status VARCHAR(255) DEFAULT 'CREATED'::VARCHAR NOT NULL,
    terminal_id VARCHAR(80),
    ticket_snapshot_json TEXT,
    attempts INT DEFAULT 0 NOT NULL,
    last_error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
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
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE TABLE rate (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
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
    site VARCHAR(255) DEFAULT NULL,
    site_id uuid,
    base_value NUMERIC(10,2) DEFAULT 0 NOT NULL,
    base_minutes INT DEFAULT 0 NOT NULL,
    additional_value NUMERIC(10,2) DEFAULT 0 NOT NULL,
    additional_minutes INT DEFAULT 0 NOT NULL,
    max_daily_value NUMERIC(10,2),
    applies_night BOOLEAN DEFAULT FALSE NOT NULL,
    applies_holiday BOOLEAN DEFAULT FALSE NOT NULL,
    window_start TIME,
    window_end TIME,
    scheduled_active_from TIMESTAMPTZ,
    scheduled_active_to TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
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
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE TABLE session_event (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    session_id UUID NOT NULL,
    type VARCHAR(255) NOT NULL,
    actor_user_id uuid,
    metadata TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE TABLE sync_events (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
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
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE TABLE ticket_counter (
    counter_key VARCHAR(255) NOT NULL,
    last_number INT DEFAULT 0 NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE TABLE vehicle (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    plate VARCHAR(255) NOT NULL,
    type VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE TABLE vehicle_condition_report (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    session_id UUID NOT NULL,
    stage VARCHAR(255) NOT NULL,
    observations VARCHAR(255),
    checklist_json TEXT,
    photo_urls_json TEXT,
    created_by_id uuid,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
ALTER TABLE app_user
    ADD CONSTRAINT app_user_email_key UNIQUE (email);
ALTER TABLE app_user
    ADD CONSTRAINT app_user_pkey PRIMARY KEY (id);
ALTER TABLE auth_audit_log
    ADD CONSTRAINT auth_audit_log_pkey PRIMARY KEY (id);
ALTER TABLE auth_sessions
    ADD CONSTRAINT auth_sessions_pkey PRIMARY KEY (id);
ALTER TABLE auth_sessions
    ADD CONSTRAINT auth_sessions_refresh_jti_key UNIQUE (refresh_jti);
ALTER TABLE auth_sessions
    ADD CONSTRAINT auth_sessions_refresh_token_hash_key UNIQUE (refresh_token_hash);
ALTER TABLE authorized_devices
    ADD CONSTRAINT authorized_devices_device_id_key UNIQUE (device_id);
ALTER TABLE authorized_devices
    ADD CONSTRAINT authorized_devices_pkey PRIMARY KEY (id);
ALTER TABLE cash_audit_log
    ADD CONSTRAINT cash_audit_log_pkey PRIMARY KEY (id);
ALTER TABLE cash_closing_report
    ADD CONSTRAINT cash_closing_report_cash_session_id_key UNIQUE (cash_session_id);
ALTER TABLE cash_closing_report
    ADD CONSTRAINT cash_closing_report_pkey PRIMARY KEY (id);
ALTER TABLE cash_movement
    ADD CONSTRAINT cash_movement_pkey PRIMARY KEY (id);
ALTER TABLE cash_register
    ADD CONSTRAINT cash_register_pkey PRIMARY KEY (id);
ALTER TABLE cash_register
    ADD CONSTRAINT cash_register_site_terminal_key UNIQUE (site, terminal);
ALTER TABLE cash_session
    ADD CONSTRAINT cash_session_pkey PRIMARY KEY (id);
ALTER TABLE companies
    ADD CONSTRAINT companies_nit_key UNIQUE (nit);
ALTER TABLE companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);
ALTER TABLE company_modules
    ADD CONSTRAINT company_modules_company_id_module_type_key UNIQUE (company_id, module_type);
ALTER TABLE company_modules
    ADD CONSTRAINT company_modules_pkey PRIMARY KEY (id);
ALTER TABLE devices
    ADD CONSTRAINT devices_pkey PRIMARY KEY (id);
ALTER TABLE license_audit_log
    ADD CONSTRAINT license_audit_log_pkey PRIMARY KEY (id);
ALTER TABLE license_block_events
    ADD CONSTRAINT license_block_events_pkey PRIMARY KEY (id);
ALTER TABLE licensed_devices
    ADD CONSTRAINT licensed_devices_device_fingerprint_key UNIQUE (device_fingerprint);
ALTER TABLE licensed_devices
    ADD CONSTRAINT licensed_devices_pkey PRIMARY KEY (id);
ALTER TABLE master_vehicle_type
    ADD CONSTRAINT master_vehicle_type_code_key UNIQUE (code);
ALTER TABLE master_vehicle_type
    ADD CONSTRAINT master_vehicle_type_pkey PRIMARY KEY (id);
ALTER TABLE operation_idempotency
    ADD CONSTRAINT operation_idempotency_idempotency_key_key UNIQUE (idempotency_key);
ALTER TABLE operation_idempotency
    ADD CONSTRAINT operation_idempotency_pkey PRIMARY KEY (id);
ALTER TABLE operational_parameters
    ADD CONSTRAINT operational_parameters_pkey PRIMARY KEY (id);
ALTER TABLE operational_parameters
    ADD CONSTRAINT operational_parameters_site_id_key UNIQUE (site_id);
ALTER TABLE parking_parameters
    ADD CONSTRAINT parking_parameters_pkey PRIMARY KEY (id);
ALTER TABLE parking_parameters
    ADD CONSTRAINT parking_parameters_site_code_key UNIQUE (site_code);
ALTER TABLE parking_session
    ADD CONSTRAINT parking_session_pkey PRIMARY KEY (id);
ALTER TABLE parking_session
    ADD CONSTRAINT parking_session_ticket_number_key UNIQUE (ticket_number);
ALTER TABLE parking_sites
    ADD CONSTRAINT parking_sites_code_key UNIQUE (code);
ALTER TABLE parking_sites
    ADD CONSTRAINT parking_sites_pkey PRIMARY KEY (id);
ALTER TABLE password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);
ALTER TABLE password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_hash_key UNIQUE (token_hash);
ALTER TABLE payment_methods
    ADD CONSTRAINT payment_methods_code_key UNIQUE (code);
ALTER TABLE payment_methods
    ADD CONSTRAINT payment_methods_pkey PRIMARY KEY (id);
ALTER TABLE payment
    ADD CONSTRAINT payment_pkey PRIMARY KEY (id);
ALTER TABLE payment
    ADD CONSTRAINT payment_session_id_key UNIQUE (session_id);
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
ALTER TABLE rate
    ADD CONSTRAINT rate_pkey PRIMARY KEY (id);
ALTER TABLE session_event
    ADD CONSTRAINT session_event_pkey PRIMARY KEY (id);
ALTER TABLE sync_events
    ADD CONSTRAINT sync_events_idempotency_key_key UNIQUE (idempotency_key);
ALTER TABLE sync_events
    ADD CONSTRAINT sync_events_pkey PRIMARY KEY (id);
ALTER TABLE ticket_counter
    ADD CONSTRAINT ticket_counter_pkey PRIMARY KEY (counter_key);
ALTER TABLE vehicle_condition_report
    ADD CONSTRAINT vehicle_condition_report_pkey PRIMARY KEY (id);
ALTER TABLE vehicle
    ADD CONSTRAINT vehicle_pkey PRIMARY KEY (id);
ALTER TABLE vehicle
    ADD CONSTRAINT vehicle_plate_key UNIQUE (plate);
CREATE INDEX idx_app_user_email ON app_user USING btree (email);
CREATE INDEX idx_cash_closing_session ON cash_closing_report USING btree (cash_session_id);
CREATE INDEX idx_cash_movement_session ON cash_movement USING btree (cash_session_id);
CREATE INDEX idx_cash_register_site ON cash_register USING btree (site);
CREATE INDEX idx_companies_operation_mode ON companies USING btree (operation_mode);
CREATE INDEX idx_company_modules_company ON company_modules USING btree (company_id);
CREATE INDEX idx_license_audit_company ON license_audit_log USING btree (company_id);
CREATE INDEX idx_license_block_company ON license_block_events USING btree (company_id);
CREATE INDEX idx_license_block_resolved ON license_block_events USING btree (resolved);
CREATE INDEX idx_licensed_devices_company ON licensed_devices USING btree (company_id);
CREATE INDEX idx_licensed_devices_fingerprint ON licensed_devices USING btree (device_fingerprint);
CREATE INDEX idx_operation_idempotency_key ON operation_idempotency USING btree (idempotency_key);
CREATE INDEX idx_parking_session_plate ON parking_session USING btree (plate);
CREATE INDEX idx_parking_session_status ON parking_session USING btree (status);
CREATE INDEX idx_parking_sites_active ON parking_sites USING btree (is_active);
CREATE INDEX idx_parking_sites_company ON parking_sites USING btree (company_id);
CREATE INDEX idx_password_reset_user ON password_reset_tokens USING btree (user_id);
CREATE INDEX idx_payment_methods_active ON payment_methods USING btree (is_active);
CREATE INDEX idx_print_attempts_job ON print_attempts USING btree (print_job_id);
CREATE INDEX idx_print_jobs_session ON print_jobs USING btree (session_id);
CREATE INDEX idx_print_jobs_status ON print_jobs USING btree (status);
CREATE INDEX idx_rate_active ON rate USING btree (is_active);
CREATE INDEX idx_sync_events_idempotency ON sync_events USING btree (idempotency_key);
CREATE INDEX idx_vehicle_condition_session ON vehicle_condition_report USING btree (session_id);
ALTER TABLE auth_audit_log
    ADD CONSTRAINT auth_audit_log_device_pk_fkey FOREIGN KEY (device_pk) REFERENCES authorized_devices(id);
ALTER TABLE auth_audit_log
    ADD CONSTRAINT auth_audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES app_user(id);
ALTER TABLE auth_sessions
    ADD CONSTRAINT auth_sessions_device_pk_fkey FOREIGN KEY (device_pk) REFERENCES authorized_devices(id);
ALTER TABLE auth_sessions
    ADD CONSTRAINT auth_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES app_user(id);
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
ALTER TABLE cash_session
    ADD CONSTRAINT cash_session_operator_id_fkey FOREIGN KEY (operator_id) REFERENCES app_user(id);
ALTER TABLE company_modules
    ADD CONSTRAINT company_modules_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
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
ALTER TABLE operation_idempotency
    ADD CONSTRAINT operation_idempotency_session_id_fkey FOREIGN KEY (session_id) REFERENCES parking_session(id) ON DELETE CASCADE;
ALTER TABLE operational_parameters
    ADD CONSTRAINT operational_parameters_site_id_fkey FOREIGN KEY (site_id) REFERENCES parking_sites(id) ON DELETE CASCADE;
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
ALTER TABLE vehicle_condition_report
    ADD CONSTRAINT vehicle_condition_report_created_by_id_fkey FOREIGN KEY (created_by_id) REFERENCES app_user(id);
ALTER TABLE vehicle_condition_report
    ADD CONSTRAINT vehicle_condition_report_session_id_fkey FOREIGN KEY (session_id) REFERENCES parking_session(id) ON DELETE CASCADE;

-- 5. Seed Data
-- ============================================================================

-- Default company
INSERT INTO companies (id, name, legal_name, nit, email, status, max_devices, max_users, max_locations)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Empresa Demo',
    'Empresa Demo S.A.S.',
    '900123456',
    'admin@parkflow.local',
    'ACTIVE',
    10,
    50,
    5
) ON CONFLICT (id) DO NOTHING;

-- Default parking site
INSERT INTO parking_sites (id, company_id, code, name, city, timezone, currency)
VALUES (
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'DEFAULT',
    'Sede Principal',
    'Bogotá',
    'America/Bogota',
    'COP'
) ON CONFLICT (id) DO NOTHING;

-- Payment methods
INSERT INTO payment_methods (code, name, requires_reference, display_order) VALUES
    ('CASH', 'Efectivo', FALSE, 1),
    ('DEBIT_CARD', 'Tarjeta débito', TRUE, 2),
    ('CREDIT_CARD', 'Tarjeta crédito', TRUE, 3),
    ('QR', 'QR', TRUE, 4),
    ('NEQUI', 'Nequi', TRUE, 5),
    ('DAVIPLATA', 'Daviplata', TRUE, 6),
    ('TRANSFER', 'Transferencia', TRUE, 7),
    ('AGREEMENT', 'Convenio', TRUE, 8),
    ('INTERNAL_CREDIT', 'Crédito interno', TRUE, 9),
    ('MIXED', 'Mixto', TRUE, 10),
    ('CARD', 'Datáfono / tarjeta legacy', TRUE, 11),
    ('OTHER', 'Otro', TRUE, 12)
ON CONFLICT (code) DO NOTHING;

-- Vehicle types
INSERT INTO master_vehicle_type (code, name, is_active, requires_plate, requires_photo, display_order) VALUES
    ('CAR', 'Automóvil', TRUE, TRUE, FALSE, 1),
    ('MOTORCYCLE', 'Motocicleta', TRUE, TRUE, TRUE, 2),
    ('VAN', 'Camioneta', TRUE, TRUE, FALSE, 3),
    ('TRUCK', 'Camión', TRUE, TRUE, FALSE, 4),
    ('OTHER', 'Otro', TRUE, FALSE, FALSE, 5)
ON CONFLICT (code) DO NOTHING;

-- Default rates (one per vehicle type + comodín global, site=NULL = cualquier sede)
INSERT INTO rate (name, vehicle_type, rate_type, amount, grace_minutes, fraction_minutes, site, max_daily_value)
SELECT 'Tarifa Genérica Auto', 'CAR', 'HOURLY', 2000, 5, 60, NULL, 20000
WHERE NOT EXISTS (SELECT 1 FROM rate WHERE vehicle_type = 'CAR');

INSERT INTO rate (name, vehicle_type, rate_type, amount, grace_minutes, fraction_minutes, site, max_daily_value)
SELECT 'Tarifa Genérica Moto', 'MOTORCYCLE', 'HOURLY', 1000, 5, 60, NULL, 10000
WHERE NOT EXISTS (SELECT 1 FROM rate WHERE vehicle_type = 'MOTORCYCLE');

INSERT INTO rate (name, vehicle_type, rate_type, amount, grace_minutes, fraction_minutes, site, max_daily_value)
SELECT 'Tarifa Genérica Camioneta', 'VAN', 'HOURLY', 3000, 5, 60, NULL, 30000
WHERE NOT EXISTS (SELECT 1 FROM rate WHERE vehicle_type = 'VAN');

INSERT INTO rate (name, vehicle_type, rate_type, amount, grace_minutes, fraction_minutes, site, max_daily_value)
SELECT 'Tarifa Genérica Camión', 'TRUCK', 'HOURLY', 5000, 5, 60, NULL, 50000
WHERE NOT EXISTS (SELECT 1 FROM rate WHERE vehicle_type = 'TRUCK');

INSERT INTO rate (name, vehicle_type, rate_type, amount, grace_minutes, fraction_minutes, site, max_daily_value)
SELECT 'Tarifa Genérica Otro', 'OTHER', 'HOURLY', 2000, 5, 60, NULL, 20000
WHERE NOT EXISTS (SELECT 1 FROM rate WHERE vehicle_type = 'OTHER');

INSERT INTO rate (name, vehicle_type, rate_type, amount, grace_minutes, fraction_minutes, site, max_daily_value)
SELECT 'Tarifa Genérica (comodín)', NULL, 'HOURLY', 2000, 5, 60, NULL, 20000
WHERE NOT EXISTS (SELECT 1 FROM rate WHERE vehicle_type IS NULL AND site IS NULL);

-- Default admin user (password: Qwert.12345 - hashed with BCrypt)
INSERT INTO app_user (id, name, email, role, password_hash, is_active, can_void_tickets, can_reprint_tickets, can_close_cash, require_password_change)
VALUES (
    '00000000-0000-0000-0000-000000000003',
    'Administrador',
    'admin@parkflow.local',
    'SUPER_ADMIN',
    '$2b$12$bU4bjxtQIMHP/us3972HTuIz.OM2128W34BtysTTH1AeqjInkGcRe',
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    FALSE
) ON CONFLICT (email) DO NOTHING;

-- Default operational parameters
INSERT INTO operational_parameters (site_id, allow_entry_without_printer, allow_exit_without_payment, allow_reprint, allow_void, require_photo_entry, require_photo_exit, tolerance_minutes, max_time_no_charge, offline_mode_enabled)
VALUES (
    '00000000-0000-0000-0000-000000000002',
    FALSE,
    FALSE,
    TRUE,
    TRUE,
    FALSE,
    FALSE,
    5,
    15,
    TRUE
) ON CONFLICT (site_id) DO NOTHING;
