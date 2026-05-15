package com.parkflow.modules.auth.security;

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
import org.springframework.http.HttpHeaders;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {
  private final JwtTokenService jwtTokenService;
  private final AuthSessionPort authSessionRepository;
  private final AppUserPort appUserRepository;

  public JwtAuthFilter(
      JwtTokenService jwtTokenService,
      AuthSessionPort authSessionRepository,
      AppUserPort appUserRepository) {
    this.jwtTokenService = jwtTokenService;
    this.authSessionRepository = authSessionRepository;
    this.appUserRepository = appUserRepository;
  }

  @Override
  protected void doFilterInternal(
      @NonNull HttpServletRequest request, @NonNull HttpServletResponse response, @NonNull FilterChain filterChain)
      throws ServletException, IOException {
    String auth = request.getHeader(HttpHeaders.AUTHORIZATION);
    if (auth == null || !auth.startsWith("Bearer ")) {
      filterChain.doFilter(request, response);
      return;
    }

    String token = auth.substring("Bearer ".length());
    try {
      Claims claims = jwtTokenService.parse(token);
      if ("refresh".equals(claims.get("typ", String.class))) {
        filterChain.doFilter(request, response);
        return;
      }

      UUID userId = UUID.fromString(claims.getSubject());
      String sessionIdClaim = claims.get("sid", String.class);
      if (sessionIdClaim == null || sessionIdClaim.isBlank()) {
        SecurityContextHolder.clearContext();
        filterChain.doFilter(request, response);
        return;
      }
      UUID sessionId = UUID.fromString(sessionIdClaim);
      var session = authSessionRepository.findByIdAndActiveTrue(sessionId).orElse(null);
      if (session == null || !session.getUser().getId().equals(userId)) {
        SecurityContextHolder.clearContext();
        filterChain.doFilter(request, response);
        return;
      }
      var user = appUserRepository.findById(userId).orElse(null);
      if (user == null || !user.isActive()) {
        SecurityContextHolder.clearContext();
        filterChain.doFilter(request, response);
        return;
      }

      String companyIdClaim = claims.get("cid", String.class);
      if (companyIdClaim == null || companyIdClaim.isBlank()) {
        SecurityContextHolder.clearContext();
        filterChain.doFilter(request, response);
        return;
      }
      UUID companyId = UUID.fromString(companyIdClaim);

      String email = claims.get("email", String.class);
      String role = claims.get("role", String.class);
      List<?> permissions = claims.get("permissions", List.class);

      List<GrantedAuthority> authorities = new ArrayList<>();
      if (role != null && !role.isBlank()) {
        authorities.add(new SimpleGrantedAuthority("ROLE_" + role));
      }
      if (permissions != null) {
        permissions.stream()
            .map(value -> (GrantedAuthority) new SimpleGrantedAuthority(String.valueOf(value)))
            .forEach(authorities::add);
      }

      AuthPrincipal principal = new AuthPrincipal(userId, companyId, email, role, authorities);
      UsernamePasswordAuthenticationToken authentication =
          new UsernamePasswordAuthenticationToken(principal, null, authorities);
      SecurityContextHolder.getContext().setAuthentication(authentication);
      
      TenantContext.setTenantId(companyId);
    } catch (Exception ignored) {
      SecurityContextHolder.clearContext();
      TenantContext.clear();
    }

    try {
      filterChain.doFilter(request, response);
    } finally {
      TenantContext.clear();
    }
  }
}
