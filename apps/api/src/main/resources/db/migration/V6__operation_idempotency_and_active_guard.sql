-- Idempotent replay for entry/exit/reprint/lost (client-supplied idempotency keys)
CREATE TABLE operation_idempotency (
  id UUID PRIMARY KEY,
  idempotency_key VARCHAR(200) NOT NULL UNIQUE,
  operation_type VARCHAR(32) NOT NULL,
  session_id UUID NOT NULL REFERENCES parking_session(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_operation_idempotency_session ON operation_idempotency (session_id);

-- Prevents two ACTIVE sessions for the same vehicle (concurrent double-entry)
CREATE UNIQUE INDEX IF NOT EXISTS ux_parking_one_active_session_per_vehicle
  ON parking_session (vehicle_id)
  WHERE status = 'ACTIVE';
