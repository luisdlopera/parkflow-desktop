-- ============================================================================
-- V8: Agreements (convenios empresariales) + Prepaid packages & balances
-- ============================================================================

-- -----------------------------------------------------------------------
-- Convenios empresariales
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agreement (
    id                  UUID         DEFAULT gen_random_uuid() NOT NULL,
    code                VARCHAR(40)  NOT NULL,
    company_name        VARCHAR(200) NOT NULL,
    discount_percent    NUMERIC(5,2) DEFAULT 0  NOT NULL,
    max_hours_per_day   INT          DEFAULT 0  NOT NULL,   -- 0 = ilimitado
    flat_amount         NUMERIC(12,2),                      -- cobro fijo en lugar de %
    rate_id             UUID,                               -- tarifa especial
    site                VARCHAR(80),
    site_id             UUID,
    valid_from          DATE,
    valid_to            DATE,
    is_active           BOOLEAN      DEFAULT TRUE  NOT NULL,
    notes               TEXT,
    created_at          TIMESTAMPTZ  DEFAULT NOW() NOT NULL,
    updated_at          TIMESTAMPTZ  DEFAULT NOW() NOT NULL
);

ALTER TABLE agreement
    ADD CONSTRAINT agreement_pkey PRIMARY KEY (id);

ALTER TABLE agreement
    ADD CONSTRAINT agreement_code_key UNIQUE (code);

ALTER TABLE agreement
    ADD CONSTRAINT agreement_rate_id_fkey
    FOREIGN KEY (rate_id) REFERENCES rate(id) ON DELETE SET NULL;

ALTER TABLE agreement
    ADD CONSTRAINT agreement_site_id_fkey
    FOREIGN KEY (site_id) REFERENCES parking_sites(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_agreement_code   ON agreement(code);
CREATE INDEX IF NOT EXISTS idx_agreement_active ON agreement(is_active);
CREATE INDEX IF NOT EXISTS idx_agreement_site   ON agreement(site);

-- -----------------------------------------------------------------------
-- Paquetes prepagados (definición de paquete)
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS prepaid_package (
    id              UUID         DEFAULT gen_random_uuid() NOT NULL,
    name            VARCHAR(120) NOT NULL,
    hours_included  INT          NOT NULL,   -- horas incluidas
    amount          NUMERIC(12,2) NOT NULL,  -- precio de compra
    vehicle_type    VARCHAR(30),
    site            VARCHAR(80),
    site_id         UUID,
    expires_days    INT          DEFAULT 30  NOT NULL,   -- validez en días tras compra
    is_active       BOOLEAN      DEFAULT TRUE  NOT NULL,
    created_at      TIMESTAMPTZ  DEFAULT NOW() NOT NULL,
    updated_at      TIMESTAMPTZ  DEFAULT NOW() NOT NULL
);

ALTER TABLE prepaid_package
    ADD CONSTRAINT prepaid_package_pkey PRIMARY KEY (id);

ALTER TABLE prepaid_package
    ADD CONSTRAINT prepaid_package_site_id_fkey
    FOREIGN KEY (site_id) REFERENCES parking_sites(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_prepaid_package_active ON prepaid_package(is_active);
CREATE INDEX IF NOT EXISTS idx_prepaid_package_site   ON prepaid_package(site);

-- -----------------------------------------------------------------------
-- Saldos prepagados por placa (compra/uso de paquetes)
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS prepaid_balance (
    id                  UUID         DEFAULT gen_random_uuid() NOT NULL,
    package_id          UUID         NOT NULL,
    plate               VARCHAR(20)  NOT NULL,
    holder_name         VARCHAR(120),
    remaining_minutes   INT          NOT NULL,
    purchased_at        TIMESTAMPTZ  DEFAULT NOW() NOT NULL,
    expires_at          TIMESTAMPTZ  NOT NULL,
    is_active           BOOLEAN      DEFAULT TRUE  NOT NULL,
    created_by_id       UUID,
    created_at          TIMESTAMPTZ  DEFAULT NOW() NOT NULL,
    updated_at          TIMESTAMPTZ  DEFAULT NOW() NOT NULL
);

ALTER TABLE prepaid_balance
    ADD CONSTRAINT prepaid_balance_pkey PRIMARY KEY (id);

ALTER TABLE prepaid_balance
    ADD CONSTRAINT prepaid_balance_package_id_fkey
    FOREIGN KEY (package_id) REFERENCES prepaid_package(id);

ALTER TABLE prepaid_balance
    ADD CONSTRAINT prepaid_balance_created_by_fkey
    FOREIGN KEY (created_by_id) REFERENCES app_user(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_prepaid_balance_plate  ON prepaid_balance(plate);
CREATE INDEX IF NOT EXISTS idx_prepaid_balance_active ON prepaid_balance(is_active);
CREATE INDEX IF NOT EXISTS idx_prepaid_balance_expiry ON prepaid_balance(expires_at);

-- -----------------------------------------------------------------------
-- Tabla de deducción de minutos prepagados (trazabilidad por sesión)
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS prepaid_deduction (
    id              UUID         DEFAULT gen_random_uuid() NOT NULL,
    balance_id      UUID         NOT NULL,
    session_id      UUID,
    minutes_deducted INT         NOT NULL,
    created_at      TIMESTAMPTZ  DEFAULT NOW() NOT NULL
);

ALTER TABLE prepaid_deduction
    ADD CONSTRAINT prepaid_deduction_pkey PRIMARY KEY (id);

ALTER TABLE prepaid_deduction
    ADD CONSTRAINT prepaid_deduction_balance_id_fkey
    FOREIGN KEY (balance_id) REFERENCES prepaid_balance(id) ON DELETE CASCADE;

ALTER TABLE prepaid_deduction
    ADD CONSTRAINT prepaid_deduction_session_id_fkey
    FOREIGN KEY (session_id) REFERENCES parking_session(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_prepaid_deduction_balance ON prepaid_deduction(balance_id);
