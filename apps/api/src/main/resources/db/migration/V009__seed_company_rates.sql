-- ============================================================================
-- V009: Seed default rates per company (all vehicle types)
-- ============================================================================
--
-- Why:
-- - Operations resolve rates by company + site + vehicle type.
-- - Some environments only had global/default rates and no company-scoped rates,
--   which caused "No se encontró tarifa aplicable..." on entry registration.
--
-- Strategy:
-- - Insert one active generic rate per vehicle type for every company.
-- - Keep site NULL so the rate can apply to any site.
-- - Idempotent by (company_id, vehicle_type, site IS NULL).

INSERT INTO rate (
  company_id, name, vehicle_type, rate_type, amount,
  grace_minutes, tolerance_minutes, fraction_minutes,
  rounding_mode, lost_ticket_surcharge, is_active, site,
  base_value, base_minutes, additional_value, additional_minutes,
  max_daily_value
)
SELECT
  c.id, 'Tarifa Base Carro', 'CAR', 'HOURLY', 2000,
  5, 0, 60,
  'NEAREST', 15000, TRUE, NULL,
  0, 0, 0, 0,
  20000
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM rate r
  WHERE r.company_id = c.id
    AND r.vehicle_type = 'CAR'
    AND r.site IS NULL
);

INSERT INTO rate (
  company_id, name, vehicle_type, rate_type, amount,
  grace_minutes, tolerance_minutes, fraction_minutes,
  rounding_mode, lost_ticket_surcharge, is_active, site,
  base_value, base_minutes, additional_value, additional_minutes,
  max_daily_value
)
SELECT
  c.id, 'Tarifa Base Moto', 'MOTORCYCLE', 'HOURLY', 1000,
  5, 0, 60,
  'NEAREST', 10000, TRUE, NULL,
  0, 0, 0, 0,
  10000
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM rate r
  WHERE r.company_id = c.id
    AND r.vehicle_type = 'MOTORCYCLE'
    AND r.site IS NULL
);

INSERT INTO rate (
  company_id, name, vehicle_type, rate_type, amount,
  grace_minutes, tolerance_minutes, fraction_minutes,
  rounding_mode, lost_ticket_surcharge, is_active, site,
  base_value, base_minutes, additional_value, additional_minutes,
  max_daily_value
)
SELECT
  c.id, 'Tarifa Base Bicicleta', 'BICYCLE', 'HOURLY', 500,
  5, 0, 60,
  'NEAREST', 5000, TRUE, NULL,
  0, 0, 0, 0,
  5000
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM rate r
  WHERE r.company_id = c.id
    AND r.vehicle_type = 'BICYCLE'
    AND r.site IS NULL
);

INSERT INTO rate (
  company_id, name, vehicle_type, rate_type, amount,
  grace_minutes, tolerance_minutes, fraction_minutes,
  rounding_mode, lost_ticket_surcharge, is_active, site,
  base_value, base_minutes, additional_value, additional_minutes,
  max_daily_value
)
SELECT
  c.id, 'Tarifa Base Van', 'VAN', 'HOURLY', 3000,
  5, 0, 60,
  'NEAREST', 20000, TRUE, NULL,
  0, 0, 0, 0,
  30000
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM rate r
  WHERE r.company_id = c.id
    AND r.vehicle_type = 'VAN'
    AND r.site IS NULL
);

INSERT INTO rate (
  company_id, name, vehicle_type, rate_type, amount,
  grace_minutes, tolerance_minutes, fraction_minutes,
  rounding_mode, lost_ticket_surcharge, is_active, site,
  base_value, base_minutes, additional_value, additional_minutes,
  max_daily_value
)
SELECT
  c.id, 'Tarifa Base Camión', 'TRUCK', 'HOURLY', 5000,
  5, 0, 60,
  'NEAREST', 25000, TRUE, NULL,
  0, 0, 0, 0,
  50000
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM rate r
  WHERE r.company_id = c.id
    AND r.vehicle_type = 'TRUCK'
    AND r.site IS NULL
);

INSERT INTO rate (
  company_id, name, vehicle_type, rate_type, amount,
  grace_minutes, tolerance_minutes, fraction_minutes,
  rounding_mode, lost_ticket_surcharge, is_active, site,
  base_value, base_minutes, additional_value, additional_minutes,
  max_daily_value
)
SELECT
  c.id, 'Tarifa Base Bus', 'BUS', 'HOURLY', 4000,
  5, 0, 60,
  'NEAREST', 20000, TRUE, NULL,
  0, 0, 0, 0,
  40000
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM rate r
  WHERE r.company_id = c.id
    AND r.vehicle_type = 'BUS'
    AND r.site IS NULL
);

INSERT INTO rate (
  company_id, name, vehicle_type, rate_type, amount,
  grace_minutes, tolerance_minutes, fraction_minutes,
  rounding_mode, lost_ticket_surcharge, is_active, site,
  base_value, base_minutes, additional_value, additional_minutes,
  max_daily_value
)
SELECT
  c.id, 'Tarifa Base Eléctrico', 'ELECTRIC', 'HOURLY', 2200,
  5, 0, 60,
  'NEAREST', 15000, TRUE, NULL,
  0, 0, 0, 0,
  22000
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM rate r
  WHERE r.company_id = c.id
    AND r.vehicle_type = 'ELECTRIC'
    AND r.site IS NULL
);

INSERT INTO rate (
  company_id, name, vehicle_type, rate_type, amount,
  grace_minutes, tolerance_minutes, fraction_minutes,
  rounding_mode, lost_ticket_surcharge, is_active, site,
  base_value, base_minutes, additional_value, additional_minutes,
  max_daily_value
)
SELECT
  c.id, 'Tarifa Base Otro', 'OTHER', 'HOURLY', 2000,
  5, 0, 60,
  'NEAREST', 15000, TRUE, NULL,
  0, 0, 0, 0,
  20000
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM rate r
  WHERE r.company_id = c.id
    AND r.vehicle_type = 'OTHER'
    AND r.site IS NULL
);
