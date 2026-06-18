-- P09: Scope app_user.email uniqueness to company — two companies can share the same email
-- The global constraint prevents multi-tenant SaaS from having admin@empresa.com at two tenants.
ALTER TABLE app_user DROP CONSTRAINT IF EXISTS app_user_email_key;
DROP INDEX IF EXISTS app_user_email_key;
DROP INDEX IF EXISTS uq_app_user_email;

CREATE UNIQUE INDEX uq_app_user_company_email ON app_user (company_id, email);
