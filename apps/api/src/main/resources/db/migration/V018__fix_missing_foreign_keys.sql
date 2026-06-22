-- Fix missing foreign key constraints for multi-tenant data integrity
-- cash_session and cash_movement have company_id columns but lack explicit FK constraints
-- This can lead to orphaned records if company deletion is not properly validated at application level

ALTER TABLE cash_session
  ADD CONSTRAINT fk_cash_session_company
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT;

ALTER TABLE cash_movement
  ADD CONSTRAINT fk_cash_movement_company
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT;

-- ON DELETE RESTRICT prevents company deletion if there are active sessions/movements
-- This ensures referential integrity across the multi-tenant schema
