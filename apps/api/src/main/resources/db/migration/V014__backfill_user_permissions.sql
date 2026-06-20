-- Backfill user-level permissions for existing users whose role grants those permissions
-- This ensures the per-user boolean flags match the role-based defaults
-- AFTER this migration, the UI can optionally override individual user flags

UPDATE app_user
SET can_reprint_tickets = TRUE
WHERE role IN ('SUPER_ADMIN', 'ADMIN', 'OPERADOR', 'CAJERO')
  AND can_reprint_tickets = FALSE;

UPDATE app_user
SET can_void_tickets = TRUE
WHERE role IN ('SUPER_ADMIN', 'ADMIN')
  AND can_void_tickets = FALSE;

UPDATE app_user
SET can_close_cash = TRUE
WHERE role IN ('SUPER_ADMIN', 'ADMIN', 'CAJERO')
  AND can_close_cash = FALSE;
