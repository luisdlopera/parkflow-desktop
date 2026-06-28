-- Add FRACTIONAL to rate_type constraint to match Java RateType enum
-- Without this, inserting RateType.FRACTIONAL raises a DB constraint violation.
-- Date: 2026-06-28

ALTER TABLE rate DROP CONSTRAINT IF EXISTS chk_rate_type;

ALTER TABLE rate ADD CONSTRAINT chk_rate_type CHECK (
    rate_type IN ('PER_MINUTE', 'HOURLY', 'DAILY', 'FLAT', 'FRACTIONAL')
);
