package com.parkflow.modules.auth.security;

import java.time.Duration;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

@Service
public class TokenBlacklistService {

  private static final Logger log = LoggerFactory.getLogger(TokenBlacklistService.class);
  private static final String BLACKLIST_PREFIX = "token:blacklist:";

  private final Duration accessTtl;
  private final Set<String> inMemoryBlacklist = ConcurrentHashMap.newKeySet();

  @Autowired(required = false)
  private RedisTemplate<String, String> redisTemplate;

  private volatile boolean redisDownLogged = false;

  public TokenBlacklistService(
      @Value("${app.security.access-token-ttl-minutes:15}") long accessTtlMinutes) {
    this.accessTtl = Duration.ofMinutes(Math.max(5, accessTtlMinutes));
  }

  public void blacklist(String jti) {
    if (jti == null || jti.isBlank()) return;
    if (redisTemplate != null) {
      try {
        redisTemplate.opsForValue().set(BLACKLIST_PREFIX + jti, "true", accessTtl);
        return;
      } catch (Exception e) {
        if (!redisDownLogged) {
          log.warn("SECURITY: Redis unavailable for blacklist, falling back to in-memory", e);
          redisDownLogged = true;
        }
      }
    }
    inMemoryBlacklist.add(jti);
  }

  public boolean isBlacklisted(String jti) {
    if (jti == null || jti.isBlank()) return false;
    if (redisTemplate != null) {
      try {
        return Boolean.TRUE.equals(redisTemplate.hasKey(BLACKLIST_PREFIX + jti));
      } catch (Exception e) {
        if (!redisDownLogged) {
          log.warn("SECURITY: Redis unavailable for blacklist check, falling back to in-memory", e);
          redisDownLogged = true;
        }
      }
    }
    return inMemoryBlacklist.contains(jti);
  }
}
