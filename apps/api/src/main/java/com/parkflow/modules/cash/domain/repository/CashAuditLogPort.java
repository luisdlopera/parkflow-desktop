package com.parkflow.modules.cash.domain.repository;

import com.parkflow.modules.cash.domain.CashAuditLog;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CashAuditLogPort {
    List<CashAuditLog> findByCashSession_IdOrderByCreatedAtDesc(UUID cashSessionId);
    
    CashAuditLog save(CashAuditLog log);
    Optional<CashAuditLog> findById(UUID id);
    void delete(CashAuditLog log);
}
