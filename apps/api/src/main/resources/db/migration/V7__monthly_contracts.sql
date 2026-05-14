-- ============================================================================
-- V7: Monthly contracts — mensualidades por placa/vehículo
-- ============================================================================

CREATE TABLE IF NOT EXISTS monthly_contract (
    id                  UUID        DEFAULT gen_random_uuid() NOT NULL,
    rate_id             UUID        NOT NULL,
    plate               VARCHAR(20) NOT NULL,
    vehicle_type        VARCHAR(30),
    holder_name         VARCHAR(120) NOT NULL,
    holder_document     VARCHAR(40),
    holder_phone        VARCHAR(30),
    holder_email        VARCHAR(120),
    site                VARCHAR(80)  NOT NULL DEFAULT 'DEFAULT',
    site_id             UUID,
    start_date          DATE         NOT NULL,
    end_date            DATE         NOT NULL,
    amount              NUMERIC(12,2) NOT NULL,
    is_active           BOOLEAN      DEFAULT TRUE  NOT NULL,
    notes               TEXT,
    created_by_id       UUID,
    updated_by_id       UUID,
    created_at          TIMESTAMPTZ  DEFAULT NOW() NOT NULL,
    updated_at          TIMESTAMPTZ  DEFAULT NOW() NOT NULL
);

ALTER TABLE monthly_contract
    ADD CONSTRAINT monthly_contract_pkey PRIMARY KEY (id);

ALTER TABLE monthly_contract
    ADD CONSTRAINT monthly_contract_rate_id_fkey
    FOREIGN KEY (rate_id) REFERENCES rate(id);

ALTER TABLE monthly_contract
    ADD CONSTRAINT monthly_contract_site_id_fkey
    FOREIGN KEY (site_id) REFERENCES parking_sites(id);

ALTER TABLE monthly_contract
    ADD CONSTRAINT monthly_contract_created_by_fkey
    FOREIGN KEY (created_by_id) REFERENCES app_user(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_monthly_contract_plate  ON monthly_contract(plate);
CREATE INDEX IF NOT EXISTS idx_monthly_contract_active ON monthly_contract(is_active);
CREATE INDEX IF NOT EXISTS idx_monthly_contract_dates  ON monthly_contract(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_monthly_contract_site   ON monthly_contract(site);
