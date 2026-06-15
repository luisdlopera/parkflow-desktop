-- Add missing version column for optimistic locking
ALTER TABLE cash_movement ADD COLUMN version BIGINT DEFAULT 0 NOT NULL;

UPDATE cash_movement SET version = 0 WHERE version IS NULL;
