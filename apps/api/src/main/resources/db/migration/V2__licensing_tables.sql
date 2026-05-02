-- ============================================================================
-- LICENSING MODULE - Commercial Architecture for ParkFlow
-- ============================================================================

-- Companies table - Main entity for licensing
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    nit VARCHAR(20) UNIQUE,
    address VARCHAR(300),
    city VARCHAR(100),
    phone VARCHAR(50),
    email VARCHAR(200),
    contact_name VARCHAR(150),
    plan VARCHAR(20) NOT NULL DEFAULT 'LOCAL',
    status VARCHAR(20) NOT NULL DEFAULT 'TRIAL',
    expires_at TIMESTAMP WITH TIME ZONE,
    grace_until TIMESTAMP WITH TIME ZONE,
    trial_started_at TIMESTAMP WITH TIME ZONE,
    trial_days INTEGER DEFAULT 14,
    max_devices INTEGER DEFAULT 1,
    max_locations INTEGER DEFAULT 1,
    max_users INTEGER DEFAULT 5,
    offline_mode_allowed BOOLEAN DEFAULT TRUE,
    offline_lease_hours INTEGER DEFAULT 48,
    license_signature TEXT,
    public_key TEXT,
    admin_notes TEXT,
    customer_message TEXT,
    last_payment_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_companies_status ON companies(status);
CREATE INDEX idx_companies_plan ON companies(plan);
CREATE INDEX idx_companies_expires_at ON companies(expires_at);
CREATE INDEX idx_companies_nit ON companies(nit);

-- Licensed devices table
CREATE TABLE IF NOT EXISTS licensed_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    device_fingerprint VARCHAR(100) NOT NULL UNIQUE,
    hostname VARCHAR(100),
    operating_system VARCHAR(50),
    cpu_info VARCHAR(200),
    mac_address VARCHAR(50),
    app_version VARCHAR(50),
    license_key VARCHAR(200),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    expires_at TIMESTAMP WITH TIME ZONE,
    signature TEXT,
    last_heartbeat_at TIMESTAMP WITH TIME ZONE,
    last_ip_address VARCHAR(50),
    heartbeat_count BIGINT DEFAULT 0,
    is_currently_online BOOLEAN DEFAULT FALSE,
    last_seen_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP WITH TIME ZONE,
    revocation_reason VARCHAR(500),
    pending_command VARCHAR(50),
    pending_command_payload TEXT,
    command_acknowledged BOOLEAN DEFAULT FALSE,
    last_error_report TEXT,
    pending_sync_events BIGINT DEFAULT 0,
    synced_events BIGINT DEFAULT 0,
    failed_sync_events BIGINT DEFAULT 0
);

CREATE INDEX idx_licensed_devices_company ON licensed_devices(company_id);
CREATE INDEX idx_licensed_devices_status ON licensed_devices(status);
CREATE INDEX idx_licensed_devices_fingerprint ON licensed_devices(device_fingerprint);
CREATE INDEX idx_licensed_devices_heartbeat ON licensed_devices(last_heartbeat_at);
CREATE INDEX idx_licensed_devices_pending_cmd ON licensed_devices(pending_command, command_acknowledged);

-- Company modules table - Granular feature toggles
CREATE TABLE IF NOT EXISTS company_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    module_type VARCHAR(30) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    enabled_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    limits_json TEXT,
    configuration_json TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(company_id, module_type)
);

CREATE INDEX idx_company_modules_company ON company_modules(company_id);
CREATE INDEX idx_company_modules_type ON company_modules(module_type);
CREATE INDEX idx_company_modules_enabled ON company_modules(company_id, enabled);

-- License audit log
CREATE TABLE IF NOT EXISTS license_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    device_id UUID REFERENCES licensed_devices(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    description TEXT,
    old_value TEXT,
    new_value TEXT,
    performed_by VARCHAR(100),
    ip_address VARCHAR(50),
    session_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_license_audit_company ON license_audit_log(company_id, created_at DESC);
CREATE INDEX idx_license_audit_device ON license_audit_log(device_id, created_at DESC);
CREATE INDEX idx_license_audit_action ON license_audit_log(action, created_at DESC);

-- ============================================================================
-- DEFAULT DATA - Insert sample company for development
-- ============================================================================

-- Insert default development company
INSERT INTO companies (id, name, nit, plan, status, max_devices, max_locations, max_users, 
                       offline_mode_allowed, offline_lease_hours, expires_at, grace_until)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'ParkFlow Development',
    '900.123.456-7',
    'PRO',
    'ACTIVE',
    10,
    5,
    50,
    TRUE,
    48,
    CURRENT_TIMESTAMP + INTERVAL '1 year',
    CURRENT_TIMESTAMP + INTERVAL '1 year 7 days'
)
ON CONFLICT (id) DO NOTHING;

-- Insert default modules for development company
INSERT INTO company_modules (company_id, module_type, enabled)
VALUES
    ('00000000-0000-0000-0000-000000000001', 'LOCAL_PRINTING', TRUE),
    ('00000000-0000-0000-0000-000000000001', 'CLOUD_SYNC', TRUE),
    ('00000000-0000-0000-0000-000000000001', 'DASHBOARD', TRUE),
    ('00000000-0000-0000-0000-000000000001', 'CLOUD_BACKUP', TRUE),
    ('00000000-0000-0000-0000-000000000001', 'MULTI_LOCATION', TRUE),
    ('00000000-0000-0000-0000-000000000001', 'ADVANCED_AUDIT', TRUE),
    ('00000000-0000-0000-0000-000000000001', 'CUSTOM_REPORTS', TRUE)
ON CONFLICT (company_id, module_type) DO NOTHING;
