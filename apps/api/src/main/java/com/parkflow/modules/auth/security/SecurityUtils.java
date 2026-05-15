package com.parkflow.modules.auth.security;

import com.parkflow.modules.auth.domain.UserRole;
import com.parkflow.modules.common.exception.OperationException;
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
}
