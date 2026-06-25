-- V025: Add document_type to client table (for invoice provider sync)
-- Supports NIT, CC, CE, etc. (Colombia and LATAM document types)

ALTER TABLE client ADD COLUMN IF NOT EXISTS document_type VARCHAR(30);
CREATE INDEX IF NOT EXISTS idx_client_document_type ON client(document_type);
