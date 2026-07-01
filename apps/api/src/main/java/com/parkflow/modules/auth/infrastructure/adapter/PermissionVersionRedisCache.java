package com.parkflow.modules.auth.infrastructure.adapter;

import com.parkflow.modules.auth.application.port.out.PermissionVersionCachePort;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Primary;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;

/**
 * Redis-backed implementation of {@link PermissionVersionCachePort}.
 * Replaces Caffeine local cache to ensure multi-node instant invalidation.
 */
@Primary
@Component
public class PermissionVersionRedisCache implements PermissionVersionCachePort {

    private static final Logger log = LoggerFactory.getLogger(PermissionVersionRedisCache.class);
    private static final String KEY_PREFIX = "parkflow:global:auth:perm_version:";
    
    @Autowired(required = false)
    private RedisTemplate<String, String> redisTemplate;

    @Override
    public String getVersion(UUID userId) {
        if (redisTemplate == null || userId == null) return null;
        try {
            return redisTemplate.opsForValue().get(KEY_PREFIX + userId.toString());
        } catch (Exception e) {
            log.warn("Failed to get permission version from Redis", e);
            return null;
        }
    }

    @Override
    public void putVersion(UUID userId, String permVersion) {
        if (redisTemplate == null || userId == null || permVersion == null) return;
        try {
            // Expire after 5 minutes, same as old caffeine cache
            redisTemplate.opsForValue().set(KEY_PREFIX + userId.toString(), permVersion, 5, TimeUnit.MINUTES);
        } catch (Exception e) {
            log.warn("Failed to put permission version to Redis", e);
        }
    }

    @Override
    public void invalidate(UUID userId) {
        if (redisTemplate == null || userId == null) return;
        try {
            redisTemplate.delete(KEY_PREFIX + userId.toString());
        } catch (Exception e) {
            log.warn("Failed to invalidate permission version in Redis", e);
        }
    }
}
