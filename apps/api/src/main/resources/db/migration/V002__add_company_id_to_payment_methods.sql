-- Migration to add company_id to payment_methods table
ALTER TABLE payment_methods ADD COLUMN company_id UUID;
ALTER TABLE payment_methods ADD CONSTRAINT fk_payment_methods_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
