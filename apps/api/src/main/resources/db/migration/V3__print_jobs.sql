CREATE TABLE print_job (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES parking_session(id),
  document_type VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL,
  idempotency_key VARCHAR(120) NOT NULL UNIQUE,
  payload_hash VARCHAR(120) NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  last_error TEXT,
  created_by_user_id UUID REFERENCES app_user(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_print_job_session ON print_job(session_id, created_at DESC);
CREATE INDEX idx_print_job_status ON print_job(status, created_at);
