CREATE TABLE onboarding_rule_snapshots (
    id UUID PRIMARY KEY,
    version INTEGER NOT NULL UNIQUE,
    applied_at TIMESTAMP WITH TIME ZONE NOT NULL,
    validation_rules JSONB NOT NULL,
    default_values JSONB NOT NULL
);

-- Insert initial snapshot (Version 1)
INSERT INTO onboarding_rule_snapshots (id, version, applied_at, validation_rules, default_values)
VALUES (
    gen_random_uuid(), 
    1, 
    now(), 
    '{}'::jsonb, 
    '{}'::jsonb
);

-- Add tracking columns to onboarding_progress
ALTER TABLE onboarding_progress ADD COLUMN rule_version INTEGER;
ALTER TABLE onboarding_progress ADD COLUMN snapshot_hash VARCHAR(255);
