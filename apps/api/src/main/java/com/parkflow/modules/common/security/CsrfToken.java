package com.parkflow.modules.common.security;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * CSRF Protection Token
 *
 * Represents a cross-site request forgery token with expiration.
 * Tokens are generated per session and must be included in state-changing requests.
 */
public class CsrfToken {
  private final String token;
  private final String sessionId;
  private final LocalDateTime createdAt;
  private final LocalDateTime expiresAt;
  private final boolean valid;

  public CsrfToken(String token, String sessionId, LocalDateTime createdAt, LocalDateTime expiresAt) {
    this.token = token;
    this.sessionId = sessionId;
    this.createdAt = createdAt;
    this.expiresAt = expiresAt;
    this.valid = true;
  }

  public static CsrfToken generate(String sessionId) {
    String token = UUID.randomUUID().toString().replace("-", "");
    LocalDateTime now = LocalDateTime.now();
    LocalDateTime expiresAt = now.plusHours(1); // 1-hour expiration
    return new CsrfToken(token, sessionId, now, expiresAt);
  }

  public boolean isExpired() {
    return LocalDateTime.now().isAfter(expiresAt);
  }

  public boolean isValid() {
    return valid && !isExpired();
  }

  public String getToken() {
    return token;
  }

  public String getSessionId() {
    return sessionId;
  }

  public LocalDateTime getCreatedAt() {
    return createdAt;
  }

  public LocalDateTime getExpiresAt() {
    return expiresAt;
  }
}
