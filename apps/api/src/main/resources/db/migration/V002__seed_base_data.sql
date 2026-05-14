-- ============================================================================
-- V002: Seed master data (secure + idempotent)
-- ============================================================================

-- Notes:
-- 1) This file seeds only the master/catalog data required for a fresh install:
--    plans, roles, permissions, role_permissions, vehicle types, payment methods, default rates.
-- 2) Demo/company/site/user data is intentionally gated behind the GUC
--    `parkflow.seed_demo = 'true'` to avoid shipping development credentials into production.
--    Operators may enable it on local/dev environments by running:
--      ALTER SYSTEM SET parkflow.seed_demo = 'true'; SELECT pg_reload_conf();
--    or by passing the setting when creating the database session.

-- ---------------------------------------------------------------------------
-- Plans (aligned with frontend/backend enums)
-- ---------------------------------------------------------------------------
INSERT INTO plans (code, name, monthly_price, yearly_price) VALUES
  ('LOCAL', 'Local (Offline)', 0, 0),
  ('SYNC', 'Sync (Cloud)', 0, 0),
  ('PRO', 'Pro', 99000, 990000),
  ('ENTERPRISE', 'Enterprise', 299000, 2990000)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  monthly_price = EXCLUDED.monthly_price,
  yearly_price = EXCLUDED.yearly_price,
  updated_at = NOW();

-- ---------------------------------------------------------------------------
-- Roles (use canonical uppercase codes used across frontend/backend)
-- ---------------------------------------------------------------------------
INSERT INTO roles (code, name) VALUES
  ('SUPER_ADMIN', 'Super Admin'),
  ('ADMIN', 'Administrador'),
  ('SUPERVISOR', 'Supervisor'),
  ('CAJERO', 'Cajero'),
  ('OPERADOR', 'Operador'),
  ('AUDITOR', 'Auditor')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  updated_at = NOW();

-- ---------------------------------------------------------------------------
-- Permissions (must match packages/types and frontend expectations)
-- ---------------------------------------------------------------------------
INSERT INTO permissions (code, description) VALUES
  ('tickets:emitir', 'Emitir tickets'),
  ('tickets:imprimir', 'Imprimir tickets'),
  ('cobros:registrar', 'Registrar cobros'),
  ('anulaciones:crear', 'Crear anulaciones'),
  ('tarifas:leer', 'Leer tarifas'),
  ('tarifas:editar', 'Editar tarifas'),
  ('usuarios:leer', 'Leer usuarios'),
  ('usuarios:editar', 'Editar usuarios'),
  ('cierres_caja:abrir', 'Abrir cierres de caja'),
  ('cierres_caja:cerrar', 'Cerrar cierres de caja'),
  ('reportes:leer', 'Leer reportes'),
  ('configuracion:leer', 'Leer configuración'),
  ('configuracion:editar', 'Editar configuración'),
  ('sync:push', 'Forzar push de sync'),
  ('sync:reconcile', 'Reconcilación de sync'),
  ('devices:autorizar', 'Autorizar dispositivos'),
  ('devices:revocar', 'Revocar dispositivos')
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Role permissions mapping (idempotent)
-- SUPER_ADMIN -> all permissions; others get sensible defaults
-- ---------------------------------------------------------------------------
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON (
  r.code = 'SUPER_ADMIN'
  OR (r.code = 'ADMIN' AND p.code IN ('tarifas:leer','tarifas:editar','usuarios:leer','usuarios:editar','configuracion:leer','configuracion:editar','reportes:leer'))
  OR (r.code = 'SUPERVISOR' AND p.code IN ('tickets:emitir','tickets:imprimir','reportes:leer','configuracion:leer'))
  OR (r.code = 'CAJERO' AND p.code IN ('tickets:emitir','cobros:registrar','cierres_caja:abrir','cierres_caja:cerrar'))
  OR (r.code = 'OPERADOR' AND p.code IN ('tickets:emitir','tickets:imprimir'))
  OR (r.code = 'AUDITOR' AND p.code IN ('reportes:leer'))
)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Master vehicle types (UI-friendly labels/icons) - idempotent
-- ---------------------------------------------------------------------------
INSERT INTO master_vehicle_type (code, name, icon, color, is_active, requires_plate, has_own_rate, quick_access, requires_photo, display_order) VALUES
    ('MOTORCYCLE', 'Moto', '🏍️', '#059669', TRUE, TRUE, TRUE, TRUE, FALSE, 1),
    ('CAR', 'Carro', '🚗', '#2563EB', TRUE, TRUE, TRUE, TRUE, FALSE, 2),
    ('BICYCLE', 'Bicicleta', '🚲', '#16A34A', TRUE, FALSE, TRUE, TRUE, FALSE, 3),
    ('VAN', 'Camioneta', '🚐', '#7C3AED', TRUE, TRUE, TRUE, TRUE, FALSE, 4),
    ('TRUCK', 'Camión', '🚛', '#EA580C', TRUE, TRUE, TRUE, TRUE, FALSE, 5),
    ('BUS', 'Bus', '🚌', '#CA8A04', TRUE, TRUE, TRUE, TRUE, FALSE, 6),
    ('ELECTRIC', 'Eléctrico', '⚡', '#0D9488', TRUE, TRUE, TRUE, TRUE, FALSE, 7),
    ('OTHER', 'Otro', '🚙', '#64748B', TRUE, FALSE, FALSE, FALSE, FALSE, 8)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    icon = EXCLUDED.icon,
    color = EXCLUDED.color,
    requires_plate = EXCLUDED.requires_plate,
    has_own_rate = EXCLUDED.has_own_rate,
    quick_access = EXCLUDED.quick_access,
    display_order = EXCLUDED.display_order,
    updated_at = NOW();

-- ---------------------------------------------------------------------------
-- Payment methods
-- ---------------------------------------------------------------------------
INSERT INTO payment_methods (code, name, requires_reference, display_order) VALUES
    ('CASH', 'Efectivo', FALSE, 1),
    ('DEBIT_CARD', 'Tarjeta débito', TRUE, 2),
    ('CREDIT_CARD', 'Tarjeta crédito', TRUE, 3),
    ('NEQUI', 'Nequi', TRUE, 4),
    ('DAVIPLATA', 'Daviplata', TRUE, 5),
    ('TRANSFER', 'Transferencia', TRUE, 6),
    ('QR', 'QR', TRUE, 7),
    ('AGREEMENT', 'Convenio', TRUE, 8),
    ('INTERNAL_CREDIT', 'Crédito interno', TRUE, 9),
    ('MIXED', 'Mixto', TRUE, 10),
    ('CARD', 'Datáfono / tarjeta legacy', TRUE, 11),
    ('OTHER', 'Otro', TRUE, 12)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    requires_reference = EXCLUDED.requires_reference,
    display_order = EXCLUDED.display_order,
    updated_at = NOW();

-- ---------------------------------------------------------------------------
-- Default generic rates per vehicle type (only if not present)
-- These are minimal defaults to allow operations to work and be adjusted later
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Demo data (company, site, superadmin, demo params)
-- This block is disabled by default to avoid shipping dev credentials into prod.
-- Enable by setting the database GUC `parkflow.seed_demo = 'true'` before running migrations.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF COALESCE(current_setting('parkflow.seed_demo', true), 'false') = 'true' THEN

    -- Demo company
    INSERT INTO companies (id, name, legal_name, nit, email, slug, status, max_devices, max_users, max_locations)
    VALUES ('00000000-0000-0000-0000-000000000001', 'Empresa Demo', 'Empresa Demo S.A.S.', '900123456', 'admin@parkflow.local', 'empresa-demo', 'ACTIVE', 10, 50, 5)
    ON CONFLICT (id) DO NOTHING;

    -- Demo parking site
    INSERT INTO parking_sites (id, company_id, code, name, city, timezone, currency, max_capacity)
    VALUES ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'DEFAULT', 'Sede Principal', 'Bogotá', 'America/Bogota', 'COP', 0)
    ON CONFLICT (id) DO NOTHING;

    -- Demo super admin account (require password change on first login)
    INSERT INTO app_user (id, company_id, name, email, role, password_hash, is_active, can_void_tickets, can_reprint_tickets, can_close_cash, require_password_change)
    VALUES ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Administrador', 'admin@parkflow.local', 'SUPER_ADMIN', '$2b$12$bU4bjxtQIMHP/us3972HTuIz.OM2128W34BtysTTH1AeqjInkGcRe', TRUE, TRUE, TRUE, TRUE, TRUE)
    ON CONFLICT (email) DO NOTHING;

    -- Demo operational parameters for the demo site
    INSERT INTO operational_parameters (site_id, allow_entry_without_printer, allow_exit_without_payment, allow_reprint, allow_void, require_photo_entry, require_photo_exit, tolerance_minutes, max_time_no_charge, offline_mode_enabled)
    VALUES ('00000000-0000-0000-0000-000000000002', FALSE, FALSE, TRUE, TRUE, FALSE, FALSE, 5, 15, TRUE)
    ON CONFLICT (site_id) DO NOTHING;

  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- Ticket counter default (avoid errors generating first ticket)
-- Ensure a global counter exists. Individual sites may use site-specific keys.
-- ---------------------------------------------------------------------------
INSERT INTO ticket_counter (counter_key, last_number, updated_at)
SELECT 'GLOBAL', 0, NOW()
WHERE NOT EXISTS (SELECT 1 FROM ticket_counter WHERE counter_key = 'GLOBAL');
