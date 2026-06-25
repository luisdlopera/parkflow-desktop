package com.parkflow.modules.common.security;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import org.springframework.stereotype.Service;

/**
 * CSRF Token Service
 *
 * Manages CSRF token generation, validation, and storage.
 * Tokens are stored in-memory per session with automatic expiration.
 *
 * For distributed deployments, replace with Redis-backed storage.
 */
@Service
public class CsrfTokenService {
  private static final String HEADER_NAME = "X-CSRF-Token";
  private final ConcurrentMap<String, CsrfToken> tokenStore = new ConcurrentHashMap<>();

  /**
   * Generate a new CSRF token for the given session
   */
  public CsrfToken generateToken(String sessionId) {
    CsrfToken token = CsrfToken.generate(sessionId);
    tokenStore.put(sessionId, token);
    return token;
  }

  /**
   * Validate a CSRF token
   *
   * @param token The token to validate
   * @param sessionId The session ID to match against
   * @return true if token is valid and not expired
   */
  public boolean validateToken(String token, String sessionId) {
    if (token == null || sessionId == null) {
      return false;
    }

    CsrfToken storedToken = tokenStore.get(sessionId);
    if (storedToken == null) {
      return false;
    }

    boolean isValid = token.equals(storedToken.getToken()) && storedToken.isValid();

    // Clean up expired tokens
    if (storedToken.isExpired()) {
      tokenStore.remove(sessionId);
    }

    return isValid;
  }

  /**
   * Get the CSRF header name
   */
  public String getHeaderName() {
    return HEADER_NAME;
  }

  /**
   * Clean up expired tokens (should be called periodically)
   */
  public void cleanupExpiredTokens() {
    tokenStore.values().removeIf(CsrfToken::isExpired);
  }
}
