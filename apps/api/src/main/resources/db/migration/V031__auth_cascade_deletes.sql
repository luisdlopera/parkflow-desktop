-- V031: Add ON DELETE CASCADE to auth_sessions foreign keys
-- Context: Deleting a user or revoking a device left orphaned sessions in auth_sessions.
-- ON DELETE CASCADE ensures sessions are automatically cleaned up when their parent is removed.

-- Drop existing FK constraints (they have no ON DELETE action = RESTRICT by default)
ALTER TABLE auth_sessions
    DROP CONSTRAINT IF EXISTS auth_sessions_user_id_fkey,
    DROP CONSTRAINT IF EXISTS auth_sessions_device_pk_fkey;

-- Recreate with ON DELETE CASCADE: removing a user or device removes their sessions
ALTER TABLE auth_sessions
    ADD CONSTRAINT auth_sessions_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES app_user(id) ON DELETE CASCADE,
    ADD CONSTRAINT auth_sessions_device_pk_fkey
        FOREIGN KEY (device_pk) REFERENCES authorized_devices(id) ON DELETE CASCADE;

-- auth_audit_log: preserve audit records after user/device deletion (SET NULL)
ALTER TABLE auth_audit_log
    DROP CONSTRAINT IF EXISTS auth_audit_log_user_id_fkey,
    DROP CONSTRAINT IF EXISTS auth_audit_log_device_pk_fkey;

ALTER TABLE auth_audit_log
    ADD CONSTRAINT auth_audit_log_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES app_user(id) ON DELETE SET NULL,
    ADD CONSTRAINT auth_audit_log_device_pk_fkey
        FOREIGN KEY (device_pk) REFERENCES authorized_devices(id) ON DELETE SET NULL;
