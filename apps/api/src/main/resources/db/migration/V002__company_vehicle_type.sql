-- ============================================================
-- Migración V002: Company Vehicle Type
-- Tabla de relación entre empresas y tipos de vehículo
-- Cada empresa tiene sus propios tipos seleccionados durante onboarding
-- ============================================================

CREATE TABLE company_vehicle_type (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    company_id UUID NOT NULL,
    vehicle_type_id UUID NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    display_order INT DEFAULT 0 NOT NULL,
    requires_plate BOOLEAN,
    has_own_rate BOOLEAN,
    quick_access BOOLEAN,
    requires_photo BOOLEAN,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT pk_company_vehicle_type PRIMARY KEY (id),
    CONSTRAINT uq_company_vehicle_type UNIQUE (company_id, vehicle_type_id),
    CONSTRAINT fk_company_vehicle_type_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    CONSTRAINT fk_company_vehicle_type_vehicle_type FOREIGN KEY (vehicle_type_id) REFERENCES master_vehicle_type(id) ON DELETE CASCADE
);

CREATE INDEX idx_cvt_company_id ON company_vehicle_type(company_id);
CREATE INDEX idx_cvt_vehicle_type_id ON company_vehicle_type(vehicle_type_id);
