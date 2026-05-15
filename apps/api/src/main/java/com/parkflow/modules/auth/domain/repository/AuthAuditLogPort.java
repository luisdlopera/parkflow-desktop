package com.parkflow.modules.auth.domain.repository;

import com.parkflow.modules.auth.domain.AuthAuditLog;
import java.util.Optional;
import java.util.UUID;

public interface AuthAuditLogPort {
  AuthAuditLog save(AuthAuditLog log);
  Optional<AuthAuditLog> findById(UUID id);
}
