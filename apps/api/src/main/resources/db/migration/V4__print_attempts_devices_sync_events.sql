ALTER TABLE print_job RENAME TO print_jobs;

ALTER INDEX idx_print_job_session RENAME TO idx_print_jobs_session;
ALTER INDEX idx_print_job_status RENAME TO idx_print_jobs_status;

CREATE TABLE print_attempts (
  id UUID PRIMARY KEY,
  print_job_id UUID NOT NULL REFERENCES print_jobs(id),
  status VARCHAR(20) NOT NULL,
  attempt_key VARCHAR(120) NOT NULL UNIQUE,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_print_attempts_job ON print_attempts(print_job_id, created_at DESC);

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

CREATE INDEX idx_devices_enabled ON devices(is_enabled);

CREATE TABLE sync_events (
  id UUID PRIMARY KEY,
  idempotency_key VARCHAR(120) NOT NULL UNIQUE,
  event_type VARCHAR(40) NOT NULL,
  aggregate_id VARCHAR(80) NOT NULL,
  payload_json TEXT NOT NULL,
  direction VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMPTZ
);

CREATE INDEX idx_sync_events_created ON sync_events(created_at);
CREATE INDEX idx_sync_events_synced ON sync_events(synced_at);
