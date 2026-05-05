-- ============================================================================
-- V2: Configuration Masters - Phase 1
-- Adds operational master tables for real parking management.
-- ============================================================================

-- ============================================================================
-- 1. Extend companies (licensing domain) with missing commercial fields
-- ============================================================================
ALTER TABLE companies
    ADD COLUMN IF NOT EXISTS legal_name VARCHAR(200),
    ADD COLUMN IF NOT EXISTS operation_mode VARCHAR(20) NOT NULL DEFAULT 'OFFLINE',
    ADD COLUMN IF NOT EXISTS allow_sync BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS observations TEXT;

CREATE INDEX IF NOT EXISTS idx_companies_operation_mode ON companies(operation_mode);

-- ============================================================================
-- 2. Parking Sites (Sedes / Parqueaderos)
-- ============================================================================
CREATE TABLE IF NOT EXISTS parking_sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL,
    address VARCHAR(300),
    city VARCHAR(100),
    phone VARCHAR(50),
    manager_name VARCHAR(150),
    timezone VARCHAR(50) NOT NULL DEFAULT 'America/Bogota',
    currency VARCHAR(10) NOT NULL DEFAULT 'COP',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_parking_sites_company ON parking_sites(company_id);
CREATE INDEX IF NOT EXISTS idx_parking_sites_active ON parking_sites(is_active);
CREATE INDEX IF NOT EXISTS idx_parking_sites_code ON parking_sites(code);

-- Insert default site linked to development company
INSERT INTO parking_sites (id, company_id, code, name, city, timezone, currency)
VALUES (
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'DEFAULT',
    'Sede Principal',
    'Bogotá',
    'America/Bogota',
    'COP'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 3. Payment Methods (Métodos de Pago Configurables)
-- ============================================================================
CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    requires_reference BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payment_methods_active ON payment_methods(is_active);
CREATE INDEX IF NOT EXISTS idx_payment_methods_order ON payment_methods(display_order);

-- Default Colombian payment methods
INSERT INTO payment_methods (code, name, requires_reference, display_order)
VALUES
    ('CASH', 'Efectivo', FALSE, 1),
    ('TRANSFER', 'Transferencia', TRUE, 2),
    ('CARD', 'Datáfono', TRUE, 3),
    ('NEQUI', 'Nequi', TRUE, 4),
    ('DAVIPLATA', 'Daviplata', TRUE, 5),
    ('COURTESY', 'Cortesía', FALSE, 6),
    ('AGREEMENT', 'Convenio', TRUE, 7)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- 4. Extend master_vehicle_type
-- ============================================================================
ALTER TABLE master_vehicle_type
    ADD COLUMN IF NOT EXISTS requires_plate BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS requires_photo BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS display_order INT NOT NULL DEFAULT 0;

UPDATE master_vehicle_type SET display_order = 1 WHERE code = 'CAR';
UPDATE master_vehicle_type SET display_order = 2 WHERE code = 'MOTORCYCLE';
UPDATE master_vehicle_type SET display_order = 3 WHERE code = 'VAN';
UPDATE master_vehicle_type SET display_order = 4 WHERE code = 'TRUCK';
UPDATE master_vehicle_type SET display_order = 5 WHERE code = 'OTHER';

-- ============================================================================
-- 5. Printers (Impresoras)
-- ============================================================================
CREATE TABLE IF NOT EXISTS printers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID NOT NULL REFERENCES parking_sites(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    type VARCHAR(20) NOT NULL,        -- THERMAL, PDF, OS
    connection VARCHAR(20) NOT NULL,    -- USB, NET, BLUETOOTH, LOCAL_AGENT
    paper_width_mm INT NOT NULL DEFAULT 80,
    endpoint_or_device VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_printers_site ON printers(site_id);
CREATE INDEX IF NOT EXISTS idx_printers_active ON printers(is_active);
CREATE INDEX IF NOT EXISTS idx_printers_default ON printers(site_id, is_default) WHERE is_default = TRUE;

-- ============================================================================
-- 6. Extend cash_register
-- ============================================================================
ALTER TABLE cash_register
    ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES parking_sites(id),
    ADD COLUMN IF NOT EXISTS code VARCHAR(20),
    ADD COLUMN IF NOT EXISTS name VARCHAR(120),
    ADD COLUMN IF NOT EXISTS printer_id UUID REFERENCES printers(id),
    ADD COLUMN IF NOT EXISTS responsible_user_id UUID REFERENCES app_user(id);

-- Migrate existing cash registers to default site
UPDATE cash_register SET site_id = '00000000-0000-0000-0000-000000000002' WHERE site_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_cash_register_site ON cash_register(site_id);
CREATE INDEX IF NOT EXISTS idx_cash_register_printer ON cash_register(printer_id);

-- ============================================================================
-- 7. Extend rate (Tarifas) with new billing fields and site FK
-- ============================================================================
ALTER TABLE rate
    ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES parking_sites(id),
    ADD COLUMN IF NOT EXISTS base_value NUMERIC(10,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS base_minutes INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS additional_value NUMERIC(10,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS additional_minutes INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS max_daily_value NUMERIC(10,2),
    ADD COLUMN IF NOT EXISTS applies_night BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS applies_holiday BOOLEAN NOT NULL DEFAULT FALSE;

-- Migrate existing rates to default site
UPDATE rate SET site_id = '00000000-0000-0000-0000-000000000002' WHERE site_id IS NULL;

-- Add new rate types: MINUTE, FRACTION, MONTHLY
-- Note: existing enum in application code will be extended

CREATE INDEX IF NOT EXISTS idx_rate_site_id ON rate(site_id);
CREATE INDEX IF NOT EXISTS idx_rate_active_site ON rate(site_id, is_active);

-- ============================================================================
-- 8. Rate Fractions (Fracciones de Cobro)
-- ============================================================================
CREATE TABLE IF NOT EXISTS rate_fractions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rate_id UUID NOT NULL REFERENCES rate(id) ON DELETE CASCADE,
    from_minute INT NOT NULL,
    to_minute INT NOT NULL,
    value NUMERIC(10,2) NOT NULL,
    round_up BOOLEAN NOT NULL DEFAULT TRUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_rate_fraction_range CHECK (from_minute < to_minute)
);

CREATE INDEX IF NOT EXISTS idx_rate_fractions_rate ON rate_fractions(rate_id);
CREATE INDEX IF NOT EXISTS idx_rate_fractions_active ON rate_fractions(is_active);

-- ============================================================================
-- 9. Operational Parameters (Parámetros Operativos por Sede)
-- ============================================================================
CREATE TABLE IF NOT EXISTS operational_parameters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID NOT NULL UNIQUE REFERENCES parking_sites(id) ON DELETE CASCADE,
    allow_entry_without_printer BOOLEAN NOT NULL DEFAULT FALSE,
    allow_exit_without_payment BOOLEAN NOT NULL DEFAULT FALSE,
    allow_reprint BOOLEAN NOT NULL DEFAULT TRUE,
    allow_void BOOLEAN NOT NULL DEFAULT TRUE,
    require_photo_entry BOOLEAN NOT NULL DEFAULT FALSE,
    require_photo_exit BOOLEAN NOT NULL DEFAULT FALSE,
    tolerance_minutes INT NOT NULL DEFAULT 0,
    max_time_no_charge INT NOT NULL DEFAULT 0,
    legal_message TEXT,
    offline_mode_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_operational_parameters_site ON operational_parameters(site_id);

-- Insert default parameters for default site
INSERT INTO operational_parameters (site_id)
VALUES ('00000000-0000-0000-0000-000000000002')
ON CONFLICT (site_id) DO NOTHING;

-- ============================================================================
-- 10. Extend app_user (Users) with operational permissions
-- ============================================================================
ALTER TABLE app_user
    ADD COLUMN IF NOT EXISTS can_void_tickets BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS can_reprint_tickets BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS can_close_cash BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS require_password_change BOOLEAN NOT NULL DEFAULT FALSE;

-- Set default permissions based on existing roles
UPDATE app_user SET can_void_tickets = TRUE, can_reprint_tickets = TRUE, can_close_cash = TRUE WHERE role IN ('SUPER_ADMIN', 'ADMIN');
