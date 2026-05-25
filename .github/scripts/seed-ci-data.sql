-- ============================================================================
-- CI Seed Data — Idempotent inserts for E2E critical flows
-- ============================================================================
-- Run AFTER Flyway migrations complete and BEFORE run-critical-e2e.sh
-- Requires PostgreSQL client (psql) with env vars already exported
-- ============================================================================

-- Ensure demo company exists (idempotent)
INSERT INTO companies (id, name, legal_name, nit, email, slug, status, max_devices, max_users, max_locations)
VALUES ('00000000-0000-0000-0000-000000000001', 'Empresa Demo CI', 'Empresa Demo CI S.A.S.', '900123456', 'admin@parkflow.local', 'empresa-demo-ci', 'ACTIVE', 10, 50, 5)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  updated_at = NOW();

-- Ensure demo parking site exists
INSERT INTO parking_sites (id, company_id, code, name, city, timezone, currency, max_capacity)
VALUES ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'DEFAULT', 'Sede Principal CI', 'Bogota', 'America/Bogota', 'COP', 0)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  updated_at = NOW();

-- Ensure admin user exists (password: Admin123!)
INSERT INTO app_user (id, company_id, name, email, role, password_hash, is_active, can_void_tickets, can_reprint_tickets, can_close_cash, require_password_change)
VALUES ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Administrador', 'admin@parkflow.local', 'SUPER_ADMIN', crypt('Admin123!', gen_salt('bf', 12)), TRUE, TRUE, TRUE, TRUE, FALSE)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  is_active = TRUE,
  role = 'SUPER_ADMIN',
  updated_at = NOW();

-- Ensure cashier user exists (password: Cashier123!)
INSERT INTO app_user (id, company_id, name, email, role, password_hash, is_active, can_void_tickets, can_reprint_tickets, can_close_cash, require_password_change)
VALUES ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Cajero', 'cashier@parkflow.local', 'CAJERO', crypt('Cashier123!', gen_salt('bf', 12)), TRUE, FALSE, FALSE, TRUE, FALSE)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  is_active = TRUE,
  role = 'CAJERO',
  updated_at = NOW();

-- Ensure operational parameters exist for the site
INSERT INTO operational_parameters (site_id, allow_entry_without_printer, allow_exit_without_payment, allow_reprint, allow_void, require_photo_entry, require_photo_exit, tolerance_minutes, max_time_no_charge, offline_mode_enabled)
VALUES ('00000000-0000-0000-0000-000000000002', FALSE, FALSE, TRUE, TRUE, FALSE, FALSE, 5, 15, TRUE)
ON CONFLICT (site_id) DO NOTHING;

-- Ensure a CAR rate exists with the fixed UUID expected by run-critical-e2e.sh
INSERT INTO rate (
  id, company_id, name, vehicle_type, rate_type, amount,
  grace_minutes, tolerance_minutes, fraction_minutes,
  rounding_mode, lost_ticket_surcharge, is_active, site,
  base_value, base_minutes, additional_value, additional_minutes,
  max_daily_value
)
VALUES (
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'Tarifa CI Carro', 'CAR', 'HOURLY', 2000,
  5, 0, 60,
  'NEAREST', 15000, TRUE, NULL,
  0, 0, 0, 0,
  20000
)
ON CONFLICT (id) DO UPDATE SET
  company_id = EXCLUDED.company_id,
  name = EXCLUDED.name,
  amount = EXCLUDED.amount,
  is_active = TRUE,
  updated_at = NOW();

-- Ensure ticket counter exists
INSERT INTO ticket_counter (counter_key, last_number, updated_at)
VALUES ('GLOBAL', 0, NOW())
ON CONFLICT (counter_key) DO NOTHING;
