-- Create API Keys table for secure API key management
--
-- Stores hashed API keys with metadata for audit and rotation tracking
-- Keys are company-specific and can be rotated without breaking existing keys during grace period

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL,
  key_hash VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(500),
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL DEFAULT '9999-12-31 23:59:59',
  rotated_from_id UUID,

  -- Indexes for common queries
  CONSTRAINT fk_api_keys_company_id FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_api_keys_rotated_from FOREIGN KEY (rotated_from_id) REFERENCES api_keys(id) ON DELETE SET NULL
);

-- Index for finding keys by hash (authentication lookups)
CREATE INDEX idx_api_key_key_hash ON api_keys(key_hash);

-- Index for company-specific key listing
CREATE INDEX idx_api_key_company_id ON api_keys(company_id);

-- Index for finding active keys
CREATE INDEX idx_api_key_active ON api_keys(is_active);

-- Index for finding expired keys (cleanup operations)
CREATE INDEX idx_api_key_expires_at ON api_keys(expires_at);

-- Add comment documenting the table
COMMENT ON TABLE api_keys IS 'Stores API keys for service-to-service authentication. Keys are stored as hashes for security.';
COMMENT ON COLUMN api_keys.key_hash IS 'SHA-256 hash of the actual API key - never store the key itself';
COMMENT ON COLUMN api_keys.rotated_from_id IS 'Reference to previous key if this key was created via rotation (audit trail)';
