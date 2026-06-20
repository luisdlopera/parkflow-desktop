CREATE INDEX IF NOT EXISTS idx_audit_tenant_date ON audit_event (branch_id, timestamp_utc DESC);
CREATE INDEX IF NOT EXISTS idx_audit_module_action ON audit_event (branch_id, module, action);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_event (branch_id, user_id);
