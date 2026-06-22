-- V022: Drop deprecated columns after consolidation
-- These columns were legacy/transitional and should have been removed after migration
-- Dropping them reduces schema complexity and prevents confusion

-- 1. Drop deprecated columns from app_user
ALTER TABLE app_user DROP COLUMN IF EXISTS site;
ALTER TABLE app_user DROP COLUMN IF EXISTS terminal;

-- 2. Drop deprecated columns from parking_session
ALTER TABLE parking_session DROP COLUMN IF EXISTS site;
ALTER TABLE parking_session DROP COLUMN IF EXISTS site_code;
ALTER TABLE parking_session DROP COLUMN IF EXISTS lane;
ALTER TABLE parking_session DROP COLUMN IF EXISTS booth;
ALTER TABLE parking_session DROP COLUMN IF EXISTS terminal;

-- 3. Drop deprecated string column from rate (keep UUID version)
ALTER TABLE rate DROP COLUMN IF EXISTS site;

-- 4. Drop deprecated column from cash_register
ALTER TABLE cash_register DROP COLUMN IF EXISTS site;

-- 5. Drop deprecated columns from monthly_contract (already done in V015, but be defensive)
-- Note: holder_*, plate, is_active, vehicle_type were already dropped in V015
-- This is just defensive check

-- Verify no deprecated columns remain
DO $$
DECLARE
    column_count INT;
BEGIN
    SELECT COUNT(*)::INT INTO column_count
    FROM information_schema.columns
    WHERE table_schema = 'public'
        AND column_name IN ('site', 'terminal', 'site_code', 'lane', 'booth')
        AND table_name IN ('app_user', 'parking_session', 'rate', 'cash_register', 'monthly_contract');

    IF column_count > 0 THEN
        RAISE NOTICE 'Warning: % deprecated columns still exist after V022', column_count;
    ELSE
        RAISE NOTICE 'V022 complete: All deprecated columns successfully removed';
    END IF;
END;
$$;
