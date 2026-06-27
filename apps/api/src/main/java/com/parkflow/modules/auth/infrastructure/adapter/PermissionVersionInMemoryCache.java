package com.parkflow.modules.auth.infrastructure.adapter;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.parkflow.modules.auth.application.port.out.PermissionVersionCachePort;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import org.springframework.stereotype.Component;

/**
 * In-memory implementation of {@link PermissionVersionCachePort} backed by a
 * Caffeine cache.
 *
 * <p><b>Characteristics</b>:
 * <ul>
 *   <li>TTL: 5 minutes after write (matches the access-token window well)</li>
 *   <li>Capacity: up to 50 000 entries (enough for large multi-tenant installs)</li>
 *   <li>Thread-safe: Caffeine is fully concurrent</li>
 * </ul>
 *
 * <p><b>Multi-instance note</b>: this cache is local to each JVM instance. In a
 * multi-node deployment a role/permission change will only be reflected
 * immediately on the node that processes the first request for the affected user
 * (it recomputes and warms the cache); other nodes will pick up the change
 * within the TTL window (≤ 5 min). For true instant propagation across nodes,
 * replace this adapter with a Redis-backed implementation (Phase 3).
 */
@Component
public class PermissionVersionInMemoryCache implements PermissionVersionCachePort {

    private final Cache<UUID, String> cache = Caffeine.newBuilder()
            .expireAfterWrite(5, TimeUnit.MINUTES)
            .maximumSize(50_000)
            .build();

    @Override
    public String getVersion(UUID userId) {
        return cache.getIfPresent(userId);
    }

    @Override
    public void putVersion(UUID userId, String permVersion) {
        if (userId != null && permVersion != null) {
            cache.put(userId, permVersion);
        }
    }

    @Override
    public void invalidate(UUID userId) {
        if (userId != null) {
            cache.invalidate(userId);
        }
    }
}
