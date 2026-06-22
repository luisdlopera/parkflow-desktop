-- V021: Consolidate payment_methods to per-company model
-- Decision: REMOVE global (company_id IS NULL) entries and enforce per-company entries only
-- Rationale:
-- - V001 created global catalog (company_id IS NULL)
-- - V003-V004 added per-company overrides (company_id IS NOT NULL)
-- - Mixed model caused ambiguity: same code could have different names/requirements
-- - Solution: Eliminate global, ensure each company has explicit methods configuration

-- 1. Before consolidation: Backfill missing per-company methods for all companies
-- If a company doesn't have CASH, CARD, TRANSFER, etc., copy from global defaults
INSERT INTO payment_methods (id, company_id, code, name, requires_reference, is_active, created_at, updated_at)
SELECT
    gen_random_uuid(),
    c.id,
    gpm.code,
    gpm.name,
    gpm.requires_reference,
    gpm.is_active,
    now(),
    now()
FROM companies c
CROSS JOIN (
    SELECT DISTINCT code, name, requires_reference, is_active
    FROM payment_methods
    WHERE company_id IS NULL
) gpm
WHERE NOT EXISTS (
    SELECT 1 FROM payment_methods pm
    WHERE pm.company_id = c.id AND pm.code = gpm.code
)
AND c.status = 'ACTIVE';

-- 2. Remove global payment methods (company_id IS NULL)
DELETE FROM payment_methods WHERE company_id IS NULL;

-- 3. Verify all companies have core payment methods (CASH, CARD, TRANSFER)
-- If any are missing, create defaults
DO $$
DECLARE
    company_record RECORD;
    required_codes TEXT[] := ARRAY['CASH', 'CARD', 'TRANSFER'];
    code_to_add TEXT;
BEGIN
    FOR company_record IN SELECT DISTINCT company_id FROM payment_methods LOOP
        FOREACH code_to_add IN ARRAY required_codes LOOP
            IF NOT EXISTS (
                SELECT 1 FROM payment_methods
                WHERE company_id = company_record.company_id AND code = code_to_add
            ) THEN
                INSERT INTO payment_methods (id, company_id, code, name, requires_reference, is_active, created_at, updated_at)
                VALUES (
                    gen_random_uuid(),
                    company_record.company_id,
                    code_to_add,
                    code_to_add,
                    code_to_add IN ('TRANSFER', 'CHECK'),
                    TRUE,
                    now(),
                    now()
                );
            END IF;
        END LOOP;
    END LOOP;
END;
$$;

-- 4. Add constraint to enforce per-company uniqueness
ALTER TABLE payment_methods ADD CONSTRAINT payment_methods_code_company_unique
    UNIQUE (code, company_id);

-- 5. Verify consolidation
DO $$
DECLARE
    global_count INT;
    total_count INT;
BEGIN
    SELECT COUNT(*) INTO global_count FROM payment_methods WHERE company_id IS NULL;
    SELECT COUNT(*) INTO total_count FROM payment_methods;

    IF global_count > 0 THEN
        RAISE EXCEPTION 'Payment methods consolidation failed: % global entries remain', global_count;
    END IF;

    RAISE NOTICE 'Payment methods consolidation verified: % total entries (all per-company)', total_count;
END;
$$;
