-- Agregar columna version para Optimistic Locking
ALTER TABLE cash_session ADD COLUMN version BIGINT DEFAULT 0 NOT NULL;

-- Agregar índice único para asegurar que un operador solo tenga una caja abierta
CREATE UNIQUE INDEX IF NOT EXISTS uq_cash_session_one_open_per_operator
    ON cash_session(operator_id)
    WHERE status = 'OPEN';
