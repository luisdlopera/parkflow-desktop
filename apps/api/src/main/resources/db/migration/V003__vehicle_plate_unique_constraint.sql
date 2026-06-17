-- Align vehicle table with JPA entity: enforce plate uniqueness per company.
-- Global uniqueness was declared in the JPA entity but missing in the baseline schema.

ALTER TABLE vehicle
    ADD CONSTRAINT uq_vehicle_company_plate UNIQUE (company_id, plate);
