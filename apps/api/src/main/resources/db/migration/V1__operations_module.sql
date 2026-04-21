CREATE TABLE app_user (
  id UUID PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(180) NOT NULL UNIQUE,
  role VARCHAR(20) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE parking_session (
  id UUID PRIMARY KEY,
  ticket_number VARCHAR(40) NOT NULL UNIQUE,
  vehicle_id UUID NOT NULL REFERENCES vehicle(id),
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

CREATE INDEX idx_parking_session_status ON parking_session(status);
CREATE INDEX idx_parking_session_plate ON parking_session(vehicle_id, status);
CREATE INDEX idx_session_event_session ON session_event(session_id, created_at);

INSERT INTO app_user (id, name, email, role)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Admin', 'admin@parkflow.local', 'ADMIN'),
  ('00000000-0000-0000-0000-000000000002', 'Cajero', 'cashier@parkflow.local', 'CASHIER');

INSERT INTO rate (id, name, vehicle_type, rate_type, amount, grace_minutes, fraction_minutes, rounding_mode, lost_ticket_surcharge)
VALUES
  ('10000000-0000-0000-0000-000000000001', 'Hora carro', 'CAR', 'HOURLY', 4000, 10, 60, 'UP', 10000),
  ('10000000-0000-0000-0000-000000000002', 'Hora moto', 'MOTORCYCLE', 'HOURLY', 2000, 10, 60, 'UP', 6000);
