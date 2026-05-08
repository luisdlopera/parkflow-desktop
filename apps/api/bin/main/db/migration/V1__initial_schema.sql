-- ============================================================================
-- V1: Initial Schema - Cohesive Core and Operational Structure
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. Core & Configuration Tables
-- ============================================================================

CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    legal_name VARCHAR(200),
    nit VARCHAR(20) UNIQUE,
    email VARCHAR(200),
    phone VARCHAR(50),
    city VARCHAR(100),
    address VARCHAR(300),
    contact_name VARCHAR(150),
    operation_mode VARCHAR(20) NOT NULL DEFAULT 'OFFLINE',
    plan VARCHAR(20) NOT NULL DEFAULT 'LOCAL',
    status VARCHAR(20) NOT NULL DEFAULT 'TRIAL',
    max_devices INT DEFAULT 1,
    max_locations INT DEFAULT 1,
    max_users INT DEFAULT 5,
    trial_days INT DEFAULT 14,
    offline_lease_hours INT DEFAULT 48,
    offline_mode_allowed BOOLEAN DEFAULT TRUE,
    allow_sync BOOLEAN NOT NULL DEFAULT TRUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
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
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE parking_sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL,
    address VARCHAR(300),
    city VARCHAR(100),
    phone VARCHAR(50),
    manager_name VARCHAR(150),
    timezone VARCHAR(50) NOT NULL DEFAULT 'America/Bogota',
    currency VARCHAR(10) NOT NULL DEFAULT 'COP',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE app_user (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(120) NOT NULL,
    email VARCHAR(180) NOT NULL UNIQUE,
    document VARCHAR(32),
    phone VARCHAR(40),
    role VARCHAR(20) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    password_changed_at TIMESTAMPTZ,
    last_access_at TIMESTAMPTZ,
    site VARCHAR(80),
    terminal VARCHAR(80),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    can_void_tickets BOOLEAN NOT NULL DEFAULT FALSE,
    can_reprint_tickets BOOLEAN NOT NULL DEFAULT FALSE,
    can_close_cash BOOLEAN NOT NULL DEFAULT FALSE,
    require_password_change BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE printers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID NOT NULL REFERENCES parking_sites(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    type VARCHAR(20) NOT NULL,
    connection VARCHAR(20) NOT NULL,
    paper_width_mm INT NOT NULL DEFAULT 80,
    endpoint_or_device VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE operational_parameters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID NOT NULL UNIQUE REFERENCES parking_sites(id) ON DELETE CASCADE,
    allow_entry_without_printer BOOLEAN NOT NULL DEFAULT FALSE,
    allow_exit_without_payment BOOLEAN NOT NULL DEFAULT FALSE,
    allow_reprint BOOLEAN NOT NULL DEFAULT TRUE,
    allow_void BOOLEAN NOT NULL DEFAULT TRUE,
    require_photo_entry BOOLEAN NOT NULL DEFAULT FALSE,
    require_photo_exit BOOLEAN NOT NULL DEFAULT FALSE,
    tolerance_minutes INT NOT NULL DEFAULT 0,
    max_time_no_charge INT NOT NULL DEFAULT 0,
    legal_message TEXT,
    offline_mode_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE vehicle (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plate VARCHAR(16) NOT NULL UNIQUE,
    type VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE master_vehicle_type (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    requires_plate BOOLEAN NOT NULL DEFAULT TRUE,
    requires_photo BOOLEAN NOT NULL DEFAULT FALSE,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE rate (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(120) NOT NULL,
    vehicle_type VARCHAR(20),
    rate_type VARCHAR(20) NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    grace_minutes INT NOT NULL DEFAULT 0,
    tolerance_minutes INT NOT NULL DEFAULT 0,
    fraction_minutes INT NOT NULL DEFAULT 60,
    rounding_mode VARCHAR(20) NOT NULL DEFAULT 'UP',
    lost_ticket_surcharge NUMERIC(10,2) NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    site VARCHAR(80) NOT NULL DEFAULT 'DEFAULT',
    site_id UUID REFERENCES parking_sites(id),
    base_value NUMERIC(10,2) NOT NULL DEFAULT 0,
    base_minutes INT NOT NULL DEFAULT 0,
    additional_value NUMERIC(10,2) NOT NULL DEFAULT 0,
    additional_minutes INT NOT NULL DEFAULT 0,
    max_daily_value NUMERIC(10,2),
    applies_night BOOLEAN NOT NULL DEFAULT FALSE,
    applies_holiday BOOLEAN NOT NULL DEFAULT FALSE,
    window_start TIME,
    window_end TIME,
    scheduled_active_from TIMESTAMPTZ,
    scheduled_active_to TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE rate_fractions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rate_id UUID NOT NULL REFERENCES rate(id) ON DELETE CASCADE,
    from_minute INT NOT NULL,
    to_minute INT NOT NULL,
    fraction_value NUMERIC(10,2) NOT NULL,
    round_up BOOLEAN NOT NULL DEFAULT TRUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    requires_reference BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 2. Security & Auth Tables
-- ============================================================================

CREATE TABLE authorized_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(255) NOT NULL,
    platform VARCHAR(255) NOT NULL,
    fingerprint VARCHAR(255) NOT NULL,
    authorized BOOLEAN NOT NULL DEFAULT TRUE,
    revoked_at TIMESTAMPTZ,
    last_seen_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE auth_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES app_user(id),
    device_pk UUID NOT NULL REFERENCES authorized_devices(id),
    refresh_token_hash VARCHAR(255) NOT NULL UNIQUE,
    refresh_jti VARCHAR(255) NOT NULL UNIQUE,
    refresh_expires_at TIMESTAMPTZ NOT NULL,
    access_expires_at TIMESTAMPTZ NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ
);

CREATE TABLE auth_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action VARCHAR(255) NOT NULL,
    user_id UUID REFERENCES app_user(id),
    device_pk UUID REFERENCES authorized_devices(id),
    outcome VARCHAR(255) NOT NULL,
    metadata_json TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 3. Operational Tables (Parking & Cash)
-- ============================================================================

CREATE TABLE cash_register (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site VARCHAR(80) NOT NULL,
    terminal VARCHAR(80) NOT NULL,
    site_id UUID REFERENCES parking_sites(id),
    code VARCHAR(20),
    label VARCHAR(120),
    name VARCHAR(120),
    printer_id UUID REFERENCES printers(id),
    responsible_user_id UUID REFERENCES app_user(id),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(site, terminal)
);

CREATE TABLE cash_session (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cash_register_id UUID NOT NULL REFERENCES cash_register(id),
    operator_id UUID NOT NULL REFERENCES app_user(id),
    status VARCHAR(20) NOT NULL,
    opening_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    closed_by_id UUID REFERENCES app_user(id),
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
    count_operator_id UUID REFERENCES app_user(id),
    open_idempotency_key VARCHAR(120),
    close_idempotency_key VARCHAR(120),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE parking_session (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number VARCHAR(255) NOT NULL UNIQUE,
    plate VARCHAR(16) NOT NULL,
    vehicle_id UUID NOT NULL REFERENCES vehicle(id),
    rate_id UUID REFERENCES rate(id),
    entry_operator_id UUID REFERENCES app_user(id),
    exit_operator_id UUID REFERENCES app_user(id),
    entry_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    exit_at TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL,
    sync_status VARCHAR(20) NOT NULL,
    entry_notes VARCHAR(255),
    exit_notes VARCHAR(255),
    entry_image_url VARCHAR(255),
    exit_image_url VARCHAR(255),
    lost_ticket BOOLEAN NOT NULL DEFAULT FALSE,
    lost_ticket_reason VARCHAR(255),
    reprint_count INT NOT NULL DEFAULT 0,
    total_amount NUMERIC(10,2),
    site VARCHAR(255),
    lane VARCHAR(255),
    booth VARCHAR(255),
    terminal VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE cash_movement (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cash_session_id UUID NOT NULL REFERENCES cash_session(id),
    movement_type VARCHAR(40) NOT NULL,
    payment_method VARCHAR(20) NOT NULL,
    amount NUMERIC(14,2) NOT NULL,
    parking_session_id UUID REFERENCES parking_session(id),
    status VARCHAR(20) NOT NULL DEFAULT 'POSTED',
    terminal VARCHAR(80),
    reason TEXT,
    metadata TEXT,
    external_reference VARCHAR(120),
    idempotency_key VARCHAR(120),
    voided_at TIMESTAMPTZ,
    voided_by_id UUID REFERENCES app_user(id),
    void_reason TEXT,
    created_by_id UUID NOT NULL REFERENCES app_user(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE payment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL UNIQUE REFERENCES parking_session(id) ON DELETE CASCADE,
    method VARCHAR(20) NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 4. Indexes
-- ============================================================================

CREATE INDEX idx_parking_sites_company ON parking_sites(company_id);
CREATE INDEX idx_parking_sites_active ON parking_sites(is_active);
CREATE INDEX idx_companies_operation_mode ON companies(operation_mode);
CREATE INDEX idx_payment_methods_active ON payment_methods(is_active);
CREATE INDEX idx_cash_register_site ON cash_register(site);
CREATE INDEX idx_rate_active ON rate(is_active);
CREATE INDEX idx_app_user_email ON app_user(email);
CREATE INDEX idx_parking_session_plate ON parking_session(plate);
CREATE INDEX idx_parking_session_status ON parking_session(status);
CREATE INDEX idx_cash_movement_session ON cash_movement(cash_session_id);

-- ============================================================================
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
    ('TRANSFER', 'Transferencia', TRUE, 2),
    ('CARD', 'Datáfono', TRUE, 3),
    ('NEQUI', 'Nequi', TRUE, 4),
    ('DAVIPLATA', 'Daviplata', TRUE, 5),
    ('COURTESY', 'Cortesía', FALSE, 6),
    ('AGREEMENT', 'Convenio', TRUE, 7)
ON CONFLICT (code) DO NOTHING;

-- Vehicle types
INSERT INTO master_vehicle_type (code, name, is_active, requires_plate, requires_photo, display_order) VALUES
    ('CAR', 'Automóvil', TRUE, TRUE, FALSE, 1),
    ('MOTORCYCLE', 'Motocicleta', TRUE, TRUE, TRUE, 2),
    ('VAN', 'Camioneta', TRUE, TRUE, FALSE, 3),
    ('TRUCK', 'Camión', TRUE, TRUE, FALSE, 4),
    ('OTHER', 'Otro', TRUE, FALSE, FALSE, 5)
ON CONFLICT (code) DO NOTHING;

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
