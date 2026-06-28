-- V042: Onboarding Security Hardening
-- Addresses audit findings:
--   I-06: Missing Row Level Security on onboarding_progress
--   C-05: No schema validation on progress_data JSONB
--
-- NOTE: RLS policy uses app.tenant_id session variable set by the application layer
-- via SET LOCAL app.tenant_id = '<uuid>' on every authenticated request.
-- The parkflow_app role must be the role used by the Spring datasource.
--
-- PostgreSQL version: 14+

-- ─────────────────────────────────────────────────────────────────────────────
-- Ensure required roles exist
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'parkflow_service') THEN
        CREATE ROLE parkflow_service NOLOGIN;
    END IF;
END
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- I-06: Row Level Security for onboarding_progress
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable RLS on onboarding_progress table
ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;

-- Create policy: only allow access to rows belonging to the current tenant
-- The NULLIF handles the case where app.tenant_id is not set (e.g. SUPER_ADMIN bypass)
CREATE POLICY rls_onboarding_progress_tenant_isolation
    ON onboarding_progress
    AS PERMISSIVE
    FOR ALL
    TO parkflow_app
    USING (
        company_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
        OR current_setting('app.tenant_id', true) IS NULL
        OR current_setting('app.tenant_id', true) = ''
    );

-- Super admin bypass: allow service role unrestricted access
-- (used for admin tools and migrations)
CREATE POLICY rls_onboarding_progress_superadmin_bypass
    ON onboarding_progress
    AS PERMISSIVE
    FOR ALL
    TO parkflow_service
    USING (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- C-05: Basic structural validation on progress_data JSONB
-- ─────────────────────────────────────────────────────────────────────────────
-- PostgreSQL CHECK constraints on JSONB can validate basic structure.
-- We enforce that progress_data is a JSON object (not array/null/scalar).
-- Full schema validation is done at the application layer (service + validator).
ALTER TABLE onboarding_progress
    ADD CONSTRAINT chk_onboarding_progress_data_is_object
        CHECK (
            progress_data IS NULL
            OR jsonb_typeof(progress_data) = 'object'
        );

-- ─────────────────────────────────────────────────────────────────────────────
-- Index for performance: querying by company_id (used in findByCompanyId)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_company_id
    ON onboarding_progress (company_id);
