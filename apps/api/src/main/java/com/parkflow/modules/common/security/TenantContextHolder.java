package com.parkflow.modules.common.security;

import java.util.UUID;
import org.slf4j.MDC;

/**
 * Thread-local holder for the current tenant's company ID.
 *
 * Extracted from JWT claims by TenantContextInterceptor on every request.
 * Used by repositories/specifications to filter by tenant automatically.
 *
 * CRITICAL: Must be cleared after request processing to prevent leakage between threads
 * (set in finally/afterCompletion blocks).
 */
public class TenantContextHolder {
  private static final ThreadLocal<UUID> TENANT_ID = new ThreadLocal<>();
  private static final String MDC_TENANT_KEY = "tenant_id";

  private TenantContextHolder() {
    throw new AssertionError("Utility class");
  }

  /**
   * Set the current tenant for this thread.
   * Also adds to SLF4J MDC for distributed tracing.
   */
  public static void setCurrentTenant(UUID tenantId) {
    TENANT_ID.set(tenantId);
    MDC.put(MDC_TENANT_KEY, tenantId != null ? tenantId.toString() : "unknown");
  }

  /**
   * Get the current tenant, throwing if not set.
   * MUST be called from within a controller/service context.
   */
  public static UUID getCurrentTenant() {
    UUID tenantId = TENANT_ID.get();
    if (tenantId == null) {
      throw new TenantContextMissingException(
          "TenantContext not initialized. Verify TenantContextInterceptor is registered.");
    }
    return tenantId;
  }

  /**
   * Get the current tenant, or null if not set.
   * Useful for optional contexts (e.g., anonymous endpoints).
   */
  public static UUID getCurrentTenantOrNull() {
    return TENANT_ID.get();
  }

  /**
   * Check if tenant context is set.
   */
  public static boolean hasCurrentTenant() {
    return TENANT_ID.get() != null;
  }

  /**
   * Clear the tenant context (MUST be called after each request).
   * Done in HandlerInterceptor.afterCompletion().
   */
  public static void clear() {
    TENANT_ID.remove();
    MDC.remove(MDC_TENANT_KEY);
  }
}
