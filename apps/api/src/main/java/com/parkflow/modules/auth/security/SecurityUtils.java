package com.parkflow.modules.auth.security;

import com.parkflow.modules.parking.operation.exception.OperationException;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public final class SecurityUtils {
  private SecurityUtils() {}

  public static UUID requireUserId() {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth == null || !(auth.getPrincipal() instanceof AuthPrincipal principal)) {
      throw new OperationException(HttpStatus.UNAUTHORIZED, "No hay sesion de usuario");
    }
    return principal.userId();
  }
}
