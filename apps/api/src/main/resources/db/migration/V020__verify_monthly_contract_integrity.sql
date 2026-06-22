-- V020: Verify monthly_contract refactor integrity (post-V015)
-- This migration validates that V015 completed successfully
-- Raises errors if orphaned records or missing relationships are detected

-- 1. Verify all monthly_contract records have client_id
DO $$
DECLARE
    orphaned_count INT;
BEGIN
    SELECT COUNT(*) INTO orphaned_count
    FROM monthly_contract
    WHERE client_id IS NULL;

    IF orphaned_count > 0 THEN
        RAISE EXCEPTION 'Monthly contract integrity check failed: % orphaned records without client_id', orphaned_count;
    END IF;
END;
$$;

-- 2. Verify all monthly_contract records have vehicle_id
DO $$
DECLARE
    orphaned_count INT;
BEGIN
    SELECT COUNT(*) INTO orphaned_count
    FROM monthly_contract
    WHERE vehicle_id IS NULL;

    IF orphaned_count > 0 THEN
        RAISE EXCEPTION 'Monthly contract integrity check failed: % orphaned records without vehicle_id', orphaned_count;
    END IF;
END;
$$;

-- 3. Verify all monthly_contract have valid status
DO $$
DECLARE
    invalid_count INT;
BEGIN
    SELECT COUNT(*) INTO invalid_count
    FROM monthly_contract
    WHERE status NOT IN ('ACTIVE', 'CANCELLED', 'SUSPENDED', 'EXPIRED');

    IF invalid_count > 0 THEN
        RAISE EXCEPTION 'Monthly contract integrity check failed: % records with invalid status', invalid_count;
    END IF;
END;
$$;

-- 4. Verify FK relationships are valid
DO $$
DECLARE
    invalid_fk_client INT;
    invalid_fk_vehicle INT;
BEGIN
    -- Check client FK
    SELECT COUNT(*) INTO invalid_fk_client
    FROM monthly_contract mc
    WHERE NOT EXISTS (SELECT 1 FROM client c WHERE c.id = mc.client_id);

    IF invalid_fk_client > 0 THEN
        RAISE EXCEPTION 'Monthly contract integrity check failed: % records with invalid client_id FK', invalid_fk_client;
    END IF;

    -- Check vehicle FK
    SELECT COUNT(*) INTO invalid_fk_vehicle
    FROM monthly_contract mc
    WHERE NOT EXISTS (SELECT 1 FROM vehicle v WHERE v.id = mc.vehicle_id);

    IF invalid_fk_vehicle > 0 THEN
        RAISE EXCEPTION 'Monthly contract integrity check failed: % records with invalid vehicle_id FK', invalid_fk_vehicle;
    END IF;
END;
$$;

-- Log successful integrity verification
-- This is informational only and doesn't block deployment
DO $$
DECLARE
    total_contracts INT;
BEGIN
    SELECT COUNT(*) INTO total_contracts FROM monthly_contract;
    RAISE NOTICE 'Monthly contract integrity verified: % records successfully refactored', total_contracts;
END;
$$;
