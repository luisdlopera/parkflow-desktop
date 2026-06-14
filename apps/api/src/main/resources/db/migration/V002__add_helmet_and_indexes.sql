-- Añadir la columna has_helmet a parking_session
ALTER TABLE parking_session ADD COLUMN has_helmet BOOLEAN DEFAULT FALSE NOT NULL;

-- Indice parcial para prevenir "Race Conditions" de multiples sesiones activas con la misma placa
CREATE UNIQUE INDEX IF NOT EXISTS idx_uq_active_plate_company 
ON parking_session (company_id, plate) 
WHERE status = 'ACTIVE';

-- Indices sugeridos para mejorar rendimiento de N+1 y consultas de historiales (P2)
CREATE INDEX IF NOT EXISTS idx_parking_session_status_company_entry 
ON parking_session (status, company_id, entry_at);

CREATE INDEX IF NOT EXISTS idx_parking_session_company_plate 
ON parking_session (company_id, plate);
