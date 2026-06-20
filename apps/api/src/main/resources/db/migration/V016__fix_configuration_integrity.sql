-- V016__fix_configuration_integrity.sql
-- Fixes critical issues from Configuration Module Audit (2026-06-20)
--
-- Issues fixed:
-- C3: Add missing FK constraints for company_id in 6 tables
-- C4: Drop orphan indexes on monthly_contract after V015 column drops
-- H1: Drop duplicate indexes on vehicle table
-- H4-H9: Add missing indexes on FK columns for performance
-- M4: Add CHECK constraints for enum-like VARCHAR columns

-- ============================================================================
-- C3: Add missing FK constraints for company_id (6 tables)
-- ============================================================================

ALTER TABLE operational_parameters
    ADD CONSTRAINT fk_op_params_company
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE rate
    ADD CONSTRAINT fk_rate_company
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE monthly_contract
    ADD CONSTRAINT fk_monthly_contract_company
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE agreement
    ADD CONSTRAINT fk_agreement_company
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE prepaid_package
    ADD CONSTRAINT fk_prepaid_package_company
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE prepaid_balance
    ADD CONSTRAINT fk_prepaid_balance_company
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

-- ============================================================================
-- C4: Drop orphan indexes on monthly_contract (columns dropped by V015)
-- ============================================================================

DROP INDEX IF EXISTS idx_monthly_contract_plate;
DROP INDEX IF EXISTS idx_monthly_contract_active;

-- ============================================================================
-- H1: Drop duplicate indexes on vehicle table
-- ============================================================================

DROP INDEX IF EXISTS idx_vehicles_plate;
-- idx_vehicle_plate_company is a UNIQUE index duplicating uq_vehicle_company_plate constraint
DROP INDEX IF EXISTS idx_vehicle_plate_company;

-- ============================================================================
-- H4-H9: Add missing indexes on FK columns for performance
-- ============================================================================

-- parking_sites.company_id
CREATE INDEX IF NOT EXISTS idx_parking_sites_company_id ON parking_sites(company_id);

-- printers.site_id and printers.company_id
CREATE INDEX IF NOT EXISTS idx_printers_site_id ON printers(site_id);
CREATE INDEX IF NOT EXISTS idx_printers_company_id ON printers(company_id);

-- payment_methods.company_id
CREATE INDEX IF NOT EXISTS idx_payment_methods_company_id ON payment_methods(company_id);

-- rate.site_id (currently indexes deprecated 'site' column)
CREATE INDEX IF NOT EXISTS idx_rate_site_uuid ON rate(site_id);

-- agreement.rate_id and agreement.site_id
CREATE INDEX IF NOT EXISTS idx_agreement_rate_id ON agreement(rate_id);
CREATE INDEX IF NOT EXISTS idx_agreement_site_id ON agreement(site_id);

-- prepaid_package.company_id and prepaid_package.site_id
CREATE INDEX IF NOT EXISTS idx_prepaid_package_company_id ON prepaid_package(company_id);
CREATE INDEX IF NOT EXISTS idx_prepaid_package_site_id ON prepaid_package(site_id);

-- operational_parameters.company_id
CREATE INDEX IF NOT EXISTS idx_op_params_company_id ON operational_parameters(company_id);

-- monthly_contract.rate_id, site_id
CREATE INDEX IF NOT EXISTS idx_monthly_contract_rate_id ON monthly_contract(rate_id);
CREATE INDEX IF NOT EXISTS idx_monthly_contract_site_id ON monthly_contract(site_id);

-- rate_fractions.rate_id (implicit via UNIQUE, but explicit is clearer)
CREATE INDEX IF NOT EXISTS idx_rate_fractions_rate_id ON rate_fractions(rate_id);

-- client table (new in V015)
CREATE INDEX IF NOT EXISTS idx_client_company_id ON client(company_id);
CREATE INDEX IF NOT EXISTS idx_client_document ON client(document);

-- ============================================================================
-- M4: Add CHECK constraints for enum-like VARCHAR columns
-- ============================================================================

ALTER TABLE rate
    ADD CONSTRAINT chk_rate_type CHECK (rate_type IN ('PER_MINUTE', 'HOURLY', 'DAILY', 'FLAT'));

ALTER TABLE rate
    ADD CONSTRAINT chk_rate_rounding_mode CHECK (rounding_mode IN ('UP', 'DOWN', 'NEAREST'));

ALTER TABLE rate
    ADD CONSTRAINT chk_rate_category CHECK (category IN ('STANDARD', 'MONTHLY', 'AGREEMENT', 'PREPAID'));

ALTER TABLE companies
    ADD CONSTRAINT chk_companies_operation_mode CHECK (operation_mode IN ('OFFLINE', 'ONLINE', 'HYBRID'));

ALTER TABLE companies
    ADD CONSTRAINT chk_companies_status CHECK (status IN ('TRIAL', 'ACTIVE', 'SUSPENDED', 'BLOCKED', 'CANCELLED', 'EXPIRED'));

-- ============================================================================
-- M6: Add UNIQUE constraint on printers(site_id, name) to prevent duplicates
-- ============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS uq_printers_site_name ON printers(site_id, name);

-- ============================================================================
-- H3: Fix cash_register UNIQUE constraint to use site_id instead of deprecated site
-- ============================================================================

-- Drop old constraint based on deprecated column
ALTER TABLE cash_register DROP CONSTRAINT IF EXISTS cash_register_site_terminal_key;
-- Add new constraint on correct columns
CREATE UNIQUE INDEX IF NOT EXISTS uq_cash_register_site_terminal ON cash_register(site_id, terminal);
