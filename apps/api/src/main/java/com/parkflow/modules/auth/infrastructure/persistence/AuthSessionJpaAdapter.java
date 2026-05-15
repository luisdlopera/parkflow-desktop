package com.parkflow.modules.auth.infrastructure.persistence;

import com.parkflow.modules.auth.domain.AuthSession;
import com.parkflow.modules.auth.domain.repository.AuthSessionPort;
import com.parkflow.modules.auth.domain.AppUser;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class AuthSessionJpaAdapter implements AuthSessionPort {

  private final AuthSessionJpaRepository jpaRepository;

  @Override
  public Optional<AuthSession> findByIdAndActiveTrue(UUID id) {
    return jpaRepository.findByIdAndActiveTrue(id);
  }

  @Override
  public Optional<AuthSession> findByRefreshJtiAndActiveTrue(String refreshJti) {
    return jpaRepository.findByRefreshJtiAndActiveTrue(refreshJti);
  }

  @Override
  public Optional<AuthSession> findByRefreshTokenHashAndActiveTrue(String refreshTokenHash) {
    return jpaRepository.findByRefreshTokenHashAndActiveTrue(refreshTokenHash);
  }

  @Override
  public List<AuthSession> findByUserAndActiveTrue(AppUser user) {
    return jpaRepository.findByUserAndActiveTrue(user);
  }

  @Override
  public long deleteByActiveFalseAndCreatedAtBefore(OffsetDateTime before) {
    return jpaRepository.deleteByActiveFalseAndCreatedAtBefore(before);
  }

  @Override
  public AuthSession save(AuthSession session) {
    return jpaRepository.save(session);
  }

  @Override
  public Optional<AuthSession> findById(UUID id) {
    return jpaRepository.findById(id);
  }

  @Override
  public void delete(AuthSession session) {
    jpaRepository.delete(session);
  }

  @Override
  public void deleteAll(Iterable<? extends AuthSession> sessions) {
    jpaRepository.deleteAll(sessions);
  }

  @Repository
  interface AuthSessionJpaRepository extends JpaRepository<AuthSession, UUID> {
    Optional<AuthSession> findByIdAndActiveTrue(UUID id);
    Optional<AuthSession> findByRefreshJtiAndActiveTrue(String refreshJti);
    Optional<AuthSession> findByRefreshTokenHashAndActiveTrue(String refreshTokenHash);
    List<AuthSession> findByUserAndActiveTrue(AppUser user);
    long deleteByActiveFalseAndCreatedAtBefore(OffsetDateTime before);
  }
}
