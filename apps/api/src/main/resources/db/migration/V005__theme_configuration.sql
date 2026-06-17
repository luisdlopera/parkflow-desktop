CREATE TABLE IF NOT EXISTS theme_configuration (
    id              UUID        DEFAULT gen_random_uuid() NOT NULL,
    company_id      UUID        NOT NULL,
    primary_color   VARCHAR(7)  NOT NULL DEFAULT '#f97316',
    secondary_color VARCHAR(7)  NOT NULL DEFAULT '#64748b',
    success_color   VARCHAR(7)  NOT NULL DEFAULT '#22c55e',
    warning_color   VARCHAR(7)  NOT NULL DEFAULT '#f59e0b',
    danger_color    VARCHAR(7)  NOT NULL DEFAULT '#ef4444',
    theme_mode      VARCHAR(10) NOT NULL DEFAULT 'auto',
    logo_url        TEXT,
    favicon_url     TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT theme_configuration_pkey PRIMARY KEY (id),
    CONSTRAINT theme_configuration_company_unique UNIQUE (company_id),
    CONSTRAINT fk_theme_configuration_company
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    CONSTRAINT chk_theme_mode CHECK (theme_mode IN ('light', 'dark', 'auto'))
);

CREATE INDEX IF NOT EXISTS idx_theme_configuration_company_id
    ON theme_configuration (company_id);
