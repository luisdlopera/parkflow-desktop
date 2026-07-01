package com.parkflow.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import java.util.concurrent.TimeUnit;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import java.time.Duration;

@Configuration
@EnableCaching
public class CacheConfig {

  public static final String PLAN_FEATURES = "plan-features";
  public static final String COMPANY_SETTINGS = "company-settings";
  public static final String VEHICLE_TYPES_ALL = "vehicle-types-all";
  public static final String VEHICLE_TYPES_COMPANY = "vehicle-types-company";
  public static final String PLANS_LIST = "plans-list";
  public static final String PAYMENT_METHODS = "payment-methods";

  @Bean
  @ConditionalOnProperty(name = "spring.cache.type", havingValue = "caffeine", matchIfMissing = true)
  public CacheManager caffeineCacheManager() {
    CaffeineCacheManager manager = new CaffeineCacheManager();
    manager.setCaffeine(
        Caffeine.newBuilder()
            .expireAfterWrite(5, TimeUnit.MINUTES)
            .maximumSize(1000)
            .recordStats()
    );
    return manager;
  }

  @Bean
  @ConditionalOnProperty(name = "spring.cache.type", havingValue = "redis")
  public CacheManager redisCacheManager(RedisConnectionFactory connectionFactory) {
    RedisCacheConfiguration config = RedisCacheConfiguration.defaultCacheConfig()
        .entryTtl(Duration.ofMinutes(5))
        .disableCachingNullValues();
    
    return RedisCacheManager.builder(connectionFactory)
        .cacheDefaults(config)
        .build();
  }
}

