-- V015__refactor_monthly_contract_to_clients.sql

-- 1. Create client table
CREATE TABLE client (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    company_id UUID NOT NULL,
    document VARCHAR(40),
    name VARCHAR(120) NOT NULL,
    email VARCHAR(120),
    phone VARCHAR(30),
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT client_pkey PRIMARY KEY (id),
    CONSTRAINT fk_client_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- 2. Add client_id to vehicle table
ALTER TABLE vehicle ADD COLUMN client_id UUID;
ALTER TABLE vehicle ADD CONSTRAINT fk_vehicle_client FOREIGN KEY (client_id) REFERENCES client(id) ON DELETE SET NULL;

-- 3. Add new columns to monthly_contract
ALTER TABLE monthly_contract ADD COLUMN client_id UUID;
ALTER TABLE monthly_contract ADD COLUMN vehicle_id UUID;
ALTER TABLE monthly_contract ADD COLUMN status VARCHAR(20);

-- Migrate statuses
UPDATE monthly_contract 
SET status = CASE WHEN is_active THEN 'ACTIVE' ELSE 'CANCELLED' END;

-- Migrate clients (with documents)
INSERT INTO client (company_id, document, name, email, phone)
SELECT DISTINCT ON (company_id, holder_document) 
       company_id, holder_document, holder_name, holder_email, holder_phone
FROM monthly_contract
WHERE holder_document IS NOT NULL AND holder_document != '';

-- Migrate clients (without documents)
INSERT INTO client (company_id, document, name, email, phone)
SELECT DISTINCT ON (company_id, holder_name) 
       company_id, NULL, holder_name, holder_email, holder_phone
FROM monthly_contract
WHERE holder_document IS NULL OR holder_document = '';

-- Link monthly_contract to client
UPDATE monthly_contract mc
SET client_id = c.id
FROM client c
WHERE mc.company_id = c.company_id 
  AND (mc.holder_document = c.document OR ((mc.holder_document IS NULL OR mc.holder_document = '') AND mc.holder_name = c.name));

-- Ensure all plates in monthly_contract exist in vehicle table
INSERT INTO vehicle (company_id, plate, type)
SELECT DISTINCT mc.company_id, mc.plate, COALESCE(mc.vehicle_type, 'AUTO')
FROM monthly_contract mc
WHERE NOT EXISTS (
    SELECT 1 FROM vehicle v WHERE v.company_id = mc.company_id AND v.plate = mc.plate
);

-- Link vehicle to client
UPDATE vehicle v
SET client_id = mc.client_id
FROM monthly_contract mc
WHERE v.company_id = mc.company_id AND v.plate = mc.plate AND mc.client_id IS NOT NULL;

-- Link monthly_contract to vehicle
UPDATE monthly_contract mc
SET vehicle_id = v.id
FROM vehicle v
WHERE mc.company_id = v.company_id AND mc.plate = v.plate;

-- Clean up invalid ones (if any failed mapping, though theoretically all should match)
-- Delete orphaned contracts if any
DELETE FROM monthly_contract WHERE client_id IS NULL OR vehicle_id IS NULL;

-- 4. Set NOT NULL and constraints
ALTER TABLE monthly_contract ALTER COLUMN client_id SET NOT NULL;
ALTER TABLE monthly_contract ALTER COLUMN vehicle_id SET NOT NULL;
ALTER TABLE monthly_contract ALTER COLUMN status SET NOT NULL;

ALTER TABLE monthly_contract ADD CONSTRAINT fk_monthly_contract_client FOREIGN KEY (client_id) REFERENCES client(id) ON DELETE RESTRICT;
ALTER TABLE monthly_contract ADD CONSTRAINT fk_monthly_contract_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicle(id) ON DELETE RESTRICT;

-- Drop old columns
ALTER TABLE monthly_contract DROP COLUMN holder_name;
ALTER TABLE monthly_contract DROP COLUMN holder_document;
ALTER TABLE monthly_contract DROP COLUMN holder_email;
ALTER TABLE monthly_contract DROP COLUMN holder_phone;
ALTER TABLE monthly_contract DROP COLUMN plate;
ALTER TABLE monthly_contract DROP COLUMN vehicle_type;
ALTER TABLE monthly_contract DROP COLUMN is_active;
