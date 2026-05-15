-- ============================================================================
-- V004: Add missing columns for multi-tenancy and advanced features
-- ============================================================================

-- 1. Add company_id to tables missing it
ALTER TABLE monthly_contract ADD COLUMN IF NOT EXISTS company_id UUID;
CREATE INDEX IF NOT EXISTS idx_monthly_contract_company ON monthly_contract(company_id);

ALTER TABLE rate ADD COLUMN IF NOT EXISTS company_id UUID;
CREATE INDEX IF NOT EXISTS idx_rate_company ON rate(company_id);

ALTER TABLE prepaid_package ADD COLUMN IF NOT EXISTS company_id UUID;
CREATE INDEX IF NOT EXISTS idx_prepaid_package_company ON prepaid_package(company_id);

ALTER TABLE prepaid_balance ADD COLUMN IF NOT EXISTS company_id UUID;
CREATE INDEX IF NOT EXISTS idx_prepaid_balance_company ON prepaid_balance(company_id);

-- 2. Add missing columns to parking_session
ALTER TABLE parking_session ADD COLUMN IF NOT EXISTS agreement_code VARCHAR(50);
ALTER TABLE parking_session ADD COLUMN IF NOT EXISTS applied_prepaid_minutes INT DEFAULT 0;
ALTER TABLE parking_session ADD COLUMN IF NOT EXISTS is_monthly_session BOOLEAN DEFAULT FALSE;

-- 3. Add foreign key constraints
ALTER TABLE monthly_contract ADD CONSTRAINT fk_monthly_contract_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL;
ALTER TABLE rate ADD CONSTRAINT fk_rate_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL;
ALTER TABLE prepaid_package ADD CONSTRAINT fk_prepaid_package_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL;
ALTER TABLE prepaid_balance ADD CONSTRAINT fk_prepaid_balance_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL;
