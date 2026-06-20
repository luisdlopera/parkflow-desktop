-- V013: Add tax fields to rate tariff
-- Adds IVA/tax support to rate pricing configuration

ALTER TABLE rate
    ADD COLUMN IF NOT EXISTS tax_percentage    NUMERIC(5,2)  NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tax_included      BOOLEAN       NOT NULL DEFAULT TRUE;
