-- Helmet locker / ficha configuration
CREATE TABLE helmet_locker (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    company_id UUID NOT NULL,
    code VARCHAR(20) NOT NULL,
    label VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT helmet_locker_pkey PRIMARY KEY (id),
    CONSTRAINT uq_helmet_locker_company_code UNIQUE (company_id, code)
);

CREATE INDEX idx_helmet_locker_company ON helmet_locker(company_id);
CREATE INDEX idx_helmet_locker_active ON helmet_locker(company_id, is_active);

-- Add optional FK from custodied_item to helmet_locker
ALTER TABLE custodied_item ADD COLUMN locker_id UUID;
ALTER TABLE custodied_item ADD CONSTRAINT custodied_item_locker_id_fkey FOREIGN KEY (locker_id) REFERENCES helmet_locker(id) ON DELETE SET NULL;
CREATE INDEX idx_custodied_item_locker ON custodied_item(locker_id);
