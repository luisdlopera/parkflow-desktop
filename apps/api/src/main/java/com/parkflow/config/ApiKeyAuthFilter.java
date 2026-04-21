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

public class ApiKeyAuthFilter extends OncePerRequestFilter {
  private static final String API_KEY_HEADER = "X-API-Key";
  private static final List<String> PUBLIC_PATH_PREFIXES =
      List.of("/actuator/health", "/actuator/info", "/swagger-ui/", "/v3/api-docs/");

  private final String expectedApiKey;

  public ApiKeyAuthFilter(String expectedApiKey) {
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
    if (incomingApiKey == null || !incomingApiKey.equals(expectedApiKey)) {
      response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
      response.setHeader(HttpHeaders.WWW_AUTHENTICATE, "ApiKey");
      response.setContentType("application/json");
      response.getWriter().write("{\"error\":\"Missing or invalid API key\"}");
      return;
    }

    var auth =
        new UsernamePasswordAuthenticationToken(
            "api-key-client", null, AuthorityUtils.createAuthorityList("ROLE_API_CLIENT"));
    SecurityContextHolder.getContext().setAuthentication(auth);
    filterChain.doFilter(request, response);
  }
}
