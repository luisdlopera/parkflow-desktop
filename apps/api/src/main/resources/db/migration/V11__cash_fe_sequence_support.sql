CREATE TABLE IF NOT EXISTS cash_fe_sequence (
    site_code VARCHAR(80) NOT NULL,
    terminal VARCHAR(80) NOT NULL DEFAULT '',
    last_value BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT cash_fe_sequence_pk PRIMARY KEY (site_code, terminal)
);

ALTER TABLE cash_session ADD COLUMN IF NOT EXISTS support_document_number VARCHAR(120);
