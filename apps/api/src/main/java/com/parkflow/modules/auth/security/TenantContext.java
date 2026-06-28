package com.parkflow.modules.auth.security;

import com.parkflow.modules.common.exception.OperationException;
import java.util.UUID;
import org.springframework.http.HttpStatus;

public final class TenantContext {
  private static final ThreadLocal<UUID> CURRENT_TENANT = new ThreadLocal<>();

  private TenantContext() {}

  public static void setTenantId(UUID tenantId) {
    CURRENT_TENANT.set(tenantId);
  }

  public static UUID getTenantId() {
    return CURRENT_TENANT.get();
  }

  public static UUID getTenantIdOrThrow() {
    UUID tenantId = CURRENT_TENANT.get();
    if (tenantId == null) {
      throw new OperationException(HttpStatus.UNAUTHORIZED, "Contexto de tenant requerido");
    }
    return tenantId;
  }

  public static void clear() {
    CURRENT_TENANT.remove();
  }
}
