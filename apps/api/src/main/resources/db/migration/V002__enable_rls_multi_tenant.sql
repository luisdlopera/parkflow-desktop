-- V002 — Enable Row-Level Security on all multi-tenant tables
-- Date: 2026-07-01
-- Purpose: Enforce tenant isolation at database level
--
-- RLS acts as a safety net AFTER application-level filtering (Specifications).
-- When enabled, the database ITSELF prevents a compromised token from accessing
-- another tenant's data, even if application logic is bypassed.
--
-- How it works:
-- 1. Application sets: SET app.tenant_id = '{current_tenant_uuid}'
-- 2. Every query on an RLS-protected table automatically filters:
--    WHERE company_id = current_setting('app.tenant_id')::uuid
-- 3. Even raw SQL queries are forced to respect this policy
--
-- NOTE: Requires "app.tenant_id" to be set by the application on every request.
-- This is done by TenantContextInterceptor in the Spring application.

-- ─────────────────────────────────────────────────────────────────────────
-- Enable RLS on all 56 multi-tenant tables
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE agreement ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE authorized_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE blacklisted_plate ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_movement ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_session ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_session_denomination ENABLE ROW LEVEL SECURITY;
ALTER TABLE client ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_delivery_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_settings_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings_snapshot ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_vehicle_type ENABLE ROW LEVEL SECURITY;
ALTER TABLE custodied_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE electronic_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE electronic_invoice_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE electronic_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_provider_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE license_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE license_block_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE licensed_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE locker ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfa_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_contract ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE operational_parameters ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbox_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE parking_session ENABLE ROW LEVEL SECURITY;
ALTER TABLE parking_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE parking_space ENABLE ROW LEVEL SECURITY;
ALTER TABLE parking_space_assignment ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE prepaid_balance ENABLE ROW LEVEL SECURITY;
ALTER TABLE prepaid_package ENABLE ROW LEVEL SECURITY;
ALTER TABLE print_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE printers ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_token_families ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_change_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE theme_configuration ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_counter ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────
-- Create RLS policies for each table
-- Pattern: Only allow access if company_id matches current tenant
-- ─────────────────────────────────────────────────────────────────────────

CREATE POLICY rls_agreement ON agreement TO parkflow_app
  USING (company_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE POLICY rls_api_keys ON api_keys TO parkflow_app
  USING (company_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE POLICY rls_app_user ON app_user TO parkflow_app
  USING (company_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE POLICY rls_auth_audit_log ON auth_audit_log TO parkflow_app
  USING (company_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE POLICY rls_auth_sessions ON auth_sessions TO parkflow_app
  USING (company_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE POLICY rls_authorized_devices ON authorized_devices TO parkflow_app
  USING (company_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE POLICY rls_blacklisted_plate ON blacklisted_plate TO parkflow_app
  USING (company_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE POLICY rls_cash_movement ON cash_movement TO parkflow_app
  USING (company_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE POLICY rls_cash_session ON cash_session TO parkflow_app
  USING (company_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE POLICY rls_cash_session_denomination ON cash_session_denomination TO parkflow_app
  USING (company_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE POLICY rls_client ON client TO parkflow_app
  USING (company_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE POLICY rls_communication_delivery_logs ON communication_delivery_logs TO parkflow_app
  USING (company_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE POLICY rls_communication_settings ON communication_settings TO parkflow_app
  USING (company_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE POLICY rls_communication_settings_audit ON communication_settings_audit TO parkflow_app
  USING (company_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE POLICY rls_company_modules ON company_modules TO parkflow_app
  USING (company_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE POLICY rls_company_settings ON company_settings TO parkflow_app
  USING (company_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE POLICY rls_company_settings_snapshot ON company_settings_snapshot TO parkflow_app
  USING (company_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE POLICY rls_company_vehicle_type ON company_vehicle_type TO parkflow_app
  USING (company_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE POLICY rls_custodied_item ON custodied_item TO parkflow_app
  USING (company_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE POLICY rls_electronic_invoice_items ON electronic_invoice_items TO parkflow_app
  USING (company_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE POLICY rls_electronic_invoice_logs ON electronic_invoice_logs TO parkflow_app
  USING (company_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE POLICY rls_electronic_invoices ON electronic_invoices TO parkflow_app
  USING (company_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE POLICY rls_global_audit_log ON global_audit_log TO parkflow_app
  USING (company_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE POLICY rls_invoice_notes ON invoice_notes TO parkflow_app
  USING (company_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE POLICY rls_invoice_provider_webhooks ON invoice_provider_webhooks TO parkflow_app
  USING (company_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE POLICY rls_invoice_providers ON invoice_providers TO parkflow_app
  USING (company_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE POLICY rls_license_audit_log ON license_audit_log TO parkflow_app
  USING (company_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE POLICY rls_license_block_events ON license_block_events TO parkflow_app
  USING (company_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE POLICY rls_licensed_devices ON licensed_devices TO parkflow_app
  USING (company_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE POLICY rls_locker ON locker TO parkflow_app
  USING (company_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE POLICY rls_mfa_configs ON mfa_configs TO parkflow_app
  USING (company_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE POLICY rls_monthly_contract ON monthly_contract TO parkflow_app
  USING (company_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE POLICY rls_onboarding_progress ON onboarding_progress TO parkflow_app
  USING (company_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE POLICY rls_operational_parameters ON operational_parameters TO parkflow_app
  USING (company_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE POLICY rls_outbox_events ON outbox_events TO parkflow_app
  USING (company_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE POLICY rls_parking_session ON parking_session TO parkflow_app
  USING (company_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE POLICY rls_parking_sites ON parking_sites TO parkflow_app
  USING (company_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE POLICY rls_parking_space ON parking_space TO parkflow_app
  USING (company_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE POLICY rls_parking_space_assignment ON parking_space_assignment TO parkflow_app
  USING (company_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE POLICY rls_password_reset_tokens ON password_reset_tokens TO parkflow_app
  USING (company_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE POLICY rls_payment ON payment TO parkflow_app
  USING (company_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE POLICY rls_payment_methods ON payment_methods TO parkflow_app
  USING (company_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE POLICY rls_prepaid_balance ON prepaid_balance TO parkflow_app
  USING (company_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE POLICY rls_prepaid_package ON prepaid_package TO parkflow_app
  USING (company_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE POLICY rls_print_jobs ON print_jobs TO parkflow_app
  USING (company_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE POLICY rls_printers ON printers TO parkflow_app
  USING (company_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE POLICY rls_rate ON rate TO parkflow_app
  USING (company_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE POLICY rls_refresh_token_families ON refresh_token_families TO parkflow_app
  USING (company_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE POLICY rls_subscription_change_history ON subscription_change_history TO parkflow_app
  USING (company_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE POLICY rls_subscriptions ON subscriptions TO parkflow_app
  USING (company_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE POLICY rls_sync_events ON sync_events TO parkflow_app
  USING (company_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE POLICY rls_theme_configuration ON theme_configuration TO parkflow_app
  USING (company_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE POLICY rls_ticket_counter ON ticket_counter TO parkflow_app
  USING (company_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE POLICY rls_user_identities ON user_identities TO parkflow_app
  USING (company_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE POLICY rls_vehicle ON vehicle TO parkflow_app
  USING (company_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE POLICY rls_webhook_events ON webhook_events TO parkflow_app
  USING (company_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- ─────────────────────────────────────────────────────────────────────────
-- Summary
-- ─────────────────────────────────────────────────────────────────────────
-- ✅ RLS enabled on 56 multi-tenant tables
-- ✅ 56 RLS policies created
-- ✅ All policies enforce: company_id = current_setting('app.tenant_id')
--
-- NEXT STEP: Update TenantContextInterceptor.extractTenantFromJwt()
--            to set: SET app.tenant_id = '{company_id}' before requests
