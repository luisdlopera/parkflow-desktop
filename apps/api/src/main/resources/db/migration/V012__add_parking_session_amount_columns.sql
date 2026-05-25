-- ============================================================================
-- V012: Add missing columns to parking_session (JPA entity alignment)
-- ============================================================================
-- The JPA entity ParkingSession.java has evolved with new fields that were
-- never added to the initial schema (V001). Hibernate's ddl-auto: update
-- masked this in dev, but validate mode in CI exposed the discrepancies.
--
-- Columns added in this migration:
--   - tax_amount, discount_amount, net_amount  (pricing breakdown)
--   - payment_method                           (exit payment method)
--   - country_code, entry_mode, no_plate       (entry metadata)
--   - no_plate_reason                          (why no plate was captured)
--   - is_monthly_session                       (subscriber flag)
--   - agreement_code                           (corporate agreement)
--   - applied_prepaid_minutes                  (prepaid deduction)
--   - version                                  (JPA optimistic locking)
-- ============================================================================

ALTER TABLE parking_session
    ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(10, 2),
    ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10, 2),
    ADD COLUMN IF NOT EXISTS net_amount NUMERIC(10, 2),
    ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50),
    ADD COLUMN IF NOT EXISTS country_code VARCHAR(2) DEFAULT 'CO',
    ADD COLUMN IF NOT EXISTS entry_mode VARCHAR(20) DEFAULT 'VISITOR',
    ADD COLUMN IF NOT EXISTS no_plate BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS no_plate_reason VARCHAR(200),
    ADD COLUMN IF NOT EXISTS is_monthly_session BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS agreement_code VARCHAR(50),
    ADD COLUMN IF NOT EXISTS applied_prepaid_minutes INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS version BIGINT DEFAULT 0;

-- Fix: the entity maps site to site_code, but V001 created 'site'.
-- Hibernate update may have auto-created 'site_code'. We ensure both exist.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'parking_session' AND column_name = 'site_code'
    ) THEN
        ALTER TABLE parking_session ADD COLUMN site_code VARCHAR(255);
    END IF;
END $$;
