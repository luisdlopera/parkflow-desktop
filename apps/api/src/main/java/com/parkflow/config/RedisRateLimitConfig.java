package com.parkflow.config;

import io.github.bucket4j.distributed.proxy.ProxyManager;
import io.github.bucket4j.redis.lettuce.cas.LettuceBasedProxyManager;
import io.lettuce.core.RedisClient;
import io.lettuce.core.api.StatefulRedisConnection;
import io.lettuce.core.codec.ByteArrayCodec;
import io.lettuce.core.codec.RedisCodec;
import io.lettuce.core.codec.StringCodec;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.annotation.Value;

/**
 * Redis-Backed Rate Limiting Configuration (Enterprise Edition)
 *
 * Enables distributed rate limiting across multiple API instances using Redis.
 */
@Configuration
@ConditionalOnProperty(
    name = "parkflow.redis.enabled",
    havingValue = "true",
    matchIfMissing = false)
public class RedisRateLimitConfig {

  @Value("${spring.data.redis.host:localhost}")
  private String redisHost;

  @Value("${spring.data.redis.port:6379}")
  private int redisPort;

  @Value("${spring.data.redis.password:}")
  private String redisPassword;

  @Bean
  public RedisClient redisClient() {
    String auth = redisPassword != null && !redisPassword.isEmpty() ? redisPassword + "@" : "";
    return RedisClient.create("redis://" + auth + redisHost + ":" + redisPort);
  }

  @Bean
  public StatefulRedisConnection<byte[], byte[]> redisConnection(RedisClient redisClient) {
    return redisClient.connect(RedisCodec.of(ByteArrayCodec.INSTANCE, ByteArrayCodec.INSTANCE));
  }

  @Bean
  public ProxyManager<byte[]> redisProxyManager(StatefulRedisConnection<byte[], byte[]> connection) {
    return LettuceBasedProxyManager.builderFor(connection)
        .build();
  }
}
