package com.parkflow.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;

/**
 * Redis-Backed Rate Limiting Configuration (Enterprise Edition)
 *
 * <p>DEFERRED: Requires bucket4j-redis dependency. Currently disabled to allow compilation.
 * When Redis support is needed, add the dependency and uncomment the implementation.
 *
 * <p>Enables distributed rate limiting across multiple API instances using Redis.
 */
@Configuration
@ConditionalOnProperty(
    name = "parkflow.redis.enabled",
    havingValue = "true",
    matchIfMissing = false)
public class RedisRateLimitConfig {
  // DEFERRED: Implement Redis-backed rate limiting when bucket4j-redis is added
}
