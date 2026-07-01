-- =============================================================================
-- V005: Enforce Row Level Security (RLS) on all multi-tenant tables
-- =============================================================================
-- This migration dynamically enables and forces RLS on all tables that
-- contain a 'company_id' or 'tenant_id' column. It also creates a strict isolation policy.
--
-- Why FORCE ROW LEVEL SECURITY?
-- Because the application currently connects using the database owner ('parkflow' user).
-- By default, PostgreSQL bypasses RLS for the table owner. 'FORCE' ensures that
-- even the owner is subject to the RLS policies.
-- =============================================================================

DO $$
DECLARE
    r RECORD;
    col_name text;
BEGIN
    FOR r IN 
        SELECT 
            t.table_name,
            c.column_name
        FROM 
            information_schema.tables t
        JOIN 
            information_schema.columns c ON t.table_name = c.table_name 
        WHERE 
            t.table_schema = 'public' 
            AND t.table_type = 'BASE TABLE'
            AND c.column_name IN ('company_id', 'tenant_id')
            AND t.table_name NOT IN ('flyway_schema_history') 
    LOOP
        col_name := r.column_name;

        -- 1. Enable RLS
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', r.table_name);
        
        -- 2. Force RLS (CRITICAL)
        EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY;', r.table_name);
        
        -- 3. Cleanup existing policies if any to prevent duplicates or conflicts
        EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_policy ON %I;', r.table_name);
        EXECUTE format('DROP POLICY IF EXISTS company_isolation_policy ON %I;', r.table_name);
        EXECUTE format('DROP POLICY IF EXISTS rls_%I ON %I;', r.table_name, r.table_name);
        
        -- 4. Create the strict isolation policy
        -- current_setting('app.tenant_id', true) -> 'true' allows missing values (returns NULL)
        -- which results in a secure Default-Deny if the context was not set by the backend.
        EXECUTE format(
            'CREATE POLICY tenant_isolation_policy ON %I 
             AS PERMISSIVE 
             FOR ALL 
             TO PUBLIC 
             USING (%I = current_setting(''app.tenant_id'', true)::uuid) 
             WITH CHECK (%I = current_setting(''app.tenant_id'', true)::uuid);', 
            r.table_name, col_name, col_name
        );
    END LOOP;
END
$$;

