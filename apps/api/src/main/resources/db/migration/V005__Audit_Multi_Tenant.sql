-- ============================================================================
-- V005: Audit and PrintJob Multi-Tenant Enforcement
-- ============================================================================

DO $$
DECLARE
    default_company_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN

    -- 1. Hardening global_audit_log
    ALTER TABLE global_audit_log ADD COLUMN IF NOT EXISTS company_id UUID;
    UPDATE global_audit_log SET company_id = default_company_id WHERE company_id IS NULL;
    ALTER TABLE global_audit_log ALTER COLUMN company_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_audit_log_company ON global_audit_log(company_id);

    -- 2. Hardening print_jobs (previously missing NOT NULL in V004)
    ALTER TABLE print_jobs ALTER COLUMN company_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_print_jobs_company ON print_jobs(company_id);

END $$;
