-- WhatsApp Ticket Management support tables

CREATE TABLE tickets (
    id UUID PRIMARY KEY,
    ticket_number VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL,
    priority VARCHAR(50) NOT NULL,
    category VARCHAR(50) NOT NULL,
    channel VARCHAR(50) NOT NULL,
    customer_id UUID NOT NULL,
    assigned_agent_id UUID,
    tenant_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE ticket_categories (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE conversations (
    id UUID PRIMARY KEY,
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    channel VARCHAR(50) NOT NULL,
    tenant_id UUID NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE ticket_messages (
    id UUID PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_type VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    tenant_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ticket_attachments (
    id UUID PRIMARY KEY,
    message_id UUID REFERENCES ticket_messages(id) ON DELETE CASCADE,
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
    file_url VARCHAR(255) NOT NULL,
    file_type VARCHAR(50),
    file_size INT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ticket_assignments (
    id UUID PRIMARY KEY,
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL,
    assigned_by UUID,
    assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ticket_sla (
    id UUID PRIMARY KEY,
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE UNIQUE,
    response_time_minutes INT NOT NULL,
    resolution_time_minutes INT NOT NULL,
    escalation_rules JSONB,
    tenant_id UUID NOT NULL
);

CREATE TABLE ticket_events (
    id UUID PRIMARY KEY,
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    payload JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ticket_audit_logs (
    id UUID PRIMARY KEY,
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    performed_by UUID NOT NULL,
    old_value JSONB,
    new_value JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE message_channels (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    provider_name VARCHAR(50) NOT NULL,
    channel_type VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE message_provider_configs (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    channel_id UUID NOT NULL REFERENCES message_channels(id) ON DELETE CASCADE,
    config_key VARCHAR(100) NOT NULL,
    config_value TEXT NOT NULL,
    is_secret BOOLEAN DEFAULT FALSE
);

CREATE TABLE webhook_events (
    id UUID PRIMARY KEY,
    provider VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(50) NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for fast querying
CREATE INDEX idx_tickets_tenant_id ON tickets(tenant_id);
CREATE INDEX idx_tickets_customer_id ON tickets(customer_id);
CREATE INDEX idx_tickets_assigned_agent_id ON tickets(assigned_agent_id);
CREATE INDEX idx_tickets_status ON tickets(status);

CREATE INDEX idx_conversations_ticket_id ON conversations(ticket_id);
CREATE INDEX idx_ticket_messages_conversation_id ON ticket_messages(conversation_id);

