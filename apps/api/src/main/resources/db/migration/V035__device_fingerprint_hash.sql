-- [A3] Hash device fingerprints — store SHA-256 instead of raw fingerprint string
-- Prevents enumeration if the authorized_devices table is ever compromised.

ALTER TABLE authorized_devices
    RENAME COLUMN fingerprint TO fingerprint_hash;

COMMENT ON COLUMN authorized_devices.fingerprint_hash IS
    'SHA-256 of the raw device fingerprint sent by the client. Never store the raw value.';
