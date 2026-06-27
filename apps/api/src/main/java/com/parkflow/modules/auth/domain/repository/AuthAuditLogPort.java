package com.parkflow.modules.auth.domain.repository;

import com.parkflow.modules.auth.domain.AuthAuditLog;
import java.util.Optional;
import java.util.UUID;

public interface AuthAuditLogPort {
  AuthAuditLog save(AuthAuditLog log);
  Optional<AuthAuditLog> findById(UUID id);
  org.springframework.data.domain.Page<AuthAuditLog> search(
      UUID userId, com.parkflow.modules.auth.domain.AuthAuditAction action, String outcome,
      java.time.OffsetDateTime from, java.time.OffsetDateTime to, UUID companyId, org.springframework.data.domain.Pageable pageable);
}
