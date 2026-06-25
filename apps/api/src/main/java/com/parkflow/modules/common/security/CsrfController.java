package com.parkflow.modules.common.security;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import jakarta.servlet.http.HttpSession;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * CSRF Token API Controller
 *
 * Provides endpoints for generating and validating CSRF tokens.
 * All state-changing operations (POST, PUT, PATCH, DELETE) must include a valid token.
 */
@RestController
@RequestMapping("/api/v1/csrf")
public class CsrfController {
  private final CsrfTokenService csrfTokenService;

  public CsrfController(CsrfTokenService csrfTokenService) {
    this.csrfTokenService = csrfTokenService;
  }

  /**
   * Generate a new CSRF token for the current session
   *
   * @param session HTTP session
   * @return CSRF token response with token value and header name
   */
  @PostMapping("/token")
  @Operation(
      summary = "Generate CSRF Token",
      description = "Generate a new cross-site request forgery protection token for the current session")
  @ApiResponse(
      responseCode = "200",
      description = "CSRF token generated successfully",
      content =
          @Content(
              mediaType = "application/json",
              schema = @Schema(implementation = CsrfTokenResponse.class)))
  public ResponseEntity<CsrfTokenResponse> generateToken(HttpSession session) {
    String sessionId = session.getId();
    CsrfToken token = csrfTokenService.generateToken(sessionId);

    return ResponseEntity.ok(
        new CsrfTokenResponse(
            token.getToken(),
            csrfTokenService.getHeaderName(),
            token.getExpiresAt().toString()));
  }

  /**
   * Response DTO for CSRF token endpoint
   */
  public static class CsrfTokenResponse {
    private final String token;
    private final String headerName;
    private final String expiresAt;

    public CsrfTokenResponse(String token, String headerName, String expiresAt) {
      this.token = token;
      this.headerName = headerName;
      this.expiresAt = expiresAt;
    }

    public String getToken() {
      return token;
    }

    public String getHeaderName() {
      return headerName;
    }

    public String getExpiresAt() {
      return expiresAt;
    }
  }
}
