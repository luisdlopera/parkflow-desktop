INSERT INTO payment_methods (code, name, requires_reference, display_order) VALUES
    ('CASH', 'Efectivo', FALSE, 1),
    ('DEBIT_CARD', 'Tarjeta débito', TRUE, 2),
    ('CREDIT_CARD', 'Tarjeta crédito', TRUE, 3),
    ('QR', 'QR', TRUE, 4),
    ('NEQUI', 'Nequi', TRUE, 5),
    ('DAVIPLATA', 'Daviplata', TRUE, 6),
    ('TRANSFER', 'Transferencia', TRUE, 7),
    ('AGREEMENT', 'Convenio', TRUE, 8),
    ('INTERNAL_CREDIT', 'Crédito interno', TRUE, 9),
    ('MIXED', 'Mixto', TRUE, 10),
    ('OTHER', 'Otro', TRUE, 12)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    requires_reference = EXCLUDED.requires_reference,
    display_order = EXCLUDED.display_order,
    updated_at = NOW();
