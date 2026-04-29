package com.parkflow.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
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
  private static final String API_KEY_HEADER = "X-API-Key";
  private static final List<String> PUBLIC_PATH_PREFIXES =
      List.of("/actuator/health", "/actuator/info", "/swagger-ui/", "/v3/api-docs/");
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
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setHeader(HttpHeaders.WWW_AUTHENTICATE, "ApiKey");
        response.setContentType("application/json");
        response.getWriter().write("{\"error\":\"API key required\"}");
        return;
      }
      // Pass through to JWT filter for non-API-key routes
      filterChain.doFilter(request, response);
      return;
    }

    if (!incomingApiKey.equals(expectedApiKey)) {
      response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
      response.setHeader(HttpHeaders.WWW_AUTHENTICATE, "ApiKey");
      response.setContentType("application/json");
      response.getWriter().write("{\"error\":\"Invalid API key\"}");
      return;
    }

    var auth =
        new UsernamePasswordAuthenticationToken(
            "api-key-client", null, AuthorityUtils.createAuthorityList("ROLE_API_CLIENT"));
    SecurityContextHolder.getContext().setAuthentication(auth);
    filterChain.doFilter(request, response);
  }
}
