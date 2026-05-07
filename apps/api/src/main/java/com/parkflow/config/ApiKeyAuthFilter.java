package com.parkflow.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Instant;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * API Key authentication filter.
 * SECURITY NOTE: This filter allows requests without API key to pass through
 * to the JWT filter. Routes that require API key must be explicitly protected
 * or rely on JWT authentication. This is a defense-in-depth design.
 */
public class ApiKeyAuthFilter extends OncePerRequestFilter {
  private static final Logger log = LoggerFactory.getLogger(ApiKeyAuthFilter.class);
  private static final String API_KEY_HEADER = "X-API-Key";
  private static final List<String> PUBLIC_PATH_PREFIXES =
      List.of("/actuator/health", "/actuator/info", "/swagger-ui/", "/v3/api-docs/", "/api/v1/settings/vehicle-types");
  // Routes that explicitly require API key authentication
  private static final List<String> API_KEY_REQUIRED_PATHS =
      List.of("/api/v1/internal/", "/api/v1/webhook/");

  private final String expectedApiKey;

  public ApiKeyAuthFilter(String expectedApiKey) {
    if (expectedApiKey == null || expectedApiKey.isBlank() || expectedApiKey.equals("parkflow-dev-key")) {
      throw new IllegalArgumentException(
        "Invalid API key configuration: must be a non-default, non-empty value");
    }
    this.expectedApiKey = expectedApiKey;
  }

  @Override
  protected boolean shouldNotFilter(HttpServletRequest request) {
    String path = request.getRequestURI();
    return PUBLIC_PATH_PREFIXES.stream().anyMatch(path::startsWith);
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
      throws ServletException, IOException {
    String incomingApiKey = request.getHeader(API_KEY_HEADER);
    String path = request.getRequestURI();
    
    // Check if API key is required for this path
    boolean apiKeyRequired = API_KEY_REQUIRED_PATHS.stream().anyMatch(path::startsWith);
    
    if (incomingApiKey == null || incomingApiKey.isBlank()) {
      if (apiKeyRequired) {
        // SECURITY: Reject if API key is required but not provided
        log.warn("SECURITY: Rejecting request to {} - API key required but not provided (client IP: {})",
            path, request.getRemoteAddr());
        writeUnauthorized(response, path, "API key required");
        return;
      }
      // Pass through to JWT filter for non-API-key routes
      filterChain.doFilter(request, response);
      return;
    }

    if (!incomingApiKey.equals(expectedApiKey)) {
      log.warn("SECURITY: Rejecting request to {} - Invalid API key provided (client IP: {})",
          path, request.getRemoteAddr());
      writeUnauthorized(response, path, "Invalid API key");
      return;
    }

    var auth =
        new UsernamePasswordAuthenticationToken(
            "api-key-client", null, AuthorityUtils.createAuthorityList("ROLE_API_CLIENT"));
    SecurityContextHolder.getContext().setAuthentication(auth);
    filterChain.doFilter(request, response);
  }

  private void writeUnauthorized(HttpServletResponse response, String path, String reason) throws IOException {
    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
    response.setHeader(HttpHeaders.WWW_AUTHENTICATE, "ApiKey");
    response.setContentType("application/json");
    response.getWriter().write(
        "{\"timestamp\":\"" + Instant.now()
            + "\",\"status\":401,\"code\":\"AUTH_UNAUTHORIZED\",\"message\":\"Tu sesion expiro. Inicia sesion nuevamente.\",\"path\":\""
            + path + "\",\"details\":{\"reason\":\"" + reason + "\"}}");
  }
}
