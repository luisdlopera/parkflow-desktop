-- ==============================================================================
-- Migration: V002__create_audit_schema.sql
-- Description: Creates the enterprise audit log table with support for JSONB,
--              integrity hashing, and advanced indexing for rapid querying.
-- ==============================================================================

CREATE TABLE audit_event (
    id UUID PRIMARY KEY,
    correlation_id VARCHAR(100) NOT NULL,
    timestamp_utc TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
    
    -- User Context
    user_id UUID,
    username VARCHAR(150),
    role VARCHAR(100),
    branch_id UUID,
    
    -- Request Context
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    device VARCHAR(100),
    
    -- Action Context
    module VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    entity_name VARCHAR(100),
    entity_id VARCHAR(100),
    status VARCHAR(20) NOT NULL, -- EXITOSA, FALLIDA
    
    -- Data Changes (JSONB for flexibility and performance)
    old_data JSONB,
    new_data JSONB,
    modified_fields JSONB,
    
    -- Additional Info
    reason TEXT,
    observations TEXT,
    execution_time_ms BIGINT,
    
    -- Security / Blockchain-like integrity
    integrity_hash VARCHAR(256) NOT NULL,
    previous_hash VARCHAR(256)
);

-- Indexes for performance
CREATE INDEX idx_audit_event_timestamp ON audit_event(timestamp_utc DESC);
CREATE INDEX idx_audit_event_correlation ON audit_event(correlation_id);
CREATE INDEX idx_audit_event_user ON audit_event(user_id);
CREATE INDEX idx_audit_event_module_action ON audit_event(module, action);
CREATE INDEX idx_audit_event_entity ON audit_event(entity_name, entity_id);

-- Optional: GIN Index if we need to search within the JSONB data frequently
-- CREATE INDEX idx_audit_event_old_data ON audit_event USING GIN (old_data);
-- CREATE INDEX idx_audit_event_new_data ON audit_event USING GIN (new_data);

-- Comment to document table purpose
COMMENT ON TABLE audit_event IS 'Enterprise audit log table with immutability hashing and JSONB data tracking';
