CREATE TABLE global_audit_log (
    id UUID PRIMARY KEY,
    action VARCHAR(50) NOT NULL,
    user_id UUID,
    username VARCHAR(100),
    ip_address VARCHAR(45),
    device VARCHAR(255),
    previous_payload TEXT,
    new_payload TEXT,
    metadata TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_global_audit_action ON global_audit_log(action);
CREATE INDEX idx_global_audit_username ON global_audit_log(username);
CREATE INDEX idx_global_audit_created_at ON global_audit_log(created_at);
