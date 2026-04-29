-- Parking session inventory: denormalized plate, image URLs, sync status,
-- and unified LOST_TICKET status (kept lost_ticket boolean for back-compat).

ALTER TABLE parking_session
  ADD COLUMN plate VARCHAR(16),
  ADD COLUMN entry_image_url TEXT,
  ADD COLUMN exit_image_url TEXT,
  ADD COLUMN sync_status VARCHAR(20) NOT NULL DEFAULT 'SYNCED';

UPDATE parking_session ps
   SET plate = v.plate
  FROM vehicle v
 WHERE ps.vehicle_id = v.id
   AND ps.plate IS NULL;

ALTER TABLE parking_session
  ALTER COLUMN plate SET NOT NULL;

UPDATE parking_session
   SET status = 'LOST_TICKET'
 WHERE status = 'CLOSED'
   AND lost_ticket = TRUE;

CREATE INDEX IF NOT EXISTS idx_parking_session_plate_only
  ON parking_session (plate);

CREATE INDEX IF NOT EXISTS idx_parking_session_sync_status
  ON parking_session (sync_status)
  WHERE sync_status = 'PENDING';
