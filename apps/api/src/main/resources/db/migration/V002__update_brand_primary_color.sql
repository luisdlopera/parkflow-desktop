-- Migrate legacy orange primary color (#f97316) to new terracota brand color (#D97757)
-- Affects only rows that still have the original default — custom colors are untouched
UPDATE theme_configuration
SET primary_color = '#D97757',
    updated_at    = NOW()
WHERE primary_color = '#f97316';

-- Update the column default so new tenants get the new brand color
ALTER TABLE theme_configuration
    ALTER COLUMN primary_color SET DEFAULT '#D97757';
