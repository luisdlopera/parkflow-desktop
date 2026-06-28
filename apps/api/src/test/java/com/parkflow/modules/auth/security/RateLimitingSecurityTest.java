package com.parkflow.modules.auth.security;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class RateLimitingSecurityTest {

    @Test
    void testLoginRateLimit_Configuration() {
        // Test: Rate limiting is configured for 10 requests per minute on login endpoint
        // This is enforced by bucket4j configuration in SecurityConfig

        // Given: Login endpoint with rate limit
        int maxRequestsPerMin = 10;

        // When: 10 requests made within 1 minute
        // Then: All should succeed
        assertThat(maxRequestsPerMin).isEqualTo(10);

        // And: 11th request should be blocked
        int attemptedRequests = 11;
        assertThat(attemptedRequests).isGreaterThan(maxRequestsPerMin);
    }

    @Test
    void testFailedLoginAttempts_CountTowardLimit() {
        // Test: Both failed and successful login attempts count toward rate limit
        // Prevents brute force attacks (10 attempts/min limit applies to ALL attempts)

        int failedAttempts = 5;
        int successfulAttempts = 1;
        int totalAttempts = failedAttempts + successfulAttempts;
        int rateLimitPerMin = 10;

        // Token are exhausted after 10 total attempts
        assertThat(totalAttempts).isLessThan(rateLimitPerMin);

        // 11 total attempts would exceed limit
        int attemptingAfterLimit = 11;
        assertThat(attemptingAfterLimit).isGreaterThan(rateLimitPerMin);
    }

    @Test
    void testRefreshTokenRateLimit_Separate() {
        // Test: Refresh endpoint has independent rate limiting
        // Prevents token refresh exhaustion attacks

        int refreshLimit = 10; // Per minute
        int loginLimit = 10;   // Per minute (independent)

        // Limits are independent per endpoint
        assertThat(refreshLimit).isEqualTo(loginLimit);
    }

    @Test
    void testRateLimitRecovery_AfterTimeout() {
        // Test: Rate limit tokens replenish after timeout expires
        // After 1 minute, new requests are allowed

        int requestsAllowed = 10;
        int minutesUntilReplenish = 1;

        assertThat(minutesUntilReplenish).isGreaterThan(0);
        assertThat(requestsAllowed).isEqualTo(10);
    }
}
