-- Soft delete support for app_user and vehicle
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE vehicle ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Tenant-scoped device listing: add company_id to authorized_devices
ALTER TABLE authorized_devices ADD COLUMN IF NOT EXISTS company_id UUID;
ALTER TABLE authorized_devices
    ADD CONSTRAINT fk_authorized_devices_company
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

-- Index for efficient tenant-scoped device queries
CREATE INDEX IF NOT EXISTS idx_authorized_devices_company_id ON authorized_devices(company_id);
CREATE INDEX IF NOT EXISTS idx_app_user_deleted_at ON app_user(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vehicle_deleted_at ON vehicle(deleted_at) WHERE deleted_at IS NULL;
