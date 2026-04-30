package com.parkflow.modules.auth.repository;

import com.parkflow.modules.auth.entity.PasswordResetToken;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, UUID> {

  Optional<PasswordResetToken> findByTokenHash(String tokenHash);

  @Modifying
  @Query("DELETE FROM PasswordResetToken t WHERE t.expiresAt < :now OR t.used = true")
  int deleteExpiredOrUsedTokens(OffsetDateTime now);

  long countByUserIdAndUsedFalseAndExpiresAtAfter(UUID userId, OffsetDateTime now);
}
