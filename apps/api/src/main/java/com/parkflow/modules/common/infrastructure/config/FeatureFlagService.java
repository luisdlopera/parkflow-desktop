package com.parkflow.modules.common.infrastructure.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Feature flag service for gradual API v2.0 rollout.
 * Supports global flags + per-tenant overrides.
 *
 * Usage:
 * ```java
 * @Autowired FeatureFlagService featureFlags;
 *
 * if (featureFlags.isEnabled("pagination_v2_enabled", tenantId)) {
 *   return new PageResponse<>(data);
 * } else {
 *   return new Page<>(data);  // v1 format
 * }
 * ```
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FeatureFlagService {

  // Global feature flags (mutable for testing/admin)
  private static final Map<String, Boolean> GLOBAL_FLAGS = new HashMap<>();

  static {
    // v2.0 Rollout flags - start disabled
    GLOBAL_FLAGS.put("pagination_v2_enabled", false);
    GLOBAL_FLAGS.put("error_codes_v2_format", false);
    GLOBAL_FLAGS.put("soft_delete_enabled", false);
    GLOBAL_FLAGS.put("optimistic_locking_enabled", false);
    GLOBAL_FLAGS.put("api_version_v2_enabled", false);

    // Other feature flags
    GLOBAL_FLAGS.put("enable_rate_limiting", true);
    GLOBAL_FLAGS.put("enable_caching", true);
  }

  /**
   * Check if flag is enabled globally or for specific tenant.
   * Tenant-specific overrides take precedence.
   */
  public boolean isEnabled(String flagName, UUID tenantId) {
    if (tenantId == null) {
      return isEnabledGlobally(flagName);
    }

    // TODO: Check tenant_feature_flags table for overrides
    // For now, use global flags only
    boolean enabled = isEnabledGlobally(flagName);
    log.debug("[FeatureFlag] {} = {} (tenant={})", flagName, enabled, tenantId);
    return enabled;
  }

  /**
   * Check if flag is enabled globally.
   */
  public boolean isEnabledGlobally(String flagName) {
    return GLOBAL_FLAGS.getOrDefault(flagName, false);
  }

  /**
   * Set global flag (for admin/testing).
   */
  public void setGlobal(String flagName, boolean value) {
    GLOBAL_FLAGS.put(flagName, value);
    log.info("[FeatureFlag] Global {} set to {}", flagName, value);
  }

  /**
   * Get all global flags.
   */
  public Map<String, Boolean> getAllFlags() {
    return new HashMap<>(GLOBAL_FLAGS);
  }

  // =========================
  // Convenience methods for common flags
  // =========================

  public boolean isV2PaginationEnabled(UUID tenantId) {
    return isEnabled("pagination_v2_enabled", tenantId);
  }

  public boolean isV2ErrorCodesEnabled(UUID tenantId) {
    return isEnabled("error_codes_v2_format", tenantId);
  }

  public boolean isSoftDeleteEnabled(UUID tenantId) {
    return isEnabled("soft_delete_enabled", tenantId);
  }

  public boolean isOptimisticLockingEnabled(UUID tenantId) {
    return isEnabled("optimistic_locking_enabled", tenantId);
  }

  public boolean isV2ApiEnabled(UUID tenantId) {
    return isEnabled("api_version_v2_enabled", tenantId);
  }
}
