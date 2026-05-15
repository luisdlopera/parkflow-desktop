package com.parkflow.modules.auth.domain;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

/**
 * Entity for password reset tokens.
 * SECURITY: Tokens are single-use, time-limited (1 hour), and hashed in DB.
 */
@Getter
@Setter
@Entity
@Table(name = "password_reset_tokens")
public class PasswordResetToken {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @Column(nullable = false, unique = true)
  private String tokenHash;

  @Column(nullable = false)
  private UUID userId;

  @Column(nullable = false)
  private OffsetDateTime expiresAt;

  @Column(nullable = false)
  private boolean used = false;

  @Column(nullable = false)
  private OffsetDateTime createdAt = OffsetDateTime.now();

  private OffsetDateTime usedAt;

  private String ipAddress;

  public boolean isExpired() {
    return OffsetDateTime.now().isAfter(expiresAt);
  }
}
