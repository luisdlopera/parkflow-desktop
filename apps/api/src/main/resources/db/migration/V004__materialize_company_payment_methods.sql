-- Materialize per-company payment method records for companies that completed
-- onboarding before the V003 migration added per-company support.
-- Reads the paymentMethods array from each company's settings_json and
-- creates a row in payment_methods (company_id = company's id) using the
-- global catalogue (company_id IS NULL) as the source of name/metadata.
-- Idempotent: skips codes already present for the company.

INSERT INTO payment_methods (id, company_id, code, name, requires_reference, is_active, display_order, created_at, updated_at)
SELECT
    gen_random_uuid(),
    cs.company_id,
    pm_code,
    COALESCE(gpm.name, pm_code),
    COALESCE(gpm.requires_reference, false),
    true,
    COALESCE(gpm.display_order, 99),
    NOW(),
    NOW()
FROM company_settings cs
CROSS JOIN LATERAL (
    SELECT jsonb_array_elements_text(cs.settings_json -> 'paymentMethods') AS pm_code
) codes
LEFT JOIN payment_methods gpm
    ON gpm.code = pm_code AND gpm.company_id IS NULL
WHERE
    cs.settings_json ? 'paymentMethods'
    AND jsonb_array_length(cs.settings_json -> 'paymentMethods') > 0
    AND NOT EXISTS (
        SELECT 1 FROM payment_methods existing
        WHERE existing.company_id = cs.company_id
          AND existing.code = pm_code
    );
