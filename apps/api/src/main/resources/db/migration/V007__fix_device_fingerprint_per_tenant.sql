-- P10: Scope licensed_devices.device_fingerprint uniqueness to company
-- A device registered at company A should be registerable at company B (different tenant).
ALTER TABLE licensed_devices DROP CONSTRAINT IF EXISTS licensed_devices_device_fingerprint_key;
DROP INDEX IF EXISTS licensed_devices_device_fingerprint_key;
DROP INDEX IF EXISTS uq_licensed_device_fingerprint;

CREATE UNIQUE INDEX uq_licensed_device_company_fingerprint ON licensed_devices (company_id, device_fingerprint);
