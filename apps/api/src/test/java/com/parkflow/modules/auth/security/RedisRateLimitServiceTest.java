package com.parkflow.modules.auth.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentMatchers;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class RedisRateLimitServiceTest {

    private RedisRateLimitService redisRateLimitService;
    private RedisTemplate<String, String> redisTemplate;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        redisRateLimitService = new RedisRateLimitService();
        redisTemplate = mock(RedisTemplate.class);
        ReflectionTestUtils.setField(redisRateLimitService, "redisTemplate", redisTemplate);
    }

    @Test
    void tryConsume_WhenRedisAllows_ShouldReturnTrue() {
        when(redisTemplate.execute(ArgumentMatchers.<RedisScript<Long>>any(),
                ArgumentMatchers.anyList(),
                ArgumentMatchers.anyString(),
                ArgumentMatchers.anyString()))
                .thenReturn(1L);

        boolean allowed = redisRateLimitService.tryConsume("user1", 5, 60);
        assertTrue(allowed);
    }

    @Test
    void tryConsume_WhenRedisDenies_ShouldReturnFalse() {
        when(redisTemplate.execute(ArgumentMatchers.<RedisScript<Long>>any(),
                ArgumentMatchers.anyList(),
                ArgumentMatchers.anyString(),
                ArgumentMatchers.anyString()))
                .thenReturn(0L);

        boolean allowed = redisRateLimitService.tryConsume("user1", 5, 60);
        assertFalse(allowed);
    }

    @Test
    void tryConsume_WhenRedisThrowsException_ShouldGracefullyFallbackToTrue() {
        when(redisTemplate.execute(ArgumentMatchers.<RedisScript<Long>>any(),
                ArgumentMatchers.anyList(),
                ArgumentMatchers.anyString(),
                ArgumentMatchers.anyString()))
                .thenThrow(new org.springframework.data.redis.RedisConnectionFailureException("Connection refused"));

        // Even if Redis is down, we don't want to lock out all users
        boolean allowed = redisRateLimitService.tryConsume("user1", 5, 60);
        assertTrue(allowed);
    }
}
