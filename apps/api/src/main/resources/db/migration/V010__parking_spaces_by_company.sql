CREATE TABLE IF NOT EXISTS parking_space (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  code VARCHAR(30) NOT NULL,
  label VARCHAR(80),
  type VARCHAR(30) NOT NULL DEFAULT 'GENERAL',
  status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_parking_space_company_code UNIQUE (company_id, code),
  CONSTRAINT chk_parking_space_status CHECK (status IN ('ACTIVE', 'INACTIVE', 'MAINTENANCE')),
  CONSTRAINT chk_parking_space_type CHECK (type IN ('GENERAL', 'CAR', 'MOTORCYCLE', 'DISABLED', 'VIP'))
);

CREATE INDEX IF NOT EXISTS idx_parking_space_company_status
  ON parking_space(company_id, status);

CREATE INDEX IF NOT EXISTS idx_parking_space_company_sort
  ON parking_space(company_id, sort_order);

CREATE TABLE IF NOT EXISTS parking_space_assignment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  parking_space_id UUID NOT NULL REFERENCES parking_space(id),
  parking_session_id UUID NOT NULL REFERENCES parking_session(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  released_at TIMESTAMPTZ,
  status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_parking_space_assignment_session UNIQUE (parking_session_id),
  CONSTRAINT chk_parking_space_assignment_status CHECK (status IN ('ACTIVE', 'RELEASED'))
);

CREATE INDEX IF NOT EXISTS idx_parking_space_assignment_company_active
  ON parking_space_assignment(company_id, status, released_at);

CREATE INDEX IF NOT EXISTS idx_parking_space_assignment_space_active
  ON parking_space_assignment(parking_space_id, status, released_at);

CREATE UNIQUE INDEX IF NOT EXISTS uq_active_space_assignment
  ON parking_space_assignment(parking_space_id)
  WHERE released_at IS NULL;
