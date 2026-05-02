-- ============================================================================
-- LICENSE BLOCK EVENTS - Tabla para auditoría de bloqueos
-- ============================================================================

CREATE TABLE IF NOT EXISTS license_block_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    device_id UUID REFERENCES licensed_devices(id) ON DELETE SET NULL,

    -- Tipo y razón del bloqueo
    event_type VARCHAR(50) NOT NULL,
    reason_code VARCHAR(100) NOT NULL,
    reason_description VARCHAR(500) NOT NULL,

    -- Estado de la empresa al momento del bloqueo
    company_status_at_block VARCHAR(20),
    company_plan_at_block VARCHAR(20),
    expires_at_at_block TIMESTAMP WITH TIME ZONE,
    grace_until_at_block TIMESTAMP WITH TIME ZONE,
    days_since_expiration INTEGER,

    -- Información del dispositivo
    device_fingerprint VARCHAR(100),
    device_hostname VARCHAR(100),
    device_os VARCHAR(50),
    app_version VARCHAR(50),

    -- Información de red
    ip_address VARCHAR(50),
    request_metadata TEXT,

    -- Resultados de verificaciones
    signature_valid BOOLEAN,
    fingerprint_valid BOOLEAN,
    tamper_check_passed BOOLEAN,
    tamper_check_details VARCHAR(200),
    tamper_violation_count INTEGER,

    -- Heartbeat
    last_heartbeat_at TIMESTAMP WITH TIME ZONE,
    minutes_since_last_heartbeat INTEGER,

    -- Control de bloqueo
    auto_blocked BOOLEAN NOT NULL DEFAULT TRUE,
    blocked_by VARCHAR(100),

    -- Resolución
    resolved BOOLEAN NOT NULL DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by VARCHAR(100),
    resolution_notes TEXT,
    false_positive BOOLEAN DEFAULT FALSE,
    corrective_action VARCHAR(100),

    -- Detalles técnicos
    technical_details TEXT,

    -- Información de pago (para casos post-bloqueo)
    payment_received_after_block BOOLEAN DEFAULT FALSE,
    payment_date TIMESTAMP WITH TIME ZONE,
    payment_reference VARCHAR(100),

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índices para consultas comunes
CREATE INDEX idx_block_events_company ON license_block_events(company_id, created_at DESC);
CREATE INDEX idx_block_events_device ON license_block_events(device_id, created_at DESC);
CREATE INDEX idx_block_events_unresolved ON license_block_events(resolved, created_at DESC) WHERE resolved = FALSE;
CREATE INDEX idx_block_events_reason ON license_block_events(reason_code, created_at DESC);
CREATE INDEX idx_block_events_false_positive ON license_block_events(false_positive) WHERE false_positive = TRUE;
CREATE INDEX idx_block_events_payment_after ON license_block_events(payment_received_after_block) WHERE payment_received_after_block = TRUE;
CREATE INDEX idx_block_events_created_at ON license_block_events(created_at DESC);

-- Índice compuesto para consultas de soporte
CREATE INDEX idx_block_events_support ON license_block_events(company_id, resolved, payment_received_after_block);

-- ============================================================================
-- VISTA para dashboard de soporte
-- ============================================================================

CREATE OR REPLACE VIEW support_dashboard AS
SELECT
    lbe.id as block_event_id,
    lbe.company_id,
    c.name as company_name,
    c.status as current_status,
    c.plan as current_plan,
    lbe.reason_description as block_reason,
    lbe.created_at as block_date,
    lbe.resolved,
    lbe.resolved_at,
    lbe.payment_received_after_block,
    lbe.payment_date,
    lbe.payment_reference,
    EXTRACT(DAY FROM (CURRENT_TIMESTAMP - lbe.created_at)) as days_blocked,
    CASE
        WHEN c.plan = 'ENTERPRISE' THEN 'HIGH'
        WHEN c.plan = 'PRO' THEN 'MEDIUM'
        ELSE 'LOW'
    END as priority,
    lbe.device_fingerprint,
    lbe.device_hostname
FROM license_block_events lbe
JOIN companies c ON lbe.company_id = c.id
WHERE lbe.resolved = FALSE
ORDER BY
    CASE c.plan
        WHEN 'ENTERPRISE' THEN 1
        WHEN 'PRO' THEN 2
        ELSE 3
    END,
    lbe.created_at DESC;

-- ============================================================================
-- FUNCIÓN para alertas de bloqueos prioritarios
-- ============================================================================

CREATE OR REPLACE FUNCTION get_priority_block_cases()
RETURNS TABLE (
    block_event_id UUID,
    company_id UUID,
    company_name VARCHAR(200),
    company_status VARCHAR(20),
    block_reason VARCHAR(500),
    block_date TIMESTAMP WITH TIME ZONE,
    payment_date TIMESTAMP WITH TIME ZONE,
    payment_reference VARCHAR(100),
    days_blocked NUMERIC,
    priority VARCHAR(10)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        lbe.id,
        lbe.company_id,
        c.name,
        c.status::VARCHAR(20),
        lbe.reason_description,
        lbe.created_at,
        lbe.payment_date,
        lbe.payment_reference,
        EXTRACT(DAY FROM (CURRENT_TIMESTAMP - lbe.created_at)),
        CASE
            WHEN c.plan = 'ENTERPRISE' THEN 'HIGH'::VARCHAR(10)
            WHEN c.plan = 'PRO' THEN 'MEDIUM'::VARCHAR(10)
            ELSE 'LOW'::VARCHAR(10)
        END
    FROM license_block_events lbe
    JOIN companies c ON lbe.company_id = c.id
    WHERE lbe.resolved = FALSE
      AND lbe.payment_received_after_block = TRUE
    ORDER BY
        CASE c.plan
            WHEN 'ENTERPRISE' THEN 1
            WHEN 'PRO' THEN 2
            ELSE 3
        END,
        lbe.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGER para notificar nuevos bloqueos (opcional - requiere configuración)
-- ============================================================================

-- Función que se ejecuta en cada nuevo bloqueo
CREATE OR REPLACE FUNCTION notify_new_block_event()
RETURNS TRIGGER AS $$
BEGIN
    -- Aquí podrías integrar con un sistema de notificaciones
    -- Por ejemplo: enviar email a soporte, Slack, etc.

    -- Por ahora solo logueamos
    RAISE NOTICE 'Nuevo evento de bloqueo: % - Empresa: % - Razón: %',
        NEW.id, NEW.company_id, NEW.reason_description;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear el trigger
DROP TRIGGER IF EXISTS trg_notify_block_event ON license_block_events;
CREATE TRIGGER trg_notify_block_event
    AFTER INSERT ON license_block_events
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_block_event();
