package com.parkflow.modules.audit.domain.repository;

import com.parkflow.modules.audit.domain.AuditAction;
import com.parkflow.modules.audit.domain.AuditLog;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface AuditLogPort {
  AuditLog save(AuditLog log);

  Page<AuditLog> search(
      UUID companyId, AuditAction action, OffsetDateTime start, OffsetDateTime end, Pageable pageable);
}
