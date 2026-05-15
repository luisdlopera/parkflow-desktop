package com.parkflow.modules.auth.domain.repository;

import com.parkflow.modules.auth.domain.AuthSession;
import com.parkflow.modules.auth.domain.AppUser;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AuthSessionPort {
  Optional<AuthSession> findByIdAndActiveTrue(UUID id);
  Optional<AuthSession> findByRefreshJtiAndActiveTrue(String refreshJti);
  Optional<AuthSession> findByRefreshTokenHashAndActiveTrue(String refreshTokenHash);
  List<AuthSession> findByUserAndActiveTrue(AppUser user);
  long deleteByActiveFalseAndCreatedAtBefore(OffsetDateTime before);
  AuthSession save(AuthSession session);
  Optional<AuthSession> findById(UUID id);
  void delete(AuthSession session);
  void deleteAll(Iterable<? extends AuthSession> sessions);
}
