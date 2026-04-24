-- Caja / sesiones / movimientos / cierre / auditoria de dominio

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

CREATE UNIQUE INDEX uq_cash_session_open_register ON cash_session (cash_register_id) WHERE status = 'OPEN';

CREATE UNIQUE INDEX uq_cash_session_open_idempotency ON cash_session (open_idempotency_key)
  WHERE open_idempotency_key IS NOT NULL;

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

CREATE UNIQUE INDEX uq_cash_mov_park_payment ON cash_movement (parking_session_id)
  WHERE movement_type = 'PARKING_PAYMENT' AND status = 'POSTED';

CREATE UNIQUE INDEX uq_cash_mov_idempotency ON cash_movement (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX idx_cash_mov_session ON cash_movement (cash_session_id, created_at);

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

CREATE INDEX idx_cash_audit_session ON cash_audit_log (cash_session_id, created_at);
