ALTER TABLE master_vehicle_type
    ADD COLUMN IF NOT EXISTS icon VARCHAR(40) DEFAULT '🚗' NOT NULL,
    ADD COLUMN IF NOT EXISTS color VARCHAR(20) DEFAULT '#2563EB' NOT NULL,
    ADD COLUMN IF NOT EXISTS has_own_rate BOOLEAN DEFAULT TRUE NOT NULL,
    ADD COLUMN IF NOT EXISTS quick_access BOOLEAN DEFAULT TRUE NOT NULL;

UPDATE master_vehicle_type
SET
    name = 'Carro',
    icon = '🚗',
    color = '#2563EB',
    requires_plate = TRUE,
    has_own_rate = TRUE,
    quick_access = TRUE,
    display_order = 1
WHERE code = 'CAR';

UPDATE master_vehicle_type
SET
    name = 'Moto',
    icon = '🏍️',
    color = '#059669',
    requires_plate = TRUE,
    has_own_rate = TRUE,
    quick_access = TRUE,
    display_order = 2
WHERE code = 'MOTORCYCLE';

INSERT INTO master_vehicle_type (code, name, icon, color, is_active, requires_plate, has_own_rate, quick_access, requires_photo, display_order)
VALUES
    ('BICYCLE', 'Bicicleta', '🚲', '#16A34A', TRUE, FALSE, TRUE, TRUE, FALSE, 3),
    ('BUS', 'Bus', '🚌', '#CA8A04', TRUE, TRUE, TRUE, TRUE, FALSE, 6),
    ('ELECTRIC', 'Eléctrico', '⚡', '#0D9488', TRUE, TRUE, TRUE, TRUE, FALSE, 7)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    icon = EXCLUDED.icon,
    color = EXCLUDED.color,
    requires_plate = EXCLUDED.requires_plate,
    has_own_rate = EXCLUDED.has_own_rate,
    quick_access = EXCLUDED.quick_access,
    display_order = EXCLUDED.display_order,
    updated_at = NOW();

UPDATE master_vehicle_type
SET icon = '🚐', color = '#7C3AED', has_own_rate = TRUE, quick_access = TRUE, display_order = 4
WHERE code = 'VAN';

UPDATE master_vehicle_type
SET icon = '🚛', color = '#EA580C', has_own_rate = TRUE, quick_access = TRUE, display_order = 5
WHERE code = 'TRUCK';

UPDATE master_vehicle_type
SET icon = '🚙', color = '#64748B', requires_plate = FALSE, has_own_rate = FALSE, quick_access = FALSE, display_order = 8
WHERE code = 'OTHER';
