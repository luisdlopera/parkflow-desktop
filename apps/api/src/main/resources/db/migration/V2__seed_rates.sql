-- Allow site to be NULL so rates work with any parking site
ALTER TABLE rate ALTER COLUMN site DROP NOT NULL;
ALTER TABLE rate ALTER COLUMN site SET DEFAULT NULL;

-- Default rates for each vehicle type (site=NULL = universal, matches any site)
INSERT INTO rate (name, vehicle_type, rate_type, amount, grace_minutes, fraction_minutes, site, max_daily_value)
SELECT 'Tarifa Genérica Auto', 'CAR', 'HOURLY', 2000, 5, 60, NULL, 20000
WHERE NOT EXISTS (SELECT 1 FROM rate WHERE vehicle_type = 'CAR');

INSERT INTO rate (name, vehicle_type, rate_type, amount, grace_minutes, fraction_minutes, site, max_daily_value)
SELECT 'Tarifa Genérica Moto', 'MOTORCYCLE', 'HOURLY', 1000, 5, 60, NULL, 10000
WHERE NOT EXISTS (SELECT 1 FROM rate WHERE vehicle_type = 'MOTORCYCLE');

INSERT INTO rate (name, vehicle_type, rate_type, amount, grace_minutes, fraction_minutes, site, max_daily_value)
SELECT 'Tarifa Genérica Camioneta', 'VAN', 'HOURLY', 3000, 5, 60, NULL, 30000
WHERE NOT EXISTS (SELECT 1 FROM rate WHERE vehicle_type = 'VAN');

INSERT INTO rate (name, vehicle_type, rate_type, amount, grace_minutes, fraction_minutes, site, max_daily_value)
SELECT 'Tarifa Genérica Camión', 'TRUCK', 'HOURLY', 5000, 5, 60, NULL, 50000
WHERE NOT EXISTS (SELECT 1 FROM rate WHERE vehicle_type = 'TRUCK');

INSERT INTO rate (name, vehicle_type, rate_type, amount, grace_minutes, fraction_minutes, site, max_daily_value)
SELECT 'Tarifa Genérica Otro', 'OTHER', 'HOURLY', 2000, 5, 60, NULL, 20000
WHERE NOT EXISTS (SELECT 1 FROM rate WHERE vehicle_type = 'OTHER');

INSERT INTO rate (name, vehicle_type, rate_type, amount, grace_minutes, fraction_minutes, site, max_daily_value)
SELECT 'Tarifa Genérica (comodín)', NULL, 'HOURLY', 2000, 5, 60, NULL, 20000
WHERE NOT EXISTS (SELECT 1 FROM rate WHERE vehicle_type IS NULL AND site IS NULL);
