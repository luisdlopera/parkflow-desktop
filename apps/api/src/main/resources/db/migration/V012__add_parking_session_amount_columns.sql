-- ============================================================================
-- V012: Add missing amount columns to parking_session
-- ============================================================================
-- These columns exist in the JPA entity (ParkingSession.java) but were
-- missing from the initial schema (V001), causing schema-validation failures
-- when using ddl-auto: validate.
-- ============================================================================

ALTER TABLE parking_session
    ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(10, 2),
    ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10, 2),
    ADD COLUMN IF NOT EXISTS net_amount NUMERIC(10, 2);
