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
import java.util.HashMap;
import java.util.Map;

@Configuration
@EnableCaching
public class CacheConfig {

  // Cache names for @Cacheable annotations
  public static final String PLAN_FEATURES = "plan-features";
  public static final String COMPANY_SETTINGS = "company-settings";
  public static final String VEHICLE_TYPES_ALL = "vehicle-types-all";
  public static final String VEHICLE_TYPES_COMPANY = "vehicle-types-company";
  public static final String PLANS_LIST = "plans-list";
  public static final String PAYMENT_METHODS = "payment-methods";
  public static final String RATE_FRACTIONS = "rate-fractions";

  // Performance optimization caches (v3)
  public static final String RATES = "rates";
  public static final String USERS = "users";
  public static final String PARKING_SITES = "parking-sites";
  public static final String PARKING_SPACES = "parking-spaces";
  public static final String THEMES = "themes";

  @Bean
  @ConditionalOnProperty(name = "spring.cache.type", havingValue = "caffeine", matchIfMissing = true)
  public CacheManager caffeineCacheManager() {
    CaffeineCacheManager manager = new CaffeineCacheManager();
    manager.setCaffeine(
        Caffeine.newBuilder()
            .expireAfterWrite(5, TimeUnit.MINUTES)
            .maximumSize(10000)  // Increased for performance optimization
            .recordStats()
    );
    return manager;
  }

  @Bean
  @ConditionalOnProperty(name = "spring.cache.type", havingValue = "redis")
  public CacheManager redisCacheManager(RedisConnectionFactory connectionFactory) {
    RedisCacheConfiguration defaultConfig = RedisCacheConfiguration.defaultCacheConfig()
        .entryTtl(Duration.ofMinutes(5))
        .disableCachingNullValues();

    Map<String, RedisCacheConfiguration> cacheConfigurations = new HashMap<>();
    
    // Auth & Permissions
    cacheConfigurations.put(COMPANY_SETTINGS, defaultConfig.entryTtl(Duration.ofHours(1)));
    
    // Plans
    cacheConfigurations.put(PLAN_FEATURES, defaultConfig.entryTtl(Duration.ofHours(12)));
    cacheConfigurations.put(PLANS_LIST, defaultConfig.entryTtl(Duration.ofHours(12)));
    
    // Vehicles
    cacheConfigurations.put(VEHICLE_TYPES_ALL, defaultConfig.entryTtl(Duration.ofHours(24)));
    cacheConfigurations.put(VEHICLE_TYPES_COMPANY, defaultConfig.entryTtl(Duration.ofMinutes(30)));
    
    // Rates
    cacheConfigurations.put(RATE_FRACTIONS, defaultConfig.entryTtl(Duration.ofMinutes(30)));
    
    // Other
    cacheConfigurations.put("onboarding-defaults", defaultConfig.entryTtl(Duration.ofHours(24)));
    cacheConfigurations.put("companies", defaultConfig.entryTtl(Duration.ofHours(1)));

    return RedisCacheManager.builder(connectionFactory)
        .cacheDefaults(defaultConfig)
        .withInitialCacheConfigurations(cacheConfigurations)
        .build();
  }
}

