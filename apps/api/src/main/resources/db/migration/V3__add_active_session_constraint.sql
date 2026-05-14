-- ============================================================================
-- V3: Add Partial Unique Index for Active Sessions
-- Prevents a vehicle from having multiple ACTIVE sessions simultaneously.
-- ============================================================================

CREATE UNIQUE INDEX idx_parking_session_active_plate 
ON parking_session (plate) 
WHERE status = 'ACTIVE';

-- Add index for performance on common lookups
CREATE INDEX IF NOT EXISTS idx_parking_session_plate_status 
ON parking_session (plate, status);

-- Ensure vehicle plate is normalized (this should already be unique from V1, but let's be sure)
-- V1 has: ALTER TABLE vehicle ADD CONSTRAINT vehicle_plate_key UNIQUE (plate);
