-- Add version column for Optimistic Locking in cash_register
ALTER TABLE cash_register ADD COLUMN IF NOT EXISTS version BIGINT DEFAULT 0;

-- Indexes for performance (N+1 and Search)
CREATE INDEX IF NOT EXISTS idx_vehicle_plate ON vehicle (plate);
CREATE INDEX IF NOT EXISTS idx_parking_session_status_company ON parking_session (status, company_id);
CREATE INDEX IF NOT EXISTS idx_parking_session_ticket_company ON parking_session (ticket_number, company_id);
