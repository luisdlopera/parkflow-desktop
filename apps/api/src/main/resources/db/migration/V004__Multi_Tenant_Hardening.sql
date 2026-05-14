-- ============================================================================
-- V004: Multi-Tenant Hardening
-- Adds company_id to remaining operational tables, repairs existing data,
-- and enforces constraints for full physical isolation.
-- ============================================================================

-- 1. Configuration: Use the Demo Company ID for orphaned records
-- This ensures that legacy data is assigned to the primary tenant.
DO $$
DECLARE
    default_company_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN

    -- A. Add company_id to operational tables if missing
    ALTER TABLE cash_movement ADD COLUMN IF NOT EXISTS company_id UUID;
    ALTER TABLE cash_session ADD COLUMN IF NOT EXISTS company_id UUID;
    ALTER TABLE prepaid_balance ADD COLUMN IF NOT EXISTS company_id UUID;
    ALTER TABLE agreement ADD COLUMN IF NOT EXISTS company_id UUID;
    ALTER TABLE monthly_contract ADD COLUMN IF NOT EXISTS company_id UUID;
    ALTER TABLE operational_parameters ADD COLUMN IF NOT EXISTS company_id UUID;
    ALTER TABLE rate ADD COLUMN IF NOT EXISTS company_id UUID;
    ALTER TABLE print_jobs ADD COLUMN IF NOT EXISTS company_id UUID;
    ALTER TABLE sync_events ADD COLUMN IF NOT EXISTS company_id UUID;

    -- B. DATA REPAIR: Assign orphaned records to the default company
    UPDATE app_user SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE vehicle SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE parking_session SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE payment SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE cash_movement SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE cash_session SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE prepaid_balance SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE agreement SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE monthly_contract SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE operational_parameters SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE rate SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE print_jobs SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE sync_events SET company_id = default_company_id WHERE company_id IS NULL;

    -- C. ENFORCE CONSTRAINTS: Set NOT NULL where mandatory
    ALTER TABLE app_user ALTER COLUMN company_id SET NOT NULL;
    ALTER TABLE vehicle ALTER COLUMN company_id SET NOT NULL;
    ALTER TABLE parking_session ALTER COLUMN company_id SET NOT NULL;
    ALTER TABLE payment ALTER COLUMN company_id SET NOT NULL;
    ALTER TABLE cash_movement ALTER COLUMN company_id SET NOT NULL;
    ALTER TABLE cash_session ALTER COLUMN company_id SET NOT NULL;
    ALTER TABLE prepaid_balance ALTER COLUMN company_id SET NOT NULL;

END $$;

-- 2. Indexes for tenant filtering (Performance)
CREATE INDEX IF NOT EXISTS idx_parking_session_company ON parking_session(company_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_company ON vehicle(company_id);
CREATE INDEX IF NOT EXISTS idx_payment_company ON payment(company_id);
CREATE INDEX IF NOT EXISTS idx_cash_movement_company ON cash_movement(company_id);
CREATE INDEX IF NOT EXISTS idx_cash_session_company ON cash_session(company_id);
CREATE INDEX IF NOT EXISTS idx_prepaid_balance_company ON prepaid_balance(company_id);
CREATE INDEX IF NOT EXISTS idx_monthly_contract_company ON monthly_contract(company_id);

-- 3. Fix Plate Uniqueness for Multi-tenancy
-- Plate should be unique PER company, not globally.
ALTER TABLE vehicle DROP CONSTRAINT IF EXISTS vehicle_plate_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicle_plate_company ON vehicle(plate, company_id);

-- 4. Foreign Keys for Referential Integrity
-- Link to the central companies table
ALTER TABLE app_user ADD CONSTRAINT fk_app_user_company FOREIGN KEY (company_id) REFERENCES companies(id);
ALTER TABLE parking_session ADD CONSTRAINT fk_parking_session_company FOREIGN KEY (company_id) REFERENCES companies(id);
ALTER TABLE vehicle ADD CONSTRAINT fk_vehicle_company FOREIGN KEY (company_id) REFERENCES companies(id);
ALTER TABLE payment ADD CONSTRAINT fk_payment_company FOREIGN KEY (company_id) REFERENCES companies(id);
ALTER TABLE cash_session ADD CONSTRAINT fk_cash_session_company FOREIGN KEY (company_id) REFERENCES companies(id);
ALTER TABLE prepaid_balance ADD CONSTRAINT fk_prepaid_balance_company FOREIGN KEY (company_id) REFERENCES companies(id);
