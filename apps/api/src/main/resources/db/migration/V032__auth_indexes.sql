-- V032: Add missing performance indexes on auth tables
-- Context: auth_sessions and auth_audit_log had no indexes beyond UNIQUE constraints,
-- causing full table scans on every token validation and session lookup.

-- auth_sessions: fast lookup of active sessions per user (used in refresh, logout)
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_active
    ON auth_sessions(user_id, active)
    WHERE active = TRUE;

-- auth_sessions: fast lookup by refresh_jti during token rotation validation
CREATE INDEX IF NOT EXISTS idx_auth_sessions_refresh_jti
    ON auth_sessions(refresh_jti);

-- auth_sessions: fast lookup of sessions by device (used in device revocation)
CREATE INDEX IF NOT EXISTS idx_auth_sessions_device_pk
    ON auth_sessions(device_pk);

-- auth_sessions: fast cleanup queries for expired/revoked sessions
CREATE INDEX IF NOT EXISTS idx_auth_sessions_revoked_at
    ON auth_sessions(revoked_at)
    WHERE revoked_at IS NOT NULL;

-- auth_audit_log: fast querying of events by user and time (admin forensics)
CREATE INDEX IF NOT EXISTS idx_auth_audit_log_user_created
    ON auth_audit_log(user_id, created_at DESC);

-- auth_audit_log: fast time-based queries (audit log pagination)
CREATE INDEX IF NOT EXISTS idx_auth_audit_log_created_at
    ON auth_audit_log(created_at DESC);

-- password_reset_tokens: fast lookup of active (unused, non-expired) tokens per user
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_active
    ON password_reset_tokens(user_id, used)
    WHERE used = FALSE;
