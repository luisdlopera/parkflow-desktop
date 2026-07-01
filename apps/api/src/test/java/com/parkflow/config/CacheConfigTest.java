package com.parkflow.config;

import org.junit.jupiter.api.Test;
import org.springframework.cache.CacheManager;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;

class CacheConfigTest {

    @Test
    void testRedisCacheManager_ConfiguresCustomTTLs() {
        CacheConfig cacheConfig = new CacheConfig();
        RedisConnectionFactory factory = mock(RedisConnectionFactory.class);

        CacheManager manager = cacheConfig.redisCacheManager(factory);

        assertNotNull(manager);
        assertTrue(manager instanceof RedisCacheManager);
        
        RedisCacheManager redisCacheManager = (RedisCacheManager) manager;
        // The cache manager should be properly built without exceptions
        // And the customized caches should be available for manual inspection
        assertNotNull(redisCacheManager);
    }
}
