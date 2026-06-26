-- [A1/M12] Auto-unlock brute-force lockout by time instead of requiring admin intervention
-- Adds blocked_until to app_user so LoginUseCase can auto-unlock after 30 min

ALTER TABLE app_user
    ADD COLUMN IF NOT EXISTS blocked_until TIMESTAMPTZ;

COMMENT ON COLUMN app_user.blocked_until IS
    'When a lockout expires. NULL = not time-locked. If now > blocked_until AND is_blocked is true, auto-unlock.';
