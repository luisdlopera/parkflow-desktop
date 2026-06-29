-- V002__create_communication_tables.sql

CREATE TABLE communication_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    channel character varying(50) NOT NULL,
    provider character varying(100) NOT NULL,
    enabled boolean DEFAULT false NOT NULL,
    host character varying(255),
    port integer,
    username character varying(255),
    password_encrypted text,
    api_key_encrypted text,
    api_secret_encrypted text,
    sender_email character varying(255),
    sender_name character varying(255),
    reply_to_email character varying(255),
    base_url character varying(255),
    security_mode character varying(50),
    country_code character varying(10),
    daily_limit integer DEFAULT 0,
    daily_counter integer DEFAULT 0,
    advanced_config_json jsonb,
    last_test_status character varying(50),
    last_test_at timestamp with time zone,
    last_error text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid,
    CONSTRAINT pk_communication_settings PRIMARY KEY (id),
    CONSTRAINT uq_company_channel UNIQUE (company_id, channel)
);

CREATE TABLE communication_delivery_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    channel character varying(50) NOT NULL,
    provider character varying(100) NOT NULL,
    recipient character varying(255) NOT NULL,
    message_type character varying(100),
    subject character varying(255),
    status character varying(50) NOT NULL,
    error_message text,
    metadata_json jsonb,
    sent_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT pk_communication_delivery_logs PRIMARY KEY (id)
);

CREATE INDEX idx_comm_logs_company_channel_status ON communication_delivery_logs (company_id, channel, status);
CREATE INDEX idx_comm_logs_sent_at ON communication_delivery_logs (sent_at);

CREATE TABLE communication_settings_audit (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    channel character varying(50) NOT NULL,
    action character varying(50) NOT NULL,
    field_name character varying(100),
    old_value_masked text,
    new_value_masked text,
    changed_by uuid,
    ip_address character varying(100),
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT pk_communication_settings_audit PRIMARY KEY (id)
);

CREATE INDEX idx_comm_audit_company_channel ON communication_settings_audit (company_id, channel);
