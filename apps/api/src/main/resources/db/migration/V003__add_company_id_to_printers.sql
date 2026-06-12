-- Migration to add company_id to printers table
ALTER TABLE printers ADD COLUMN company_id UUID;
ALTER TABLE printers ADD CONSTRAINT fk_printers_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
