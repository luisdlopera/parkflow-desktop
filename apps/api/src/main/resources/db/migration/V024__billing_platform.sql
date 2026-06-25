-- V023: Universal Electronic Billing Platform
-- Multi-provider, multi-tenant, multi-country invoice management
-- Provider abstraction: invoice_providers holds config per tenant per provider
-- Zero vendor lock-in: adding Siigo/Xero requires only a new Java adapter

-- ============================================================
-- 1. Invoice Provider Configuration (per tenant)
-- ============================================================
CREATE TABLE invoice_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    provider_type VARCHAR(50) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT false,
    is_default BOOLEAN NOT NULL DEFAULT false,
    country_code VARCHAR(5) NOT NULL DEFAULT 'CO',
    currency VARCHAR(3) NOT NULL DEFAULT 'COP',
    encrypted_credentials JSONB NOT NULL DEFAULT '{}',
    resolution_number VARCHAR(50),
    resolution_prefix VARCHAR(10),
    resolution_from BIGINT,
    resolution_to BIGINT,
    resolution_valid_from DATE,
    resolution_valid_to DATE,
    tax_regime VARCHAR(30),
    webhook_secret VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_resolution CHECK (
        resolution_from IS NULL OR resolution_to IS NULL OR resolution_from <= resolution_to
    )
);

-- Only one default active provider per company
CREATE UNIQUE INDEX idx_invoice_providers_default
    ON invoice_providers(company_id)
    WHERE is_default = true AND is_active = true;

-- ============================================================
-- 2. Electronic Invoices
-- ============================================================
CREATE TABLE electronic_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    number VARCHAR(50) NOT NULL,
    external_id VARCHAR(255),
    external_number VARCHAR(100),
    cufe VARCHAR(500),
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    provider_type VARCHAR(50) NOT NULL,
    client_id UUID REFERENCES client(id),
    subtotal NUMERIC(18,2) NOT NULL,
    tax_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
    total NUMERIC(18,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'COP',
    country_code VARCHAR(5) NOT NULL DEFAULT 'CO',
    source_type VARCHAR(50),
    source_id UUID,
    due_date DATE,
    issued_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    provider_raw_response JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(company_id, number)
);

-- ============================================================
-- 3. Invoice Items
-- ============================================================
CREATE TABLE electronic_invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES electronic_invoices(id) ON DELETE CASCADE,
    company_id UUID NOT NULL,
    description VARCHAR(500) NOT NULL,
    quantity NUMERIC(10,4) NOT NULL DEFAULT 1,
    unit_price NUMERIC(18,2) NOT NULL,
    discount_pct NUMERIC(5,2) DEFAULT 0,
    tax_pct NUMERIC(5,2) DEFAULT 0,
    tax_amount NUMERIC(18,2) DEFAULT 0,
    total NUMERIC(18,2) NOT NULL,
    product_code VARCHAR(100),
    unit_of_measure VARCHAR(30) DEFAULT 'UND',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 4. Credit / Debit Notes
-- ============================================================
CREATE TABLE invoice_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    invoice_id UUID NOT NULL REFERENCES electronic_invoices(id),
    note_type VARCHAR(10) NOT NULL CHECK (note_type IN ('CREDIT','DEBIT')),
    external_id VARCHAR(255),
    reason VARCHAR(500) NOT NULL,
    amount NUMERIC(18,2) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    provider_raw_response JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 5. Sync Logs (every provider API call)
-- ============================================================
CREATE TABLE electronic_invoice_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    invoice_id UUID REFERENCES electronic_invoices(id),
    provider_type VARCHAR(50) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    request_payload JSONB,
    response_payload JSONB,
    http_status INTEGER,
    error_message TEXT,
    duration_ms INTEGER,
    correlation_id VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 6. Incoming Provider Webhooks
-- ============================================================
CREATE TABLE invoice_provider_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    provider_type VARCHAR(50) NOT NULL,
    event_type VARCHAR(100),
    payload JSONB NOT NULL,
    signature VARCHAR(500),
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMPTZ,
    error_message TEXT,
    received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 7. Country Tax Configuration
-- ============================================================
CREATE TABLE country_tax_configuration (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country_code VARCHAR(5) NOT NULL,
    tax_name VARCHAR(50) NOT NULL,
    default_rate NUMERIC(5,2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(country_code, tax_name)
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX idx_invoices_company ON electronic_invoices(company_id);
CREATE INDEX idx_invoices_status ON electronic_invoices(company_id, status);
CREATE INDEX idx_invoices_source ON electronic_invoices(source_type, source_id);
CREATE INDEX idx_invoices_client ON electronic_invoices(client_id);
CREATE INDEX idx_invoices_created ON electronic_invoices(company_id, created_at DESC);
CREATE INDEX idx_invoice_items_invoice ON electronic_invoice_items(invoice_id);
CREATE INDEX idx_invoice_logs_invoice ON electronic_invoice_logs(invoice_id);
CREATE INDEX idx_invoice_logs_correlation ON electronic_invoice_logs(correlation_id);
CREATE INDEX idx_invoice_logs_company ON electronic_invoice_logs(company_id, created_at DESC);
CREATE INDEX idx_webhooks_provider ON invoice_provider_webhooks(provider_type, processed);
CREATE INDEX idx_providers_company ON invoice_providers(company_id, is_active);

-- ============================================================
-- Row Level Security (consistent with V019 pattern)
-- ============================================================
ALTER TABLE electronic_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_electronic_invoices ON electronic_invoices
    FOR ALL TO parkflow_app
    USING (
        company_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
        OR NULLIF(current_setting('app.tenant_id', true), '') IS NULL
    );

ALTER TABLE invoice_providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_invoice_providers ON invoice_providers
    FOR ALL TO parkflow_app
    USING (
        company_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
        OR NULLIF(current_setting('app.tenant_id', true), '') IS NULL
    );

ALTER TABLE electronic_invoice_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_electronic_invoice_items ON electronic_invoice_items
    FOR ALL TO parkflow_app
    USING (
        company_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
        OR NULLIF(current_setting('app.tenant_id', true), '') IS NULL
    );

ALTER TABLE invoice_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_invoice_notes ON invoice_notes
    FOR ALL TO parkflow_app
    USING (
        company_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
        OR NULLIF(current_setting('app.tenant_id', true), '') IS NULL
    );

-- ============================================================
-- Seed: Country Tax Configuration
-- ============================================================
INSERT INTO country_tax_configuration (country_code, tax_name, default_rate) VALUES
    ('CO', 'IVA',        19.00),
    ('CO', 'IVA_5',       5.00),
    ('CO', 'IVA_0',       0.00),
    ('CO', 'ICA',         0.00),
    ('MX', 'IVA',        16.00),
    ('MX', 'IEPS',        0.00),
    ('PE', 'IGV',        18.00),
    ('CL', 'IVA',        19.00),
    ('AR', 'IVA',        21.00),
    ('US', 'Sales Tax',   8.50),
    ('ES', 'IVA',        21.00),
    ('ES', 'IVA_10',     10.00),
    ('ES', 'IVA_4',       4.00);
