-- Rename helmet_locker table and related objects to helmet_token
ALTER TABLE helmet_locker RENAME TO helmet_token;
ALTER TABLE helmet_token RENAME CONSTRAINT helmet_locker_pkey TO helmet_token_pkey;
ALTER TABLE helmet_token RENAME CONSTRAINT uq_helmet_locker_company_code TO uq_helmet_token_company_code;

ALTER INDEX idx_helmet_locker_company RENAME TO idx_helmet_token_company;
ALTER INDEX idx_helmet_locker_active RENAME TO idx_helmet_token_active;

ALTER TABLE custodied_item RENAME COLUMN locker_id TO token_id;
ALTER TABLE custodied_item RENAME CONSTRAINT custodied_item_locker_id_fkey TO custodied_item_token_id_fkey;
ALTER INDEX idx_custodied_item_locker RENAME TO idx_custodied_item_token;
