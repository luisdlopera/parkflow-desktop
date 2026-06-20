-- V011: Trazabilidad de denominaciones de arqueo de caja
-- Reemplaza el campo TEXT counted_denominations por una tabla normalizada.
-- Permite consultas analíticas directas sin parsear JSON.

CREATE TABLE cash_session_denomination (
    id              UUID          DEFAULT gen_random_uuid() NOT NULL,
    company_id      UUID          NOT NULL,
    cash_session_id UUID          NOT NULL,
    denomination    NUMERIC(14,2) NOT NULL,
    quantity        INTEGER       NOT NULL CHECK (quantity >= 0),
    subtotal        NUMERIC(14,2) GENERATED ALWAYS AS (denomination * quantity) STORED,
    created_at      TIMESTAMPTZ   DEFAULT NOW() NOT NULL,

    CONSTRAINT cash_session_denomination_pkey
        PRIMARY KEY (id),

    CONSTRAINT cash_session_denomination_cash_session_fkey
        FOREIGN KEY (cash_session_id)
        REFERENCES cash_session(id)
        ON DELETE CASCADE
);

-- Índice principal: consultas por sesión (siempre el acceso más común)
CREATE INDEX idx_csd_cash_session_id
    ON cash_session_denomination (cash_session_id);

-- Índice compuesto para analítica multi-tenant: denominaciones por empresa y periodo
CREATE INDEX idx_csd_company_denomination
    ON cash_session_denomination (company_id, denomination);
