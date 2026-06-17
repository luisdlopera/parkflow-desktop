CREATE TABLE IF NOT EXISTS blacklisted_plate (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    company_id UUID NOT NULL,
    plate VARCHAR(20) NOT NULL,
    reason VARCHAR(255),
    active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT blacklisted_plate_pkey PRIMARY KEY (id),
    CONSTRAINT fk_blacklisted_plate_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_blacklisted_plate_company_plate_active
    ON blacklisted_plate (company_id, plate, active);
