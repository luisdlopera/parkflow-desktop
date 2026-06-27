package com.parkflow.modules.auth.security;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Service;

/**
 * Optional Redis-backed rate limiter using a Lua script for atomic INCR + EXPIRE.
 * Falls back to returning {@code true} (allow) if Redis is unavailable or not configured.
 */
@Service
public class RedisRateLimitService {

  private static final Logger log = LoggerFactory.getLogger(RedisRateLimitService.class);
  private static final String RATE_LIMIT_PREFIX = "rate:";

  @Autowired(required = false)
  private RedisTemplate<String, String> redisTemplate;

  private final DefaultRedisScript<Long> rateLimitScript;
  private volatile boolean fallbackLogged = false;

  public RedisRateLimitService() {
    this.rateLimitScript = new DefaultRedisScript<>();
    this.rateLimitScript.setLocation(new ClassPathResource("redisRateLimiter.lua"));
    this.rateLimitScript.setResultType(Long.class);
  }

  /**
   * Try to consume a token for the given key within a time window.
   *
   * @param key       unique identifier (e.g., IP + endpoint)
   * @param maxTokens maximum requests allowed in the window
   * @param windowSeconds time window in seconds
   * @return true if request is allowed, false if rate limited
   */
  public boolean tryConsume(String key, int maxTokens, int windowSeconds) {
    if (redisTemplate == null) {
      if (!fallbackLogged) {
        log.warn("SECURITY: Redis not configured, rate limit check skipped for key={}", key);
        fallbackLogged = true;
      }
      return true;
    }
    String redisKey = RATE_LIMIT_PREFIX + key;
    try {
      Long result = redisTemplate.execute(rateLimitScript, java.util.List.of(redisKey),
          String.valueOf(maxTokens), String.valueOf(windowSeconds));
      return result != null && result == 1;
    } catch (Exception e) {
      if (!fallbackLogged) {
        log.warn("SECURITY: Redis rate limit unavailable, allowing request for key={}: {}", key, e.getMessage());
        fallbackLogged = true;
      }
      return true;
    }
  }
}
