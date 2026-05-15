package com.parkflow.modules.audit.infrastructure.persistence;

import com.parkflow.modules.audit.domain.AuditAction;
import com.parkflow.modules.audit.domain.AuditLog;
import com.parkflow.modules.audit.domain.repository.AuditLogPort;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Repository;

@Component
@RequiredArgsConstructor
public class AuditLogJpaAdapter implements AuditLogPort {

  private final AuditLogJpaRepository jpaRepository;

  @Override
  public AuditLog save(AuditLog log) {
    return jpaRepository.save(log);
  }

  @Override
  public Page<AuditLog> search(
      UUID companyId, AuditAction action, OffsetDateTime start, OffsetDateTime end, Pageable pageable) {
    return jpaRepository.search(companyId, action, start, end, pageable);
  }

  @Repository
  interface AuditLogJpaRepository extends JpaRepository<AuditLog, UUID> {
    @Query(
        "SELECT l FROM AuditLog l WHERE l.companyId = :cid "
            + "AND (:action IS NULL OR l.action = :action) "
            + "AND (:start IS NULL OR l.createdAt >= :start) "
            + "AND (:end IS NULL OR l.createdAt <= :end) "
            + "ORDER BY l.createdAt DESC")
    Page<AuditLog> search(
        @Param("cid") UUID companyId,
        @Param("action") AuditAction action,
        @Param("start") OffsetDateTime start,
        @Param("end") OffsetDateTime end,
        Pageable pageable);
  }
}
