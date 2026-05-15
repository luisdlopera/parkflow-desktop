package com.parkflow.modules.auth.infrastructure.persistence;

import com.parkflow.modules.auth.domain.PasswordResetToken;
import com.parkflow.modules.auth.domain.repository.PasswordResetTokenPort;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class PasswordResetTokenJpaAdapter implements PasswordResetTokenPort {

  private final PasswordResetTokenJpaRepository jpaRepository;

  @Override
  public Optional<PasswordResetToken> findByTokenHash(String tokenHash) {
    return jpaRepository.findByTokenHash(tokenHash);
  }

  @Override
  public int deleteExpiredOrUsedTokens(OffsetDateTime now) {
    return jpaRepository.deleteExpiredOrUsedTokens(now);
  }

  @Override
  public long countByUserIdAndUsedFalseAndExpiresAtAfter(UUID userId, OffsetDateTime now) {
    return jpaRepository.countByUserIdAndUsedFalseAndExpiresAtAfter(userId, now);
  }

  @Override
  public PasswordResetToken save(PasswordResetToken token) {
    return jpaRepository.save(token);
  }

  @Override
  public Optional<PasswordResetToken> findById(UUID id) {
    return jpaRepository.findById(id);
  }

  @Repository
  interface PasswordResetTokenJpaRepository extends JpaRepository<PasswordResetToken, UUID> {
    Optional<PasswordResetToken> findByTokenHash(String tokenHash);

    @Modifying
    @Query("DELETE FROM PasswordResetToken t WHERE t.expiresAt < :now OR t.used = true")
    int deleteExpiredOrUsedTokens(OffsetDateTime now);

    long countByUserIdAndUsedFalseAndExpiresAtAfter(UUID userId, OffsetDateTime now);
  }
}
