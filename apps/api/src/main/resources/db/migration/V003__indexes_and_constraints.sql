-- ============================================================================
-- V003: Indexes and constraints
-- ============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email ON app_user(email);
CREATE INDEX IF NOT EXISTS idx_users_company_id ON app_user(company_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_companies_slug_idx ON companies(slug) WHERE slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_vehicles_plate ON vehicle(plate);
CREATE INDEX IF NOT EXISTS idx_vehicles_company_id ON vehicle(company_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_vehicle_type_id ON vehicle(vehicle_type_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_company_plate ON vehicle(company_id, plate);

CREATE INDEX IF NOT EXISTS idx_parking_sessions_vehicle_id ON parking_session(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_parking_sessions_status ON parking_session(status);
CREATE INDEX IF NOT EXISTS idx_parking_sessions_entry_at ON parking_session(entry_at);
CREATE INDEX IF NOT EXISTS idx_parking_sessions_exit_at ON parking_session(exit_at);
CREATE INDEX IF NOT EXISTS idx_parking_sessions_company_id ON parking_session(company_id);
CREATE INDEX IF NOT EXISTS idx_parking_sessions_company_status ON parking_session(company_id, status);

CREATE UNIQUE INDEX IF NOT EXISTS uq_parking_session_active_plate
ON parking_session(plate)
WHERE status = 'ACTIVE' AND plate IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_parking_session_active_company_plate
ON parking_session(company_id, plate)
WHERE status = 'ACTIVE' AND plate IS NOT NULL AND company_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payments_session_id ON payment(session_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payment(created_at);
CREATE INDEX IF NOT EXISTS idx_payments_company_id ON payment(company_id);

CREATE INDEX IF NOT EXISTS idx_cash_registers_company_id ON cash_register(site_id);
CREATE INDEX IF NOT EXISTS idx_cash_movements_cash_register_id ON cash_movement(cash_session_id);
CREATE INDEX IF NOT EXISTS idx_cash_movements_created_at ON cash_movement(created_at);

CREATE INDEX IF NOT EXISTS idx_audit_logs_company_id ON global_audit_log(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON global_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON global_audit_log(created_at);

-- app_user(email) already has UNIQUE from base schema; keep slug unique via index above.

ALTER TABLE cash_session ADD CONSTRAINT chk_cash_session_opening_amount_nonneg CHECK (opening_amount >= 0);
ALTER TABLE cash_movement ADD CONSTRAINT chk_cash_movement_amount_nonneg CHECK (amount >= 0);
ALTER TABLE payment ADD CONSTRAINT chk_payment_amount_nonneg CHECK (amount >= 0);
ALTER TABLE rate ADD CONSTRAINT chk_rate_amount_nonneg CHECK (amount >= 0);
ALTER TABLE rate ADD CONSTRAINT chk_rate_grace_minutes_nonneg CHECK (grace_minutes >= 0);
ALTER TABLE rate ADD CONSTRAINT chk_rate_fraction_minutes_positive CHECK (fraction_minutes > 0);
ALTER TABLE monthly_contract ADD CONSTRAINT chk_monthly_contract_amount_nonneg CHECK (amount >= 0);
ALTER TABLE prepaid_package ADD CONSTRAINT chk_prepaid_package_amount_nonneg CHECK (amount >= 0);
ALTER TABLE prepaid_balance ADD CONSTRAINT chk_prepaid_balance_remaining_minutes_nonneg CHECK (remaining_minutes >= 0);

CREATE UNIQUE INDEX IF NOT EXISTS printers_unique_default_per_site
    ON printers (site_id)
    WHERE is_default = TRUE;
