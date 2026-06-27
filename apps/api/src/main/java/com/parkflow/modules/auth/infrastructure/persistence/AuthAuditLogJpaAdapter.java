package com.parkflow.modules.auth.infrastructure.persistence;

import com.parkflow.modules.auth.domain.AuthAuditLog;
import com.parkflow.modules.auth.domain.repository.AuthAuditLogPort;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class AuthAuditLogJpaAdapter implements AuthAuditLogPort {

  private final AuthAuditLogJpaRepository jpaRepository;

  @Override
  public AuthAuditLog save(AuthAuditLog log) {
    return jpaRepository.save(log);
  }

  @Override
  public Optional<AuthAuditLog> findById(UUID id) {
    return jpaRepository.findById(id);
  }

  @Override
  public org.springframework.data.domain.Page<AuthAuditLog> search(
      UUID userId, com.parkflow.modules.auth.domain.AuthAuditAction action, String outcome,
      java.time.OffsetDateTime from, java.time.OffsetDateTime to, UUID companyId, org.springframework.data.domain.Pageable pageable) {
    return jpaRepository.search(userId, action, outcome, from, to, companyId, pageable);
  }

  @Repository
  interface AuthAuditLogJpaRepository extends JpaRepository<AuthAuditLog, UUID> {
    @org.springframework.data.jpa.repository.Query("SELECT a FROM AuthAuditLog a WHERE " +
        "(:userId IS NULL OR a.user.id = :userId) AND " +
        "(:action IS NULL OR a.action = :action) AND " +
        "(:outcome IS NULL OR a.outcome = :outcome) AND " +
        "(:from IS NULL OR a.createdAt >= :from) AND " +
        "(:to IS NULL OR a.createdAt <= :to) AND " +
        "(:companyId IS NULL OR a.user.companyId = :companyId)")
    org.springframework.data.domain.Page<AuthAuditLog> search(
        @org.springframework.data.repository.query.Param("userId") UUID userId,
        @org.springframework.data.repository.query.Param("action") com.parkflow.modules.auth.domain.AuthAuditAction action,
        @org.springframework.data.repository.query.Param("outcome") String outcome,
        @org.springframework.data.repository.query.Param("from") java.time.OffsetDateTime from,
        @org.springframework.data.repository.query.Param("to") java.time.OffsetDateTime to,
        @org.springframework.data.repository.query.Param("companyId") UUID companyId,
        org.springframework.data.domain.Pageable pageable
    );
  }
}
