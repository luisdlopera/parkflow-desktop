package com.parkflow.modules.common.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.io.IOException;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * CSRF Protection Filter
 *
 * Validates CSRF tokens on state-changing requests (POST, PUT, PATCH, DELETE).
 * Exempts certain endpoints that are intentionally CSRF-free (e.g., login, public APIs).
 */
@Component
public class CsrfFilter extends OncePerRequestFilter {
  private static final Set<String> SAFE_METHODS = new HashSet<>(Arrays.asList("GET", "HEAD", "OPTIONS"));
  private static final Set<String> CSRF_EXEMPT_PATHS = new HashSet<>(Arrays.asList(
      "/api/v1/auth/login",           // Login endpoint (uses credentials)
      "/api/v1/auth/setup-required",  // Setup check endpoint
      "/api/v1/csrf/token",           // Token generation endpoint
      "/swagger-ui",                  // Swagger UI
      "/v3/api-docs",                 // OpenAPI docs
      "/actuator/health"              // Health check
  ));

  private final CsrfTokenService csrfTokenService;

  public CsrfFilter(CsrfTokenService csrfTokenService) {
    this.csrfTokenService = csrfTokenService;
  }

  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
      FilterChain filterChain) throws ServletException, IOException {
    // Skip CSRF validation for safe methods (GET, HEAD, OPTIONS)
    if (SAFE_METHODS.contains(request.getMethod())) {
      filterChain.doFilter(request, response);
      return;
    }

    // Skip CSRF validation for exempt paths
    if (isExemptPath(request.getRequestURI())) {
      filterChain.doFilter(request, response);
      return;
    }

    // Validate CSRF token for state-changing requests
    if (!validateCsrfToken(request, response)) {
      response.sendError(HttpServletResponse.SC_FORBIDDEN, "CSRF token validation failed");
      return;
    }

    filterChain.doFilter(request, response);
  }

  private boolean validateCsrfToken(HttpServletRequest request, HttpServletResponse response) {
    HttpSession session = request.getSession(false);
    if (session == null) {
      return false;
    }

    // Get token from header (preferred) or request parameter
    String token = request.getHeader(csrfTokenService.getHeaderName());
    if (token == null || token.isEmpty()) {
      token = request.getParameter("_csrf");
    }

    if (token == null || token.isEmpty()) {
      return false;
    }

    // Validate token
    return csrfTokenService.validateToken(token, session.getId());
  }

  private boolean isExemptPath(String requestUri) {
    return CSRF_EXEMPT_PATHS.stream().anyMatch(requestUri::startsWith);
  }
}
