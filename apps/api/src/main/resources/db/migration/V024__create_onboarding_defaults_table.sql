-- V024: Create onboarding defaults table for database-driven configuration
-- Purpose: Allow admins to manage onboarding defaults without code changes

CREATE TABLE onboarding_defaults (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    default_key VARCHAR(100) NOT NULL,
    default_value JSONB NOT NULL,
    plan_restriction VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    UNIQUE(default_key, plan_restriction)
);

-- Insert default values from hardcoded defaults
INSERT INTO onboarding_defaults (default_key, default_value, plan_restriction, created_by)
VALUES
    ('vehicle_types', '["MOTO", "CARRO"]', NULL, 'SYSTEM'),
    ('capacity', '{"controlSlots": false, "total": 0}', NULL, 'SYSTEM'),
    ('rates', '{"mode": "HOURLY", "baseValue": 0}', NULL, 'SYSTEM'),
    ('payment_methods', '["EFECTIVO"]', 'LOCAL', 'SYSTEM'),
    ('sites', '["PRINCIPAL"]', NULL, 'SYSTEM'),
    ('modules.cash', 'true', NULL, 'SYSTEM'),
    ('modules.shifts', 'false', NULL, 'SYSTEM'),
    ('modules.clients', 'false', NULL, 'SYSTEM'),
    ('modules.monthly', 'false', NULL, 'SYSTEM'),
    ('modules.agreements', 'false', NULL, 'SYSTEM'),
    ('modules.advancedAudit', 'true', NULL, 'SYSTEM');

-- Create index for faster lookups
CREATE INDEX idx_onboarding_defaults_key ON onboarding_defaults(default_key);
CREATE INDEX idx_onboarding_defaults_plan ON onboarding_defaults(plan_restriction);

-- Add comment for tracking
COMMENT ON TABLE onboarding_defaults IS 'Database-driven defaults for onboarding configuration, allows admins to manage defaults without code changes (FASE III refactoring)';
