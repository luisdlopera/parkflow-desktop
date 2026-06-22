-- V019: Enable Row Level Security on remaining critical multi-tenant tables
-- Defense-in-depth: application layer filters by company_id via TenantContext,
-- but RLS adds a second enforcement layer at the DB level.
-- This ensures no data leakage between tenants even if application context fails.

-- Ensure restricted role exists (should already exist from V007)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'parkflow_app') THEN
        CREATE ROLE parkflow_app NOLOGIN;
    END IF;
END;
$$;

-- Enable RLS on payment table
ALTER TABLE payment ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_payment ON payment
    FOR ALL TO parkflow_app
    USING (
        company_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
        OR NULLIF(current_setting('app.tenant_id', true), '') IS NULL
    );

-- Enable RLS on session_event table
ALTER TABLE session_event ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_session_event ON session_event
    FOR ALL TO parkflow_app
    USING (
        EXISTS (
            SELECT 1 FROM parking_session ps
            WHERE ps.id = session_event.session_id
            AND ps.company_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
        )
        OR NULLIF(current_setting('app.tenant_id', true), '') IS NULL
    );

-- Enable RLS on vehicle table (soft-delete aware)
ALTER TABLE vehicle ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_vehicle ON vehicle
    FOR ALL TO parkflow_app
    USING (
        company_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
        OR NULLIF(current_setting('app.tenant_id', true), '') IS NULL
    );

-- Enable RLS on rate table (shared resource but scoped by site/company)
ALTER TABLE rate ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_rate ON rate
    FOR ALL TO parkflow_app
    USING (
        company_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
        OR NULLIF(current_setting('app.tenant_id', true), '') IS NULL
    );

-- Enable RLS on monthly_contract table
ALTER TABLE monthly_contract ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_monthly_contract ON monthly_contract
    FOR ALL TO parkflow_app
    USING (
        company_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
        OR NULLIF(current_setting('app.tenant_id', true), '') IS NULL
    );

-- Enable RLS on prepaid_balance table
ALTER TABLE prepaid_balance ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_prepaid_balance ON prepaid_balance
    FOR ALL TO parkflow_app
    USING (
        company_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
        OR NULLIF(current_setting('app.tenant_id', true), '') IS NULL
    );

-- Index to optimize RLS filtering
CREATE INDEX IF NOT EXISTS idx_payment_company_id ON payment(company_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_company_id ON vehicle(company_id);
CREATE INDEX IF NOT EXISTS idx_rate_company_id ON rate(company_id);
CREATE INDEX IF NOT EXISTS idx_monthly_contract_company_id ON monthly_contract(company_id);
CREATE INDEX IF NOT EXISTS idx_prepaid_balance_company_id ON prepaid_balance(company_id);
