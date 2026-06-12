-- Migration to alter applies_days_bitmap column type to INTEGER
ALTER TABLE rate ALTER COLUMN applies_days_bitmap TYPE INTEGER;
