-- ============================================================================
-- V6: Rate extended fields — tarifa mínima, máxima, recargos, días semana,
--     categoría (STANDARD/MONTHLY/AGREEMENT/PREPAID) y tipo PER_MINUTE
-- ============================================================================

-- Valor mínimo cobrable por sesión (null = sin mínimo)
ALTER TABLE rate
    ADD COLUMN IF NOT EXISTS min_session_value NUMERIC(10,2);

-- Valor máximo cobrable por sesión (reemplaza/complementa max_daily_value)
ALTER TABLE rate
    ADD COLUMN IF NOT EXISTS max_session_value NUMERIC(10,2);

-- Recargo adicional nocturno en porcentaje (0 = no aplica)
ALTER TABLE rate
    ADD COLUMN IF NOT EXISTS night_surcharge_percent NUMERIC(5,2) NOT NULL DEFAULT 0;

-- Recargo adicional festivo en porcentaje (0 = no aplica)
ALTER TABLE rate
    ADD COLUMN IF NOT EXISTS holiday_surcharge_percent NUMERIC(5,2) NOT NULL DEFAULT 0;

-- Bitmap de días de la semana (bits 0-6 = Lun-Dom, null = todos los días)
-- Ejemplo: 0b0111110 = Lun-Vie (62), 0b1100000 = Sáb-Dom (96)
ALTER TABLE rate
    ADD COLUMN IF NOT EXISTS applies_days_bitmap SMALLINT;

-- Categoría semántica de la tarifa
ALTER TABLE rate
    ADD COLUMN IF NOT EXISTS category VARCHAR(20) NOT NULL DEFAULT 'STANDARD';

-- Índice por categoría para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_rate_category ON rate(category);
CREATE INDEX IF NOT EXISTS idx_rate_site ON rate(site);
