-- Rename helmet_token table to locker, add status column
ALTER TABLE helmet_token RENAME TO locker;
ALTER TABLE locker RENAME CONSTRAINT helmet_token_pkey TO locker_pkey;
ALTER TABLE locker RENAME CONSTRAINT uq_helmet_token_company_code TO uq_locker_company_code;

ALTER INDEX idx_helmet_token_company RENAME TO idx_locker_company;
ALTER INDEX idx_helmet_token_active RENAME TO idx_locker_active;

-- Add status column to locker (DISPONIBLE, OCUPADO, FUERA_DE_SERVICIO)
ALTER TABLE locker ADD COLUMN status VARCHAR(30) NOT NULL DEFAULT 'DISPONIBLE';

-- Update custodied_item references
ALTER TABLE custodied_item RENAME COLUMN token_id TO locker_id;
ALTER TABLE custodied_item RENAME CONSTRAINT custodied_item_token_id_fkey TO custodied_item_locker_id_fkey;
ALTER INDEX idx_custodied_item_token RENAME TO idx_custodied_item_locker;

-- Update unique constraint name in locker to reflect new column name internally
-- (the column was already named 'code', so the constraint name change is purely cosmetic)

COMMENT ON TABLE locker IS 'Lockers for helmet custody';
COMMENT ON COLUMN locker.status IS 'Locker status: DISPONIBLE, OCUPADO, FUERA_DE_SERVICIO';
COMMENT ON COLUMN locker.code IS 'Locker code (e.g. L-001, L-002)';
