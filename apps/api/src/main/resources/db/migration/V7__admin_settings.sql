-- Administrative settings: rates extensions, user profile fields, parking parameters JSON

ALTER TABLE rate
  ADD COLUMN IF NOT EXISTS site VARCHAR(80) NOT NULL DEFAULT 'DEFAULT',
  ADD COLUMN IF NOT EXISTS tolerance_minutes INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS window_start TIME,
  ADD COLUMN IF NOT EXISTS window_end TIME,
  ADD COLUMN IF NOT EXISTS scheduled_active_from TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS scheduled_active_to TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS ux_rate_site_active_lower_name
  ON rate (site, lower(btrim(name)))
  WHERE is_active = TRUE;

ALTER TABLE app_user
  ADD COLUMN IF NOT EXISTS document VARCHAR(32),
  ADD COLUMN IF NOT EXISTS phone VARCHAR(40),
  ADD COLUMN IF NOT EXISTS site VARCHAR(80),
  ADD COLUMN IF NOT EXISTS terminal VARCHAR(80),
  ADD COLUMN IF NOT EXISTS last_access_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS ux_app_user_document_lower
  ON app_user (lower(btrim(document)))
  WHERE document IS NOT NULL AND length(btrim(document)) > 0;

CREATE TABLE IF NOT EXISTS parking_parameters (
  id UUID PRIMARY KEY,
  site_code VARCHAR(80) NOT NULL DEFAULT 'DEFAULT',
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_parking_parameters_site ON parking_parameters (site_code);
