package com.parkflow.modules.common.security;

/**
 * Thrown when TenantContextHolder.getCurrentTenant() is called
 * but the tenant context has not been initialized (no JWT token, or no company_id claim).
 *
 * This is a development/configuration error, not a user error.
 * Verify that TenantContextInterceptor is registered in WebMvcConfig.
 */
public class TenantContextMissingException extends RuntimeException {
  private static final long serialVersionUID = 1L;
  public TenantContextMissingException(String message) {
    super(message);
  }

  public TenantContextMissingException(String message, Throwable cause) {
    super(message, cause);
  }
}
