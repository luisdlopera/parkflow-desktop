package com.parkflow.modules.auth.domain.repository;

import com.parkflow.modules.auth.domain.PasswordResetToken;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

public interface PasswordResetTokenPort {
  Optional<PasswordResetToken> findByTokenHash(String tokenHash);
  int deleteExpiredOrUsedTokens(OffsetDateTime now);
  long countByUserIdAndUsedFalseAndExpiresAtAfter(UUID userId, OffsetDateTime now);
  PasswordResetToken save(PasswordResetToken token);
  Optional<PasswordResetToken> findById(UUID id);
}
