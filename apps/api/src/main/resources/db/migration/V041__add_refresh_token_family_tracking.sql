-- Add refresh token family tracking to detect token theft
-- Date: 2026-06-28

-- Create refresh_token_families table
CREATE TABLE refresh_token_families (
    family_id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    company_id UUID NOT NULL,
    generation_number INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    revoke_reason VARCHAR(50),

    CONSTRAINT fk_rtf_user FOREIGN KEY (user_id) REFERENCES app_user(id),
    CONSTRAINT fk_rtf_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- Create indexes for quick lookups
CREATE INDEX idx_rtf_user ON refresh_token_families(user_id);
CREATE INDEX idx_rtf_company ON refresh_token_families(company_id);
CREATE INDEX idx_rtf_revoked ON refresh_token_families(revoked_at) WHERE revoked_at IS NOT NULL;

-- Add columns to auth_sessions table for token family tracking
ALTER TABLE auth_sessions ADD COLUMN token_family_id UUID;
ALTER TABLE auth_sessions ADD COLUMN token_generation INT NOT NULL DEFAULT 1;

-- Add foreign key constraint to refresh_token_families
ALTER TABLE auth_sessions ADD CONSTRAINT fk_as_family
    FOREIGN KEY (token_family_id) REFERENCES refresh_token_families(family_id);

-- Create index for quick session family lookups
CREATE INDEX idx_as_family ON auth_sessions(token_family_id);
CREATE INDEX idx_as_generation ON auth_sessions(token_generation);
