package com.parkflow.modules.audit.repository;

import com.parkflow.modules.audit.domain.AuditLog;
import com.parkflow.modules.audit.domain.AuditAction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.UUID;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {
  
  @Query("SELECT l FROM AuditLog l WHERE l.companyId = :cid " +
         "AND (:action IS NULL OR l.action = :action) " +
         "AND (:start IS NULL OR l.createdAt >= :start) " +
         "AND (:end IS NULL OR l.createdAt <= :end) " +
         "ORDER BY l.createdAt DESC")
  Page<AuditLog> search(
      @Param("cid") UUID companyId,
      @Param("action") AuditAction action,
      @Param("start") OffsetDateTime start,
      @Param("end") OffsetDateTime end,
      Pageable pageable);
}
