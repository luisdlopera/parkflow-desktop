-- Drop the global unique constraint on code so companies can have their own records per code
ALTER TABLE payment_methods DROP CONSTRAINT payment_methods_code_key;

-- New compound unique: (code, company_id) — allows global catalogue (company_id = NULL)
-- and per-company records with the same code
ALTER TABLE payment_methods ADD CONSTRAINT payment_methods_code_company_key UNIQUE (code, company_id);
