-- V033: Enable Row Level Security on auth tables
-- Context: auth_sessions, password_reset_tokens, and auth_audit_log had no RLS protection.
-- If TenantContext fails to set app.tenant_id, these tables could leak data across tenants.
-- Defense-in-depth: RLS ensures tenant isolation at the DB layer.

-- Ensure restricted role exists (created in V007)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'parkflow_app') THEN
        CREATE ROLE parkflow_app NOLOGIN;
    END IF;
END;
$$;

-- auth_sessions: scoped by user's company_id (join through app_user)
ALTER TABLE auth_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_auth_sessions ON auth_sessions
    FOR ALL TO parkflow_app
    USING (
        EXISTS (
            SELECT 1 FROM app_user u
            WHERE u.id = auth_sessions.user_id
              AND u.company_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
        )
        OR NULLIF(current_setting('app.tenant_id', true), '') IS NULL
    );

-- password_reset_tokens: scoped by user's company_id (join through app_user)
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_password_reset_tokens ON password_reset_tokens
    FOR ALL TO parkflow_app
    USING (
        EXISTS (
            SELECT 1 FROM app_user u
            WHERE u.id = password_reset_tokens.user_id
              AND u.company_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
        )
        OR NULLIF(current_setting('app.tenant_id', true), '') IS NULL
    );

-- auth_audit_log: scoped by user's company_id; user_id may be NULL for failed logins
-- Allow rows where user_id is NULL (e.g. login attempts with unknown email) to pass through
-- since they carry no tenant-specific data.
ALTER TABLE auth_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_auth_audit_log ON auth_audit_log
    FOR ALL TO parkflow_app
    USING (
        user_id IS NULL
        OR EXISTS (
            SELECT 1 FROM app_user u
            WHERE u.id = auth_audit_log.user_id
              AND u.company_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
        )
        OR NULLIF(current_setting('app.tenant_id', true), '') IS NULL
    );
