package com.parkflow.config;

import java.util.UUID;

/**
 * Helper class to centralize and standardize Redis keys in the Parkflow system.
 * Prevents key collision and enforces multi-tenant separation.
 */
public final class RedisKeyBuilder {

    private static final String NAMESPACE = "parkflow";

    private RedisKeyBuilder() {
        // Utility class
    }

    /**
     * Builds a tenant-isolated key for Redis caching or locking.
     * Format: parkflow:tenant:{tenantId}:{domain}:{key}
     *
     * @param tenantId The UUID of the company/tenant
     * @param domain   The bounded context or module (e.g., "auth", "settings", "pricing")
     * @param key      The specific entity or identifier being cached
     * @return Formatted key string
     */
    public static String buildTenantKey(UUID tenantId, String domain, String key) {
        if (tenantId == null || domain == null || key == null) {
            throw new IllegalArgumentException("tenantId, domain and key must not be null");
        }
        return String.format("%s:tenant:%s:%s:%s", NAMESPACE, tenantId, domain, key);
    }

    /**
     * Builds a global key for data not tied to a specific tenant.
     * Format: parkflow:global:{domain}:{key}
     *
     * @param domain The bounded context or module
     * @param key    The specific entity or identifier
     * @return Formatted key string
     */
    public static String buildGlobalKey(String domain, String key) {
        if (domain == null || key == null) {
            throw new IllegalArgumentException("domain and key must not be null");
        }
        return String.format("%s:global:%s:%s", NAMESPACE, domain, key);
    }
}
