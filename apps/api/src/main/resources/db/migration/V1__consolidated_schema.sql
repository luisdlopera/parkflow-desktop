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

-- Initial data
INSERT INTO app_user (id, name, email, role, password_hash)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Admin', 'admin@parkflow.local', 'ADMIN', '$2b$12$P3JLo50.GqPgtGes8VA4O.vZkG7ERma8kSpQVqg/oDv4vDgqORy1S'),
  ('00000000-0000-0000-0000-000000000002', 'Cajero', 'cashier@parkflow.local', 'CAJERO', '$2b$12$P3JLo50.GqPgtGes8VA4O.vZkG7ERma8kSpQVqg/oDv4vDgqORy1S');

INSERT INTO rate (id, name, vehicle_type, rate_type, amount, grace_minutes, fraction_minutes, rounding_mode, lost_ticket_surcharge)
VALUES
  ('10000000-0000-0000-0000-000000000001', 'Hora carro', 'CAR', 'HOURLY', 4000, 10, 60, 'UP', 10000),
  ('10000000-0000-0000-0000-000000000002', 'Hora moto', 'MOTORCYCLE', 'HOURLY', 2000, 10, 60, 'UP', 6000);