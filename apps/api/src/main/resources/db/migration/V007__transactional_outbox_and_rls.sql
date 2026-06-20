-- V007: Transactional Outbox Pattern + PostgreSQL Row Level Security

-- ─── Transactional Outbox ───────────────────────────────────────────────────
-- Guarantees event delivery even if listener fails after commit.
-- Processor picks up unprocessed events and publishes them.

CREATE TABLE IF NOT EXISTS outbox_events (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_type VARCHAR(100) NOT NULL,
    aggregate_id   VARCHAR(255) NOT NULL,
    event_type     VARCHAR(100) NOT NULL,
    payload        JSONB NOT NULL DEFAULT '{}',
    company_id     UUID REFERENCES companies(id) ON DELETE CASCADE,
    processed_at   TIMESTAMPTZ,
    failed_at      TIMESTAMPTZ,
    failure_reason TEXT,
    retry_count    INT NOT NULL DEFAULT 0,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_outbox_events_unprocessed
    ON outbox_events (created_at)
    WHERE processed_at IS NULL AND failed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_outbox_events_company
    ON outbox_events (company_id, created_at)
    WHERE processed_at IS NULL;

-- ─── Subscription Change History ────────────────────────────────────────────
-- Tracks every plan change per company for billing/audit purposes.

CREATE TABLE IF NOT EXISTS subscription_change_history (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    old_plan_id     UUID REFERENCES plans(id) ON DELETE SET NULL,
    new_plan_id     UUID REFERENCES plans(id) ON DELETE SET NULL,
    change_type     VARCHAR(50) NOT NULL,  -- CREATED, UPGRADED, DOWNGRADED, CANCELLED, SUSPENDED, REACTIVATED
    changed_by      UUID REFERENCES app_user(id) ON DELETE SET NULL,
    reason          TEXT,
    effective_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscription_history_company
    ON subscription_change_history (company_id, effective_at DESC);

-- ─── PostgreSQL Row Level Security ──────────────────────────────────────────
-- Defense-in-depth: application layer already filters by company_id via
-- TenantContext, but RLS adds a second enforcement layer at the DB level.
-- The application DB user is the table owner and bypasses RLS by default.
-- A restricted role (parkflow_app) enforces the policy.

DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'parkflow_app') THEN
        CREATE ROLE parkflow_app NOLOGIN;
    END IF;
END;
$$;

-- Enable RLS on core multi-tenant tables (owner bypasses by default)
ALTER TABLE parking_session ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_session    ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_movement   ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_user        ENABLE ROW LEVEL SECURITY;

-- Policies for the restricted application role
-- Allow access only when company_id matches the session tenant variable,
-- or when the variable is not set (admin/migration context)
CREATE POLICY rls_parking_session ON parking_session
    FOR ALL TO parkflow_app
    USING (
        company_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
        OR NULLIF(current_setting('app.tenant_id', true), '') IS NULL
    );

CREATE POLICY rls_cash_session ON cash_session
    FOR ALL TO parkflow_app
    USING (
        company_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
        OR NULLIF(current_setting('app.tenant_id', true), '') IS NULL
    );

CREATE POLICY rls_cash_movement ON cash_movement
    FOR ALL TO parkflow_app
    USING (
        company_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
        OR NULLIF(current_setting('app.tenant_id', true), '') IS NULL
    );

CREATE POLICY rls_app_user ON app_user
    FOR ALL TO parkflow_app
    USING (
        company_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
        OR NULLIF(current_setting('app.tenant_id', true), '') IS NULL
    );
