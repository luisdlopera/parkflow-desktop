WITH ranked_defaults AS (
    SELECT
        id,
        ROW_NUMBER() OVER (PARTITION BY site_id ORDER BY created_at ASC, id ASC) AS rn
    FROM printers
    WHERE is_default = TRUE
)
UPDATE printers p
SET is_default = FALSE
FROM ranked_defaults r
WHERE p.id = r.id
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS printers_unique_default_per_site
    ON printers (site_id)
    WHERE is_default = TRUE;
