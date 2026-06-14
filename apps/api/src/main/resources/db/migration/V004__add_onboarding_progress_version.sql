-- Add missing version column for optimistic locking
ALTER TABLE onboarding_progress ADD COLUMN version BIGINT NOT NULL DEFAULT 0;

UPDATE onboarding_progress SET version = 0 WHERE version IS NULL;
