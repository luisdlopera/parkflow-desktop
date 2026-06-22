package com.parkflow.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

@ExtendWith(MockitoExtension.class)
class RateLimitFilterTest {

    @Mock private RateLimitConfig rateLimitConfig;
    @Mock private FilterChain filterChain;
    @Mock private Bucket bucket;
    @Mock private ConsumptionProbe probe;

    private RateLimitFilter filter;

    @BeforeEach
    void setUp() {
        filter = new RateLimitFilter(rateLimitConfig);
    }

    @Nested
    class WhenRequestIsConsumed {

        @Test
        void allowsRequestAndAddsRemainingHeader() throws Exception {
            when(rateLimitConfig.resolveGeneralBucket(anyString())).thenReturn(bucket);
            when(bucket.tryConsumeAndReturnRemaining(1)).thenReturn(probe);
            when(probe.isConsumed()).thenReturn(true);
            when(probe.getRemainingTokens()).thenReturn(199L);

            MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/config");
            MockHttpServletResponse response = new MockHttpServletResponse();

            filter.doFilter(request, response, filterChain);

            verify(filterChain).doFilter(request, response);
            assertThat(response.getHeader("X-Rate-Limit-Remaining")).isEqualTo("199");
        }

        @Test
        void routesLoginPathToLoginBucket() throws Exception {
            when(rateLimitConfig.resolveLoginBucket(anyString())).thenReturn(bucket);
            when(bucket.tryConsumeAndReturnRemaining(1)).thenReturn(probe);
            when(probe.isConsumed()).thenReturn(true);

            MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/auth/login");
            filter.doFilter(request, new MockHttpServletResponse(), filterChain);

            verify(rateLimitConfig).resolveLoginBucket(contains("auth/login"));
            verifyNoMoreInteractions(rateLimitConfig);
        }

        @Test
        void routesReprintPathToReprintBucket() throws Exception {
            when(rateLimitConfig.resolveReprintBucket(anyString())).thenReturn(bucket);
            when(bucket.tryConsumeAndReturnRemaining(1)).thenReturn(probe);
            when(probe.isConsumed()).thenReturn(true);

            MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/sessions/reprint");
            filter.doFilter(request, new MockHttpServletResponse(), filterChain);

            verify(rateLimitConfig).resolveReprintBucket(anyString());
            verifyNoMoreInteractions(rateLimitConfig);
        }

        @Test
        void routesEntriesPathToOperationBucket() throws Exception {
            when(rateLimitConfig.resolveOperationBucket(anyString())).thenReturn(bucket);
            when(bucket.tryConsumeAndReturnRemaining(1)).thenReturn(probe);
            when(probe.isConsumed()).thenReturn(true);

            MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/entries");
            filter.doFilter(request, new MockHttpServletResponse(), filterChain);

            verify(rateLimitConfig).resolveOperationBucket(anyString());
        }

        @Test
        void routesExitsPathToOperationBucket() throws Exception {
            when(rateLimitConfig.resolveOperationBucket(anyString())).thenReturn(bucket);
            when(bucket.tryConsumeAndReturnRemaining(1)).thenReturn(probe);
            when(probe.isConsumed()).thenReturn(true);

            MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/exits");
            filter.doFilter(request, new MockHttpServletResponse(), filterChain);

            verify(rateLimitConfig).resolveOperationBucket(anyString());
        }
    }

    @Nested
    class WhenRateLimitExceeded {

        @Test
        void returns429WithRetryAfterHeader() throws Exception {
            when(rateLimitConfig.resolveLoginBucket(anyString())).thenReturn(bucket);
            when(bucket.tryConsumeAndReturnRemaining(1)).thenReturn(probe);
            when(probe.isConsumed()).thenReturn(false);
            when(probe.getNanosToWaitForRefill()).thenReturn(30_000_000_000L); // 30s

            MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/auth/login");
            MockHttpServletResponse response = new MockHttpServletResponse();

            filter.doFilter(request, response, filterChain);

            assertThat(response.getStatus()).isEqualTo(429);
            assertThat(response.getHeader("X-Rate-Limit-Retry-After-Seconds")).isEqualTo("30");
            assertThat(response.getContentAsString()).contains("Rate limit exceeded");
            verify(filterChain, never()).doFilter(any(), any());
        }

        @Test
        void responseContentTypeIsJson() throws Exception {
            when(rateLimitConfig.resolveGeneralBucket(anyString())).thenReturn(bucket);
            when(bucket.tryConsumeAndReturnRemaining(1)).thenReturn(probe);
            when(probe.isConsumed()).thenReturn(false);
            when(probe.getNanosToWaitForRefill()).thenReturn(60_000_000_000L);

            MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/config");
            MockHttpServletResponse response = new MockHttpServletResponse();

            filter.doFilter(request, response, filterChain);

            assertThat(response.getContentType()).contains("application/json");
        }
    }

    @Nested
    class ClientIpExtraction {

        @Test
        void usesXForwardedForWhenPresent() throws Exception {
            when(rateLimitConfig.resolveGeneralBucket(anyString())).thenReturn(bucket);
            when(bucket.tryConsumeAndReturnRemaining(1)).thenReturn(probe);
            when(probe.isConsumed()).thenReturn(true);

            MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/config");
            request.addHeader("X-Forwarded-For", "203.0.113.1, 10.0.0.1");

            filter.doFilter(request, new MockHttpServletResponse(), filterChain);

            // Key used should contain the first IP from X-Forwarded-For
            verify(rateLimitConfig).resolveGeneralBucket(argThat(k -> k.startsWith("203.0.113.1")));
        }

        @Test
        void usesXRealIpWhenXForwardedForAbsent() throws Exception {
            when(rateLimitConfig.resolveGeneralBucket(anyString())).thenReturn(bucket);
            when(bucket.tryConsumeAndReturnRemaining(1)).thenReturn(probe);
            when(probe.isConsumed()).thenReturn(true);

            MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/config");
            request.addHeader("X-Real-IP", "198.51.100.5");

            filter.doFilter(request, new MockHttpServletResponse(), filterChain);

            verify(rateLimitConfig).resolveGeneralBucket(argThat(k -> k.startsWith("198.51.100.5")));
        }

        @Test
        void fallsBackToRemoteAddrWhenNoProxyHeaders() throws Exception {
            when(rateLimitConfig.resolveGeneralBucket(anyString())).thenReturn(bucket);
            when(bucket.tryConsumeAndReturnRemaining(1)).thenReturn(probe);
            when(probe.isConsumed()).thenReturn(true);

            MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/config");
            request.setRemoteAddr("192.168.1.100");

            filter.doFilter(request, new MockHttpServletResponse(), filterChain);

            verify(rateLimitConfig).resolveGeneralBucket(argThat(k -> k.startsWith("192.168.1.100")));
        }
    }

    @Nested
    class ShouldNotFilter {

        @Test
        void skipsRateLimitForHealthEndpoint() {
            MockHttpServletRequest request = new MockHttpServletRequest("GET", "/actuator/health");
            assertThat(filter.shouldNotFilter(request)).isTrue();
        }

        @Test
        void skipsRateLimitForInfoEndpoint() {
            MockHttpServletRequest request = new MockHttpServletRequest("GET", "/actuator/info");
            assertThat(filter.shouldNotFilter(request)).isTrue();
        }

        @Test
        void skipsRateLimitForRootPath() {
            MockHttpServletRequest request = new MockHttpServletRequest("GET", "/");
            assertThat(filter.shouldNotFilter(request)).isTrue();
        }

        @Test
        void appliesRateLimitForApiPaths() {
            MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/config");
            assertThat(filter.shouldNotFilter(request)).isFalse();
        }

        @Test
        void appliesRateLimitForLoginPath() {
            MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/auth/login");
            assertThat(filter.shouldNotFilter(request)).isFalse();
        }
    }
}
