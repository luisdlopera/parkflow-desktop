package com.parkflow.modules.common.security;

import static org.junit.jupiter.api.Assertions.*;

import java.time.LocalDateTime;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("CSRF Token Service Tests")
class CsrfTokenServiceTest {
  private CsrfTokenService csrfTokenService;

  @BeforeEach
  void setUp() {
    csrfTokenService = new CsrfTokenService();
  }

  @Test
  @DisplayName("Should generate valid CSRF token")
  void testGenerateToken() {
    String sessionId = "test-session-123";
    CsrfToken token = csrfTokenService.generateToken(sessionId);

    assertNotNull(token);
    assertNotNull(token.getToken());
    assertEquals(sessionId, token.getSessionId());
    assertTrue(token.isValid());
    assertFalse(token.isExpired());
  }

  @Test
  @DisplayName("Should validate correct token")
  void testValidateCorrectToken() {
    String sessionId = "test-session-123";
    CsrfToken token = csrfTokenService.generateToken(sessionId);

    boolean isValid = csrfTokenService.validateToken(token.getToken(), sessionId);
    assertTrue(isValid);
  }

  @Test
  @DisplayName("Should reject invalid token")
  void testValidateInvalidToken() {
    String sessionId = "test-session-123";
    csrfTokenService.generateToken(sessionId);

    boolean isValid = csrfTokenService.validateToken("invalid-token", sessionId);
    assertFalse(isValid);
  }

  @Test
  @DisplayName("Should reject null token")
  void testValidateNullToken() {
    String sessionId = "test-session-123";
    csrfTokenService.generateToken(sessionId);

    boolean isValid = csrfTokenService.validateToken(null, sessionId);
    assertFalse(isValid);
  }

  @Test
  @DisplayName("Should reject null session ID")
  void testValidateNullSessionId() {
    String sessionId = "test-session-123";
    CsrfToken token = csrfTokenService.generateToken(sessionId);

    boolean isValid = csrfTokenService.validateToken(token.getToken(), null);
    assertFalse(isValid);
  }

  @Test
  @DisplayName("Should reject token for non-existent session")
  void testValidateTokenForNonExistentSession() {
    String sessionId = "test-session-123";
    CsrfToken token = csrfTokenService.generateToken(sessionId);

    boolean isValid = csrfTokenService.validateToken(token.getToken(), "different-session");
    assertFalse(isValid);
  }

  @Test
  @DisplayName("Should provide correct header name")
  void testGetHeaderName() {
    assertEquals("X-CSRF-Token", csrfTokenService.getHeaderName());
  }
}
