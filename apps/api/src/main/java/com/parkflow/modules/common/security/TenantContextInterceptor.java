package com.parkflow.modules.common.security;

import com.parkflow.modules.auth.security.AuthPrincipal;
import com.parkflow.modules.auth.security.TenantContext;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * Interceptor that ensures TenantContext is properly set for all authenticated requests.
 *
 * Note: JwtAuthFilter already sets TenantContext.setTenantId(companyId) when processing JWT tokens.
 * This interceptor provides:
 * 1. Fallback extraction from Authentication if JwtAuthFilter didn't set it
 * 2. Logging for debugging
 *
 * Flow:
 * 1. preHandle() → Verify/set tenant from Authentication if not already set
 * 2. Controller executes → Uses TenantContext.getTenantId() in repositories
 * 3. afterCompletion() → JwtAuthFilter already clears it in finally block
 *
 * Registration: Added to WebMvcConfig.addInterceptors().
 */
@Slf4j
@Component
public class TenantContextInterceptor implements HandlerInterceptor {

  @Override
  public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
    try {
      Authentication auth = SecurityContextHolder.getContext().getAuthentication();

      if (auth != null && auth.isAuthenticated()) {
        // If TenantContext not already set (fallback if JwtAuthFilter didn't run)
        if (TenantContext.getTenantId() == null) {
          UUID tenantId = extractTenantFromAuthPrincipal(auth);
          if (tenantId != null) {
            TenantContext.setTenantId(tenantId);
            log.debug("TenantContext set via interceptor fallback: {}", tenantId);
          }
        } else {
          log.debug("TenantContext already set by JwtAuthFilter: {}", TenantContext.getTenantId());
        }
      } else {
        log.debug("No authentication in request: {}", request.getRequestURI());
      }

      return true;

    } catch (Exception ex) {
      log.error("Error setting tenant context", ex);
      // Do NOT block the request; let GlobalExceptionHandler catch downstream errors
      return true;
    }
  }

  /**
   * Extract tenant ID from AuthPrincipal.
   *
   * AuthPrincipal is set by JwtAuthFilter and contains companyId (tenant).
   *
   * @param auth Spring Security Authentication with AuthPrincipal
   * @return UUID of tenant, or null if not found
   */
  private UUID extractTenantFromAuthPrincipal(Authentication auth) {
    try {
      // JwtAuthFilter sets principal to AuthPrincipal which has companyId
      if (auth.getPrincipal() instanceof AuthPrincipal principal) {
        return principal.companyId();
      }
      return null;
    } catch (Exception ex) {
      log.warn("Failed to extract tenant from AuthPrincipal: {}", ex.getMessage());
      return null;
    }
  }
}
