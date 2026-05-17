-- V006: Add Onboarding Snapshots and Configuration Versioning
CREATE TABLE company_settings_snapshot (
    id UUID PRIMARY KEY,
    company_id UUID NOT NULL,
    version INT NOT NULL,
    settings_json JSONB NOT NULL,
    progress_data JSONB NOT NULL,
    reason VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_by VARCHAR(255) NOT NULL,
    CONSTRAINT fk_company_settings_snapshot_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE INDEX idx_company_settings_snapshot_company ON company_settings_snapshot(company_id);
