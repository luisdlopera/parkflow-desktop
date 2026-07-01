package com.parkflow.modules.auth.security;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.UUID;

@Service
public class RedisSessionCacheService {

    private static final Logger log = LoggerFactory.getLogger(RedisSessionCacheService.class);
    private static final String SESSION_PREFIX = "parkflow:global:auth:session:";
    private static final String BLACKLIST_PREFIX = "parkflow:global:auth:blacklist:";

    @Autowired(required = false)
    private RedisTemplate<String, String> redisTemplate;

    public void cacheSession(UUID sessionId, UUID userId, boolean active, boolean blocked, Duration ttl) {
        if (redisTemplate == null) return;
        try {
            String key = SESSION_PREFIX + sessionId.toString();
            String value = userId.toString() + ":" + active + ":" + blocked;
            redisTemplate.opsForValue().set(key, value, ttl);
        } catch (Exception e) {
            log.warn("Failed to cache session in Redis", e);
        }
    }

    public void evictSession(UUID sessionId) {
        if (redisTemplate == null) return;
        try {
            redisTemplate.delete(SESSION_PREFIX + sessionId.toString());
        } catch (Exception e) {
            log.warn("Failed to evict session from Redis", e);
        }
    }

    public void addToBlacklist(UUID sessionId, Duration ttl) {
        if (redisTemplate == null) return;
        try {
            redisTemplate.opsForValue().set(BLACKLIST_PREFIX + sessionId.toString(), "revoked", ttl);
            evictSession(sessionId); // Ensure it's removed from valid cache
        } catch (Exception e) {
            log.warn("Failed to add session to blacklist", e);
        }
    }

    public boolean isBlacklisted(UUID sessionId) {
        if (redisTemplate == null) return false;
        try {
            return Boolean.TRUE.equals(redisTemplate.hasKey(BLACKLIST_PREFIX + sessionId.toString()));
        } catch (Exception e) {
            log.warn("Failed to check blacklist in Redis", e);
            return false;
        }
    }

    /**
     * @return true if valid and active in cache, false if we need to check DB or if it's invalid.
     */
    public SessionCacheResult checkSession(UUID sessionId) {
        if (redisTemplate == null) return null;
        try {
            if (isBlacklisted(sessionId)) {
                return new SessionCacheResult(null, false, false, true);
            }
            String val = redisTemplate.opsForValue().get(SESSION_PREFIX + sessionId.toString());
            if (val == null) {
                return null; // Cache miss
            }
            String[] parts = val.split(":");
            if (parts.length == 3) {
                return new SessionCacheResult(
                        UUID.fromString(parts[0]),
                        Boolean.parseBoolean(parts[1]),
                        Boolean.parseBoolean(parts[2]),
                        false
                );
            }
            return null;
        } catch (Exception e) {
            log.warn("Failed to check session from Redis", e);
            return null;
        }
    }

    public record SessionCacheResult(UUID userId, boolean active, boolean blocked, boolean blacklisted) {
        public boolean isValidAndNotBlocked() {
            return !blacklisted && active && !blocked;
        }
    }
}
