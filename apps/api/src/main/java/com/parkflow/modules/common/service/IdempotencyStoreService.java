package com.parkflow.modules.common.service;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import java.time.Duration;
import java.util.concurrent.TimeUnit;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

/**
 * Shared idempotency key store.
 * <p>
 * Uses Redis when available so multiple app instances share the same state.
 * Falls back to an in-memory cache only when Redis is unavailable (tests/dev).
 */
@Slf4j
@Service
public class IdempotencyStoreService {

  private static final String PREFIX = "parkflow:idempotency:";

  @Autowired(required = false)
  private RedisTemplate<String, String> redisTemplate;

  private final Cache<String, String> localCache = Caffeine.newBuilder()
      .expireAfterWrite(24, TimeUnit.HOURS)
      .maximumSize(100_000)
      .build();

  public boolean reserve(String method, String uri, String idempotencyKey, Duration ttl) {
    String key = scopedKey(method, uri, idempotencyKey);
    try {
      if (redisTemplate != null) {
        Boolean stored = redisTemplate.opsForValue().setIfAbsent(key, "PROCESSING", ttl);
        return Boolean.TRUE.equals(stored);
      }
    } catch (Exception e) {
      log.warn("Redis idempotency store unavailable, using local cache", e);
    }

    return localCache.asMap().putIfAbsent(key, "PROCESSING") == null;
  }

  private String scopedKey(String method, String uri, String idempotencyKey) {
    return PREFIX + method.toUpperCase() + ":" + uri + ":" + idempotencyKey;
  }
}
