ALTER TABLE app_user
  ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255),
  ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;

UPDATE app_user SET role = 'CAJERO' WHERE role = 'CASHIER';
UPDATE app_user SET role = 'OPERADOR' WHERE role = 'MANAGER';

-- bcrypt hash for password: password (force change on first productive deployment).
UPDATE app_user
SET password_hash = '$2a$10$7EqJtq98hPqEX7fNZaFWoO.LDa6fM5i9I9f7o0P4rWuieKkyR3B9a'
WHERE password_hash IS NULL;

ALTER TABLE app_user
  ALTER COLUMN password_hash SET NOT NULL;

CREATE TABLE IF NOT EXISTS authorized_devices (
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

CREATE TABLE IF NOT EXISTS auth_sessions (
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

CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_active ON auth_sessions(user_id, active);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_device_active ON auth_sessions(device_pk, active);

CREATE TABLE IF NOT EXISTS auth_audit_log (
  id UUID PRIMARY KEY,
  action VARCHAR(40) NOT NULL,
  user_id UUID REFERENCES app_user(id),
  device_pk UUID REFERENCES authorized_devices(id),
  outcome VARCHAR(40) NOT NULL,
  metadata_json TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_audit_created_at ON auth_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_audit_action ON auth_audit_log(action);

ALTER TABLE sync_events
  ADD COLUMN IF NOT EXISTS user_id VARCHAR(64),
  ADD COLUMN IF NOT EXISTS device_id VARCHAR(180),
  ADD COLUMN IF NOT EXISTS session_id VARCHAR(64),
  ADD COLUMN IF NOT EXISTS origin VARCHAR(40) NOT NULL DEFAULT 'ONLINE';
