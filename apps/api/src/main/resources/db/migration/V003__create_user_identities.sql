-- Create user_identities table for OAuth2/OIDC external identity linking
-- Each row links an external provider identity (Google, Microsoft) to an internal AppUser
-- Supports: multiple providers per user, unique constraint per (provider, provider_user_id)
-- Reason: OAuth2/OIDC login with Google and Microsoft
-- Date: 2026-06-30

CREATE TABLE user_identities (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    app_user_id UUID NOT NULL,
    provider VARCHAR(50) NOT NULL,
    provider_user_id VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT user_identities_pkey PRIMARY KEY (id),
    CONSTRAINT uq_user_identities_provider_user UNIQUE (provider, provider_user_id),
    CONSTRAINT fk_user_identities_app_user FOREIGN KEY (app_user_id)
        REFERENCES app_user(id) ON DELETE CASCADE
);

CREATE INDEX idx_user_identities_app_user ON user_identities(app_user_id);
CREATE INDEX idx_user_identities_provider ON user_identities(provider, provider_user_id);

-- RLS not needed: user_identities cross-cuts tenants (a user from company A can
-- log in via Google; the identity binding is per-user, not per-company)
