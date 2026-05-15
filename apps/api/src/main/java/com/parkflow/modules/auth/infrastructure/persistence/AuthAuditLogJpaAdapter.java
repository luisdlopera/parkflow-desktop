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

  @Repository
  interface AuthAuditLogJpaRepository extends JpaRepository<AuthAuditLog, UUID> {}
}
