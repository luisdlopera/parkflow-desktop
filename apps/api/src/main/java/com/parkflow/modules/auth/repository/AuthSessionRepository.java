package com.parkflow.modules.auth.repository;

import com.parkflow.modules.auth.entity.AuthSession;
import com.parkflow.modules.parking.operation.domain.AppUser;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuthSessionRepository extends JpaRepository<AuthSession, UUID> {
  Optional<AuthSession> findByIdAndActiveTrue(UUID id);

  Optional<AuthSession> findByRefreshJtiAndActiveTrue(String refreshJti);

  Optional<AuthSession> findByRefreshTokenHashAndActiveTrue(String refreshTokenHash);

  List<AuthSession> findByUserAndActiveTrue(AppUser user);

  long deleteByActiveFalseAndCreatedAtBefore(OffsetDateTime before);
}
