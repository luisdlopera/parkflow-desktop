-- Consolidated schema migration - includes all previous migrations
-- This replaces V1 through V10 with a single comprehensive schema

-- Core entities
CREATE TABLE app_user (
  id UUID PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(180) NOT NULL UNIQUE,
  role VARCHAR(20) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  document VARCHAR(32),
  phone VARCHAR(40),
  site VARCHAR(80),
  terminal VARCHAR(80),
  password_hash VARCHAR(255) NOT NULL,
  password_changed_at TIMESTAMPTZ,
  last_access_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE vehicle (
  id UUID PRIMARY KEY,
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
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE rate (
  id UUID PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  vehicle_type VARCHAR(20),
  rate_type VARCHAR(20) NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  grace_minutes INT NOT NULL DEFAULT 0,
  fraction_minutes INT NOT NULL DEFAULT 60,
  rounding_mode VARCHAR(20) NOT NULL DEFAULT 'UP',
  lost_ticket_surcharge NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  site VARCHAR(80) NOT NULL DEFAULT 'DEFAULT',
  tolerance_minutes INT NOT NULL DEFAULT 0,
  window_start TIME,
  window_end TIME,
  scheduled_active_from TIMESTAMPTZ,
  scheduled_active_to TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE parking_session (
  id UUID PRIMARY KEY,
  ticket_number VARCHAR(40) NOT NULL UNIQUE,
  vehicle_id UUID NOT NULL REFERENCES vehicle(id),
  plate VARCHAR(16) NOT NULL,
  rate_id UUID REFERENCES rate(id),
  entry_operator_id UUID REFERENCES app_user(id),
  exit_operator_id UUID REFERENCES app_user(id),
  entry_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  exit_at TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  entry_notes TEXT,
  exit_notes TEXT,
  lost_ticket BOOLEAN NOT NULL DEFAULT FALSE,
  lost_ticket_reason TEXT,
  reprint_count INT NOT NULL DEFAULT 0,
  total_amount NUMERIC(10,2),
  site VARCHAR(80),
  lane VARCHAR(40),
  booth VARCHAR(40),
  terminal VARCHAR(40),
  entry_image_url TEXT,
  exit_image_url TEXT,
  sync_status VARCHAR(20) NOT NULL DEFAULT 'SYNCED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE payment (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL UNIQUE REFERENCES parking_session(id),
  method VARCHAR(20) NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE vehicle_condition_report (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES parking_session(id),
  stage VARCHAR(10) NOT NULL,
  observations TEXT,
  checklist_json TEXT,
  photo_urls_json TEXT,
  created_by_id UUID REFERENCES app_user(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE session_event (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES parking_session(id),
  type VARCHAR(30) NOT NULL,
  actor_user_id UUID REFERENCES app_user(id),
  metadata TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE ticket_counter (
  counter_key VARCHAR(16) PRIMARY KEY,
  last_number INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Print system
CREATE TABLE print_jobs (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES parking_session(id),
  document_type VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL,
  idempotency_key VARCHAR(120) NOT NULL UNIQUE,
  payload_hash VARCHAR(120) NOT NULL,
  ticket_snapshot_json TEXT,
  terminal_id VARCHAR(80),
  attempts INT NOT NULL DEFAULT 0,
  last_error TEXT,
  created_by_user_id UUID REFERENCES app_user(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE print_attempts (
  id UUID PRIMARY KEY,
  print_job_id UUID NOT NULL REFERENCES print_jobs(id),
  status VARCHAR(20) NOT NULL,
  attempt_key VARCHAR(120) NOT NULL UNIQUE,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Devices and sync
CREATE TABLE devices (
  id UUID PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  protocol VARCHAR(20) NOT NULL,
  connection_type VARCHAR(20) NOT NULL,
  usb_path VARCHAR(180),
  tcp_host VARCHAR(120),
  tcp_port INT,
  serial_port VARCHAR(80),
  baud_rate INT,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sync_events (
  id UUID PRIMARY KEY,
  idempotency_key VARCHAR(120) NOT NULL UNIQUE,
  event_type VARCHAR(40) NOT NULL,
  aggregate_id VARCHAR(80) NOT NULL,
  payload_json TEXT NOT NULL,
  direction VARCHAR(20) NOT NULL,
  user_id VARCHAR(64),
  device_id VARCHAR(180),
  session_id VARCHAR(64),
  origin VARCHAR(40) NOT NULL DEFAULT 'ONLINE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMPTZ
);

-- Auth system
CREATE TABLE authorized_devices (
  id UUID PRIMARY KEY,
  device_id VARCHAR(180) NOT NULL UNIQUE,
  display_name VARCHAR(120) NOT NULL,
  platform VARCHAR(80) NOT NULL,
  fingerprint VARCHAR(255) NOT NULL,
  authorized BOOLEAN NOT NULL DEFAULT TRUE,
  revoked_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE auth_sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES app_user(id),
  device_pk UUID NOT NULL REFERENCES authorized_devices(id),
  refresh_token_hash VARCHAR(255) NOT NULL UNIQUE,
  refresh_jti VARCHAR(120) NOT NULL UNIQUE,
  refresh_expires_at TIMESTAMPTZ NOT NULL,
  access_expires_at TIMESTAMPTZ NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

CREATE TABLE auth_audit_log (
  id UUID PRIMARY KEY,
  action VARCHAR(40) NOT NULL,
  user_id UUID REFERENCES app_user(id),
  device_pk UUID REFERENCES authorized_devices(id),
  outcome VARCHAR(40) NOT NULL,
  metadata_json TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Idempotency and constraints
CREATE TABLE operation_idempotency (
  id UUID PRIMARY KEY,
  idempotency_key VARCHAR(200) NOT NULL UNIQUE,
  operation_type VARCHAR(32) NOT NULL,
  session_id UUID NOT NULL REFERENCES parking_session(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Admin settings
CREATE TABLE parking_parameters (
  id UUID PRIMARY KEY,
  site_code VARCHAR(80) NOT NULL DEFAULT 'DEFAULT',
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cash system
CREATE TABLE cash_register (
  id UUID PRIMARY KEY,
  site VARCHAR(80) NOT NULL,
  terminal VARCHAR(80) NOT NULL,
  label VARCHAR(120),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_cash_register_site_terminal UNIQUE (site, terminal)
);

CREATE TABLE cash_session (
  id UUID PRIMARY KEY,
  cash_register_id UUID NOT NULL REFERENCES cash_register(id),
  operator_id UUID NOT NULL REFERENCES app_user(id),
  status VARCHAR(20) NOT NULL,
  opening_amount NUMERIC(14,2) NOT NULL,
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

CREATE TABLE cash_movement (
  id UUID PRIMARY KEY,
  cash_session_id UUID NOT NULL REFERENCES cash_session(id),
  movement_type VARCHAR(40) NOT NULL,
  payment_method VARCHAR(20) NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  parking_session_id UUID REFERENCES parking_session(id),
  reason TEXT,
  metadata TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'POSTED',
  voided_at TIMESTAMPTZ,
  void_reason TEXT,
  voided_by_id UUID REFERENCES app_user(id),
  external_reference VARCHAR(120),
  created_by_id UUID NOT NULL REFERENCES app_user(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  terminal VARCHAR(80),
  idempotency_key VARCHAR(120)
);

CREATE TABLE cash_closing_report (
  id UUID PRIMARY KEY,
  cash_session_id UUID NOT NULL UNIQUE REFERENCES cash_session(id),
  total_cash NUMERIC(14,2) NOT NULL,
  total_card NUMERIC(14,2) NOT NULL,
  total_transfer NUMERIC(14,2) NOT NULL,
  total_other NUMERIC(14,2) NOT NULL,
  expected_total NUMERIC(14,2) NOT NULL,
  counted_total NUMERIC(14,2) NOT NULL,
  difference NUMERIC(14,2) NOT NULL,
  observations TEXT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  generated_by_id UUID NOT NULL REFERENCES app_user(id)
);

CREATE TABLE cash_audit_log (
  id UUID PRIMARY KEY,
  cash_session_id UUID REFERENCES cash_session(id),
  cash_movement_id UUID REFERENCES cash_movement(id),
  action VARCHAR(80) NOT NULL,
  actor_user_id UUID NOT NULL REFERENCES app_user(id),
  terminal_id VARCHAR(80),
  client_ip VARCHAR(64),
  old_value TEXT,
  new_value TEXT,
  reason TEXT,
  metadata TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Password reset tokens
CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY,
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES app_user(id),
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  used_at TIMESTAMPTZ,
  ip_address VARCHAR(64)
);

CREATE INDEX idx_password_reset_tokens_hash ON password_reset_tokens(token_hash);
CREATE INDEX idx_password_reset_tokens_user ON password_reset_tokens(user_id, used, expires_at);

-- Indexes
CREATE INDEX idx_parking_session_status ON parking_session(status);
CREATE INDEX idx_parking_session_plate ON parking_session(vehicle_id, status);
CREATE INDEX idx_parking_session_plate_only ON parking_session (plate);
CREATE INDEX idx_parking_session_sync_status ON parking_session (sync_status) WHERE sync_status = 'PENDING';
CREATE INDEX idx_session_event_session ON session_event(session_id, created_at);
CREATE INDEX idx_print_jobs_session ON print_jobs(session_id, created_at DESC);
CREATE INDEX idx_print_jobs_status ON print_jobs(status, created_at);
CREATE INDEX idx_print_attempts_job ON print_attempts(print_job_id, created_at DESC);
CREATE INDEX idx_devices_enabled ON devices(is_enabled);
CREATE INDEX idx_sync_events_created ON sync_events(created_at);
CREATE INDEX idx_sync_events_synced ON sync_events(synced_at);
CREATE INDEX idx_auth_sessions_user_active ON auth_sessions(user_id, active);
CREATE INDEX idx_auth_sessions_device_active ON auth_sessions(device_pk, active);
CREATE INDEX idx_auth_audit_created_at ON auth_audit_log(created_at DESC);
CREATE INDEX idx_auth_audit_action ON auth_audit_log(action);
CREATE INDEX idx_operation_idempotency_session ON operation_idempotency (session_id);
CREATE UNIQUE INDEX ux_rate_site_active_lower_name ON rate (site, lower(btrim(name))) WHERE is_active = TRUE;
CREATE UNIQUE INDEX ux_app_user_document_lower ON app_user (lower(btrim(document))) WHERE document IS NOT NULL AND length(btrim(document)) > 0;
CREATE UNIQUE INDEX ux_parking_parameters_site ON parking_parameters (site_code);
CREATE UNIQUE INDEX uq_cash_session_open_register ON cash_session (cash_register_id) WHERE status = 'OPEN';
CREATE UNIQUE INDEX uq_cash_session_open_idempotency ON cash_session (open_idempotency_key) WHERE open_idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX uq_cash_mov_park_payment ON cash_movement (parking_session_id) WHERE movement_type = 'PARKING_PAYMENT' AND status = 'POSTED';
CREATE UNIQUE INDEX uq_cash_mov_idempotency ON cash_movement (idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX idx_cash_mov_session ON cash_movement (cash_session_id, created_at);

-- Constraints
CREATE UNIQUE INDEX ux_parking_one_active_session_per_vehicle ON parking_session (vehicle_id) WHERE status = 'ACTIVE';



-- ============================================================================
-- LICENSING MODULE - Commercial Architecture for ParkFlow
-- ============================================================================

-- Companies table - Main entity for licensing
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    nit VARCHAR(20) UNIQUE,
    address VARCHAR(300),
    city VARCHAR(100),
    phone VARCHAR(50),
    email VARCHAR(200),
    contact_name VARCHAR(150),
    plan VARCHAR(20) NOT NULL DEFAULT 'LOCAL',
    status VARCHAR(20) NOT NULL DEFAULT 'TRIAL',
    expires_at TIMESTAMP WITH TIME ZONE,
    grace_until TIMESTAMP WITH TIME ZONE,
    trial_started_at TIMESTAMP WITH TIME ZONE,
    trial_days INTEGER DEFAULT 14,
    max_devices INTEGER DEFAULT 1,
    max_locations INTEGER DEFAULT 1,
    max_users INTEGER DEFAULT 5,
    offline_mode_allowed BOOLEAN DEFAULT TRUE,
    offline_lease_hours INTEGER DEFAULT 48,
    license_signature TEXT,
    public_key TEXT,
    admin_notes TEXT,
    customer_message TEXT,
    last_payment_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_companies_status ON companies(status);
CREATE INDEX idx_companies_plan ON companies(plan);
CREATE INDEX idx_companies_expires_at ON companies(expires_at);
CREATE INDEX idx_companies_nit ON companies(nit);

-- Licensed devices table
CREATE TABLE IF NOT EXISTS licensed_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    device_fingerprint VARCHAR(100) NOT NULL UNIQUE,
    hostname VARCHAR(100),
    operating_system VARCHAR(50),
    cpu_info VARCHAR(200),
    mac_address VARCHAR(50),
    app_version VARCHAR(50),
    license_key VARCHAR(200),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    expires_at TIMESTAMP WITH TIME ZONE,
    signature TEXT,
    last_heartbeat_at TIMESTAMP WITH TIME ZONE,
    last_ip_address VARCHAR(50),
    heartbeat_count BIGINT DEFAULT 0,
    is_currently_online BOOLEAN DEFAULT FALSE,
    last_seen_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP WITH TIME ZONE,
    revocation_reason VARCHAR(500),
    pending_command VARCHAR(50),
    pending_command_payload TEXT,
    command_acknowledged BOOLEAN DEFAULT FALSE,
    last_error_report TEXT,
    pending_sync_events BIGINT DEFAULT 0,
    synced_events BIGINT DEFAULT 0,
    failed_sync_events BIGINT DEFAULT 0
);

CREATE INDEX idx_licensed_devices_company ON licensed_devices(company_id);
CREATE INDEX idx_licensed_devices_status ON licensed_devices(status);
CREATE INDEX idx_licensed_devices_fingerprint ON licensed_devices(device_fingerprint);
CREATE INDEX idx_licensed_devices_heartbeat ON licensed_devices(last_heartbeat_at);
CREATE INDEX idx_licensed_devices_pending_cmd ON licensed_devices(pending_command, command_acknowledged);

-- Company modules table - Granular feature toggles
CREATE TABLE IF NOT EXISTS company_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    module_type VARCHAR(30) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    enabled_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    limits_json TEXT,
    configuration_json TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(company_id, module_type)
);

CREATE INDEX idx_company_modules_company ON company_modules(company_id);
CREATE INDEX idx_company_modules_type ON company_modules(module_type);
CREATE INDEX idx_company_modules_enabled ON company_modules(company_id, enabled);

-- License audit log
CREATE TABLE IF NOT EXISTS license_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    device_id UUID REFERENCES licensed_devices(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    description TEXT,
    old_value TEXT,
    new_value TEXT,
    performed_by VARCHAR(100),
    ip_address VARCHAR(50),
    session_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_license_audit_company ON license_audit_log(company_id, created_at DESC);
CREATE INDEX idx_license_audit_device ON license_audit_log(device_id, created_at DESC);
CREATE INDEX idx_license_audit_action ON license_audit_log(action, created_at DESC);

-- ============================================================================
-- DEFAULT DATA - Insert sample company for development
-- ============================================================================

-- Insert default development company
INSERT INTO companies (id, name, nit, plan, status, max_devices, max_locations, max_users, 
                       offline_mode_allowed, offline_lease_hours, expires_at, grace_until)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'ParkFlow Development',
    '900.123.456-7',
    'PRO',
    'ACTIVE',
    10,
    5,
    50,
    TRUE,
    48,
    CURRENT_TIMESTAMP + INTERVAL '1 year',
    CURRENT_TIMESTAMP + INTERVAL '1 year 7 days'
)
ON CONFLICT (id) DO NOTHING;

-- Insert default modules for development company
INSERT INTO company_modules (company_id, module_type, enabled)
VALUES
    ('00000000-0000-0000-0000-000000000001', 'LOCAL_PRINTING', TRUE),
    ('00000000-0000-0000-0000-000000000001', 'CLOUD_SYNC', TRUE),
    ('00000000-0000-0000-0000-000000000001', 'DASHBOARD', TRUE),
    ('00000000-0000-0000-0000-000000000001', 'CLOUD_BACKUP', TRUE),
    ('00000000-0000-0000-0000-000000000001', 'MULTI_LOCATION', TRUE),
    ('00000000-0000-0000-0000-000000000001', 'ADVANCED_AUDIT', TRUE),
    ('00000000-0000-0000-0000-000000000001', 'CUSTOM_REPORTS', TRUE)
ON CONFLICT (company_id, module_type) DO NOTHING;


-- ============================================================================
-- LICENSE BLOCK EVENTS - Tabla para auditorÃ­a de bloqueos
-- ============================================================================

CREATE TABLE IF NOT EXISTS license_block_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    device_id UUID REFERENCES licensed_devices(id) ON DELETE SET NULL,

    -- Tipo y razÃ³n del bloqueo
    event_type VARCHAR(50) NOT NULL,
    reason_code VARCHAR(100) NOT NULL,
    reason_description VARCHAR(500) NOT NULL,

    -- Estado de la empresa al momento del bloqueo
    company_status_at_block VARCHAR(20),
    company_plan_at_block VARCHAR(20),
    expires_at_at_block TIMESTAMP WITH TIME ZONE,
    grace_until_at_block TIMESTAMP WITH TIME ZONE,
    days_since_expiration INTEGER,

    -- InformaciÃ³n del dispositivo
    device_fingerprint VARCHAR(100),
    device_hostname VARCHAR(100),
    device_os VARCHAR(50),
    app_version VARCHAR(50),

    -- InformaciÃ³n de red
    ip_address VARCHAR(50),
    request_metadata TEXT,

    -- Resultados de verificaciones
    signature_valid BOOLEAN,
    fingerprint_valid BOOLEAN,
    tamper_check_passed BOOLEAN,
    tamper_check_details VARCHAR(200),
    tamper_violation_count INTEGER,

    -- Heartbeat
    last_heartbeat_at TIMESTAMP WITH TIME ZONE,
    minutes_since_last_heartbeat INTEGER,

    -- Control de bloqueo
    auto_blocked BOOLEAN NOT NULL DEFAULT TRUE,
    blocked_by VARCHAR(100),

    -- ResoluciÃ³n
    resolved BOOLEAN NOT NULL DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by VARCHAR(100),
    resolution_notes TEXT,
    false_positive BOOLEAN DEFAULT FALSE,
    corrective_action VARCHAR(100),

    -- Detalles tÃ©cnicos
    technical_details TEXT,

    -- InformaciÃ³n de pago (para casos post-bloqueo)
    payment_received_after_block BOOLEAN DEFAULT FALSE,
    payment_date TIMESTAMP WITH TIME ZONE,
    payment_reference VARCHAR(100),

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Ãndices para consultas comunes
CREATE INDEX idx_block_events_company ON license_block_events(company_id, created_at DESC);
CREATE INDEX idx_block_events_device ON license_block_events(device_id, created_at DESC);
CREATE INDEX idx_block_events_unresolved ON license_block_events(resolved, created_at DESC) WHERE resolved = FALSE;
CREATE INDEX idx_block_events_reason ON license_block_events(reason_code, created_at DESC);
CREATE INDEX idx_block_events_false_positive ON license_block_events(false_positive) WHERE false_positive = TRUE;
CREATE INDEX idx_block_events_payment_after ON license_block_events(payment_received_after_block) WHERE payment_received_after_block = TRUE;
CREATE INDEX idx_block_events_created_at ON license_block_events(created_at DESC);

-- Ãndice compuesto para consultas de soporte
CREATE INDEX idx_block_events_support ON license_block_events(company_id, resolved, payment_received_after_block);

-- ============================================================================
-- VISTA para dashboard de soporte
-- ============================================================================

CREATE OR REPLACE VIEW support_dashboard AS
SELECT
    lbe.id as block_event_id,
    lbe.company_id,
    c.name as company_name,
    c.status as current_status,
    c.plan as current_plan,
    lbe.reason_description as block_reason,
    lbe.created_at as block_date,
    lbe.resolved,
    lbe.resolved_at,
    lbe.payment_received_after_block,
    lbe.payment_date,
    lbe.payment_reference,
    EXTRACT(DAY FROM (CURRENT_TIMESTAMP - lbe.created_at)) as days_blocked,
    CASE
        WHEN c.plan = 'ENTERPRISE' THEN 'HIGH'
        WHEN c.plan = 'PRO' THEN 'MEDIUM'
        ELSE 'LOW'
    END as priority,
    lbe.device_fingerprint,
    lbe.device_hostname
FROM license_block_events lbe
JOIN companies c ON lbe.company_id = c.id
WHERE lbe.resolved = FALSE
ORDER BY
    CASE c.plan
        WHEN 'ENTERPRISE' THEN 1
        WHEN 'PRO' THEN 2
        ELSE 3
    END,
    lbe.created_at DESC;

-- ============================================================================
-- FUNCIÃ“N para alertas de bloqueos prioritarios
-- ============================================================================

CREATE OR REPLACE FUNCTION get_priority_block_cases()
RETURNS TABLE (
    block_event_id UUID,
    company_id UUID,
    company_name VARCHAR(200),
    company_status VARCHAR(20),
    block_reason VARCHAR(500),
    block_date TIMESTAMP WITH TIME ZONE,
    payment_date TIMESTAMP WITH TIME ZONE,
    payment_reference VARCHAR(100),
    days_blocked NUMERIC,
    priority VARCHAR(10)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        lbe.id,
        lbe.company_id,
        c.name,
        c.status::VARCHAR(20),
        lbe.reason_description,
        lbe.created_at,
        lbe.payment_date,
        lbe.payment_reference,
        EXTRACT(DAY FROM (CURRENT_TIMESTAMP - lbe.created_at)),
        CASE
            WHEN c.plan = 'ENTERPRISE' THEN 'HIGH'::VARCHAR(10)
            WHEN c.plan = 'PRO' THEN 'MEDIUM'::VARCHAR(10)
            ELSE 'LOW'::VARCHAR(10)
        END
    FROM license_block_events lbe
    JOIN companies c ON lbe.company_id = c.id
    WHERE lbe.resolved = FALSE
      AND lbe.payment_received_after_block = TRUE
    ORDER BY
        CASE c.plan
            WHEN 'ENTERPRISE' THEN 1
            WHEN 'PRO' THEN 2
            ELSE 3
        END,
        lbe.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGER para notificar nuevos bloqueos (opcional - requiere configuraciÃ³n)
-- ============================================================================

-- FunciÃ³n que se ejecuta en cada nuevo bloqueo
CREATE OR REPLACE FUNCTION notify_new_block_event()
RETURNS TRIGGER AS $$
BEGIN
    -- AquÃ­ podrÃ­as integrar con un sistema de notificaciones
    -- Por ejemplo: enviar email a soporte, Slack, etc.

    -- Por ahora solo logueamos
    RAISE NOTICE 'Nuevo evento de bloqueo: % - Empresa: % - RazÃ³n: %',
        NEW.id, NEW.company_id, NEW.reason_description;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear el trigger
DROP TRIGGER IF EXISTS trg_notify_block_event ON license_block_events;
CREATE TRIGGER trg_notify_block_event
    AFTER INSERT ON license_block_events
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_block_event();


-- Initial data
INSERT INTO app_user (id, name, email, role, password_hash)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Super Admin', 'admin@parkflow.local', 'SUPER_ADMIN', '$2b$12$P3JLo50.GqPgtGes8VA4O.vZkG7ERma8kSpQVqg/oDv4vDgqORy1S'),
  ('00000000-0000-0000-0000-000000000002', 'Cajero', 'cashier@parkflow.local', 'CAJERO', '$2b$12$P3JLo50.GqPgtGes8VA4O.vZkG7ERma8kSpQVqg/oDv4vDgqORy1S'),
  ('00000000-0000-0000-0000-000000000003', 'Admin Operativo', 'operador@parkflow.local', 'ADMIN', '$2b$12$P3JLo50.GqPgtGes8VA4O.vZkG7ERma8kSpQVqg/oDv4vDgqORy1S');

INSERT INTO master_vehicle_type (code, name) VALUES
('CAR', 'Carro'),
('MOTORCYCLE', 'Moto'),
('VAN', 'Van'),
('TRUCK', 'CamiÃ³n'),
('OTHER', 'Otro');

INSERT INTO rate (id, name, vehicle_type, rate_type, amount, grace_minutes, fraction_minutes, rounding_mode, lost_ticket_surcharge)
VALUES
  ('10000000-0000-0000-0000-000000000001', 'Hora carro', 'CAR', 'HOURLY', 4000, 10, 60, 'UP', 10000),
  ('10000000-0000-0000-0000-000000000002', 'Hora moto', 'MOTORCYCLE', 'HOURLY', 2000, 10, 60, 'UP', 6000),
  ('10000000-0000-0000-0000-000000000003', 'Hora Van', 'VAN', 'HOURLY', 5000, 10, 60, 'UP', 12000),
  ('10000000-0000-0000-0000-000000000004', 'Hora CamiÃ³n', 'TRUCK', 'HOURLY', 8000, 10, 60, 'UP', 20000),
  ('10000000-0000-0000-0000-000000000005', 'Hora Otro', 'OTHER', 'HOURLY', 3000, 10, 60, 'UP', 8000);
