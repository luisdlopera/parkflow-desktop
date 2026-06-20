-- Migration to remove split-brain authorization and add brute-force protection
ALTER TABLE app_user DROP COLUMN can_void_tickets;
ALTER TABLE app_user DROP COLUMN can_reprint_tickets;
ALTER TABLE app_user DROP COLUMN can_close_cash;

ALTER TABLE app_user ADD COLUMN is_blocked BOOLEAN DEFAULT FALSE NOT NULL;
ALTER TABLE app_user ADD COLUMN failed_login_attempts INT DEFAULT 0 NOT NULL;
