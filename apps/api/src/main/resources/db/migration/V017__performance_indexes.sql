-- Rate lookup performance: findFirstApplicableRate filters by site on every vehicle entry/exit
CREATE INDEX IF NOT EXISTS idx_rate_site_id ON rate (site);

-- Authorized devices: unique constraint should be scoped per company (multi-tenant)
-- Existing constraint 'authorized_devices_device_id_key' is global; the correct scope is (device_id, company_id)
ALTER TABLE authorized_devices DROP CONSTRAINT IF EXISTS authorized_devices_device_id_key;
ALTER TABLE authorized_devices ADD CONSTRAINT uq_authorized_devices_per_company UNIQUE (device_id, company_id);

-- Cash movement lookup by parking session (used by VoidSessionService)
CREATE INDEX IF NOT EXISTS idx_cash_movement_parking_session ON cash_movement (parking_session_id);
