package com.parkflow.modules.auth.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.parkflow.modules.common.dto.ErrorResponse;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import com.parkflow.modules.auth.domain.repository.AuthSessionPort;
import com.parkflow.modules.parking.operation.domain.repository.AppUserPort;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import java.util.concurrent.TimeUnit;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {
  private final JwtTokenService jwtTokenService;
  private final AuthSessionPort authSessionRepository;
  private final AppUserPort appUserRepository;
  private final ObjectMapper objectMapper;
  
  // Short-lived cache to avoid DB hits on every request
  private final Cache<UUID, AppUserCacheEntry> userStatusCache = Caffeine.newBuilder()
      .expireAfterWrite(30, TimeUnit.SECONDS)
      .maximumSize(10000)
      .build();

  private record AppUserCacheEntry(boolean active, boolean blocked) {}

  public JwtAuthFilter(
      JwtTokenService jwtTokenService,
      AuthSessionPort authSessionRepository,
      AppUserPort appUserRepository,
      ObjectMapper objectMapper) {
    this.jwtTokenService = jwtTokenService;
    this.authSessionRepository = authSessionRepository;
    this.appUserRepository = appUserRepository;
    this.objectMapper = objectMapper;
  }

  @Override
  protected void doFilterInternal(
      @NonNull HttpServletRequest request, @NonNull HttpServletResponse response, @NonNull FilterChain filterChain)
      throws ServletException, IOException {
    String token = null;
    if (request.getCookies() != null) {
      for (jakarta.servlet.http.Cookie cookie : request.getCookies()) {
        if ("parkflow_access".equals(cookie.getName())) {
          token = cookie.getValue();
          break;
        }
      }
    }
    if (token == null || token.isBlank()) {
      filterChain.doFilter(request, response);
      return;
    }
    Claims claims;
    try {
      claims = jwtTokenService.parse(token);
    } catch (Exception ex) {
      // Token is invalid/expired. For public endpoints, Spring Security will permit access.
      // For protected endpoints, SecurityConfig's .authenticated() will reject with 401.
      // Don't reject here - let Spring Security decide based on endpoint configuration.
      filterChain.doFilter(request, response);
      return;
    }

    // Refresh tokens are handled by the public /auth/refresh endpoint.
    if ("refresh".equals(claims.get("typ", String.class))) {
      filterChain.doFilter(request, response);
      return;
    }

    UUID userId;
    try {
      userId = UUID.fromString(claims.getSubject());
    } catch (Exception ex) {
      writeUnauthorized(response, request.getRequestURI());
      return;
    }

    String sessionIdClaim = claims.get("sid", String.class);
    if (sessionIdClaim == null || sessionIdClaim.isBlank()) {
      writeUnauthorized(response, request.getRequestURI());
      return;
    }

    UUID sessionId;
    try {
      sessionId = UUID.fromString(sessionIdClaim);
    } catch (Exception ex) {
      writeUnauthorized(response, request.getRequestURI());
      return;
    }

    var session = authSessionRepository.findByIdAndActiveTrue(sessionId).orElse(null);
    if (session == null || !session.getUser().getId().equals(userId)) {
      writeUnauthorized(response, request.getRequestURI());
      return;
    }

    AppUserCacheEntry userStatus = userStatusCache.get(userId, id -> {
      var u = appUserRepository.findById(id).orElse(null);
      if (u == null) return null;
      return new AppUserCacheEntry(u.isActive(), u.isBlocked());
    });
    
    if (userStatus == null || !userStatus.active() || userStatus.blocked()) {
      writeUnauthorized(response, request.getRequestURI());
      return;
    }

    String companyIdClaim = claims.get("cid", String.class);
    if (companyIdClaim == null || companyIdClaim.isBlank()) {
      writeUnauthorized(response, request.getRequestURI());
      return;
    }

    UUID companyId;
    try {
      companyId = UUID.fromString(companyIdClaim);
    } catch (Exception ex) {
      writeUnauthorized(response, request.getRequestURI());
      return;
    }

    String email = claims.get("email", String.class);
    String role = claims.get("role", String.class);
    List<?> permissions = claims.get("permissions", List.class);

    List<GrantedAuthority> authorities = new ArrayList<>();
    // Add role as ROLE_<role> so @PreAuthorize("hasAnyRole(...)") works
    if (role != null && !role.isBlank()) {
      authorities.add(new SimpleGrantedAuthority("ROLE_" + role));
    }
    // Add fine-grained permissions as authorities
    if (permissions != null) {
      permissions.stream()
          .map(value -> (GrantedAuthority) new SimpleGrantedAuthority(String.valueOf(value)))
          .forEach(authorities::add);
    }

    AuthPrincipal principal = new AuthPrincipal(userId, companyId, email, role, authorities);
    UsernamePasswordAuthenticationToken authentication =
        new UsernamePasswordAuthenticationToken(principal, null, authorities);
    SecurityContextHolder.getContext().setAuthentication(authentication);

    request.setAttribute("currentUserEmail", email);
    request.setAttribute("currentUserId", userId.toString());

    TenantContext.setTenantId(companyId);
    org.slf4j.MDC.put("tenantId", companyId.toString());
    org.slf4j.MDC.put("userId", userId.toString());

    try {
      filterChain.doFilter(request, response);
    } finally {
      TenantContext.clear();
      org.slf4j.MDC.remove("tenantId");
      org.slf4j.MDC.remove("userId");
    }
  }

  private void writeUnauthorized(HttpServletResponse response, String path) throws IOException {
    String correlationId = org.slf4j.MDC.get(com.parkflow.config.CorrelationIdFilter.CORRELATION_ID_MDC_KEY);
    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
    ErrorResponse payload = new ErrorResponse(
        HttpServletResponse.SC_UNAUTHORIZED,
        "AUTH_UNAUTHORIZED",
        "Tu sesion expiro. Inicia sesion nuevamente.",
        "AuthenticationException",
        path,
        correlationId);
    objectMapper.writeValue(response.getWriter(), payload);
  }
}
