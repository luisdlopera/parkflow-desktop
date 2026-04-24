package com.parkflow.modules.cash.repository;

import com.parkflow.modules.cash.domain.CashAuditLog;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CashAuditLogRepository extends JpaRepository<CashAuditLog, UUID> {
  List<CashAuditLog> findByCashSession_IdOrderByCreatedAtDesc(UUID cashSessionId);
}
