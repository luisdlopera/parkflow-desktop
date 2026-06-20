-- Fix CRÍTICO: cash_movement.idempotency_key must be unique to prevent duplicate payments.
-- Without this constraint a network retry or double-click could produce two identical rows
-- and charge the customer twice. The existing application-level check (findByIdempotencyKey)
-- is insufficient — two concurrent requests can both pass the check before either commits.
ALTER TABLE cash_movement
    ADD CONSTRAINT uq_cash_movement_idempotency_key
        UNIQUE (idempotency_key);
