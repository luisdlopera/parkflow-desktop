package com.parkflow.modules.common.service;

import java.time.Duration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

/**
 * Provides simple distributed locking using Redis setIfAbsent.
 * Suitable for preventing double-clicks or double-processing in the same context.
 */
@Service
public class DistributedLockService {

    private static final Logger log = LoggerFactory.getLogger(DistributedLockService.class);

    @Autowired(required = false)
    private RedisTemplate<String, String> redisTemplate;

    /**
     * Attempts to acquire a lock.
     * @param lockKey The unique key for the lock (use RedisKeyBuilder for standard keys).
     * @param ttl The duration to hold the lock (to prevent deadlocks if the app crashes).
     * @return true if the lock was acquired, false if it's already held by another process.
     */
    public boolean acquireLock(String lockKey, Duration ttl) {
        if (redisTemplate == null) {
            log.warn("Redis not configured, bypassing distributed lock for key: {}", lockKey);
            return true;
        }
        try {
            Boolean success = redisTemplate.opsForValue().setIfAbsent(lockKey, "LOCKED", ttl);
            return Boolean.TRUE.equals(success);
        } catch (Exception e) {
            log.warn("Failed to acquire distributed lock for key: {}, bypassing lock.", lockKey, e);
            return true; // Graceful fallback
        }
    }

    /**
     * Releases a lock.
     * @param lockKey The unique key for the lock.
     */
    public void releaseLock(String lockKey) {
        if (redisTemplate == null) return;
        try {
            redisTemplate.delete(lockKey);
        } catch (Exception e) {
            log.warn("Failed to release distributed lock for key: {}", lockKey, e);
        }
    }
}
