-- V005: Fix Ticket Counter Multi-tenancy and Parking Session constraints

-- 1. Add company_id to ticket_counter
ALTER TABLE ticket_counter ADD COLUMN IF NOT EXISTS company_id UUID;

-- 2. Drop global unique constraint on ticket_number
ALTER TABLE parking_session DROP CONSTRAINT IF EXISTS parking_session_ticket_number_key;

-- 3. Add tenant-aware unique constraint on ticket_number
ALTER TABLE parking_session ADD CONSTRAINT parking_session_company_id_ticket_number_key UNIQUE (company_id, ticket_number);
