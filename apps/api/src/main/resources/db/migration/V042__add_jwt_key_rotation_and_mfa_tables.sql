-- JWT Key Version Management Table (for gradual secret rotation)
CREATE TABLE jwt_key_versions (
    version INTEGER PRIMARY KEY,
    key_material TEXT NOT NULL,
    active BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    activated_at TIMESTAMPTZ,
    deactivated_at TIMESTAMPTZ,

    CONSTRAINT jwt_key_versions_key_material_not_empty CHECK (key_material != '')
);

CREATE INDEX idx_jwt_key_versions_active ON jwt_key_versions(active) WHERE active = true;
CREATE INDEX idx_jwt_key_versions_created_at ON jwt_key_versions(created_at DESC);

-- Multi-Factor Authentication Configuration Table
CREATE TABLE mfa_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    method VARCHAR(20) NOT NULL, -- TOTP, SMS, EMAIL
    enabled BOOLEAN DEFAULT false,
    totp_secret VARCHAR(32),
    backup_codes TEXT, -- JSON array of backup codes
    verified_at TIMESTAMPTZ,
    enabled_at TIMESTAMPTZ,
    disabled_at TIMESTAMPTZ,
    requires_verification BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT fk_mfa_configs_user FOREIGN KEY (user_id)
        REFERENCES app_user(id) ON DELETE CASCADE,
    CONSTRAINT ck_mfa_method CHECK (method IN ('TOTP', 'SMS', 'EMAIL'))
);

CREATE INDEX idx_mfa_configs_user_method ON mfa_configs(user_id, method);
CREATE INDEX idx_mfa_configs_enabled ON mfa_configs(user_id) WHERE enabled = true;
CREATE INDEX idx_mfa_configs_created_at ON mfa_configs(created_at DESC);

-- Multi-tenant security: Ensure user_id belongs to correct tenant
ALTER TABLE mfa_configs ADD CONSTRAINT fk_mfa_configs_company CHECK (
    user_id IN (
        SELECT id FROM app_user WHERE company_id = (
            SELECT company_id FROM app_user WHERE id = mfa_configs.user_id
        )
    )
);

-- Add column to track key version in tokens (for JWT rotation)
ALTER TABLE auth_sessions
ADD COLUMN key_version INTEGER DEFAULT 1;

-- Create index for efficient lookup
CREATE INDEX idx_auth_sessions_key_version ON auth_sessions(key_version);
