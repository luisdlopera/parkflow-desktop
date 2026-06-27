package com.parkflow.modules.auth.security;

import com.parkflow.modules.auth.domain.UserRole;
import com.parkflow.modules.common.exception.OperationException;
import jakarta.servlet.http.HttpServletRequest;
import java.util.UUID;
import org.springframework.lang.NonNull;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public final class SecurityUtils {
  private SecurityUtils() {}

  @NonNull
  public static UUID requireUserId() {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth == null || !(auth.getPrincipal() instanceof AuthPrincipal principal)) {
      throw new OperationException(HttpStatus.UNAUTHORIZED, "No hay sesion de usuario");
    }
    return principal.userId();
  }

  @NonNull
  public static UUID requireCompanyId() {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth == null || !(auth.getPrincipal() instanceof AuthPrincipal principal)) {
      throw new OperationException(HttpStatus.UNAUTHORIZED, "No hay sesion de usuario");
    }
    return principal.companyId();
  }

  public static UserRole requireUserRole() {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth == null || !(auth.getPrincipal() instanceof AuthPrincipal principal)) {
      throw new OperationException(HttpStatus.UNAUTHORIZED, "No hay sesion de usuario");
    }
    return UserRole.valueOf(principal.role());
  }

  /**
   * Mask email for safe logging (e.g., "a***@example.com").
   * Prevents information leakage in logs during enumeration attacks.
   */
  public static String maskEmail(String email) {
    if (email == null || email.length() < 3 || !email.contains("@")) {
      return "***";
    }
    String[] parts = email.split("@");
    String local = parts[0];
    String domain = parts[1];

    if (local.length() <= 1) {
      return "***@" + domain;
    }

    return local.charAt(0) + "***@" + domain;
  }

  /**
   * Extract client IP from request, respecting X-Forwarded-For (first value only).
   * SECURITY: Only trusts X-Forwarded-For if behind a reverse proxy.
   * In production, ensure your reverse proxy strips client-supplied X-Forwarded-For
   * headers and replaces with the real client IP.
   */
  public static String getClientIp(HttpServletRequest request) {
    String xForwardedFor = request.getHeader("X-Forwarded-For");
    if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
      String[] ips = xForwardedFor.split(",");
      String firstIp = ips[0].trim();
      if (!firstIp.isEmpty()) {
        return firstIp;
      }
    }

    String xRealIp = request.getHeader("X-Real-IP");
    if (xRealIp != null && !xRealIp.isEmpty()) {
      return xRealIp;
    }

    return request.getRemoteAddr();
  }
}
