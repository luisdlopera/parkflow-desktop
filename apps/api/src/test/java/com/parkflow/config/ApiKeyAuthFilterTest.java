package com.parkflow.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;

@ExtendWith(MockitoExtension.class)
class ApiKeyAuthFilterTest {

    @Mock private FilterChain filterChain;

    @Nested
    class Construction {

        @Test
        void throwsWhenApiKeyIsNull() {
            assertThatThrownBy(() -> new ApiKeyAuthFilter(null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Invalid API key");
        }

        @Test
        void throwsWhenApiKeyIsBlank() {
            assertThatThrownBy(() -> new ApiKeyAuthFilter("   "))
                .isInstanceOf(IllegalArgumentException.class);
        }

        @Test
        void throwsWhenApiKeyIsDevDefault() {
            assertThatThrownBy(() -> new ApiKeyAuthFilter("parkflow-dev-key"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("non-default");
        }

        @Test
        void succeedsWithValidKey() {
            // Should not throw
            new ApiKeyAuthFilter("secure-production-key-12345");
        }
    }

    @Nested
    class ShouldNotFilter {

        private final ApiKeyAuthFilter filter = new ApiKeyAuthFilter("secure-key-xyz");

        @Test
        void skipsFilterForActuatorHealth() {
            assertThat(filter.shouldNotFilter(new MockHttpServletRequest("GET", "/actuator/health"))).isTrue();
        }

        @Test
        void skipsFilterForSwaggerUi() {
            assertThat(filter.shouldNotFilter(new MockHttpServletRequest("GET", "/swagger-ui/index.html"))).isTrue();
        }

        @Test
        void skipsFilterForApiDocs() {
            assertThat(filter.shouldNotFilter(new MockHttpServletRequest("GET", "/v3/api-docs/openapi.json"))).isTrue();
        }

        @Test
        void appliesFilterForApiPaths() {
            assertThat(filter.shouldNotFilter(new MockHttpServletRequest("GET", "/api/v1/config"))).isFalse();
        }

        @Test
        void appliesFilterForInternalPaths() {
            assertThat(filter.shouldNotFilter(new MockHttpServletRequest("POST", "/api/v1/internal/sync"))).isFalse();
        }
    }

    @Nested
    class Authentication {

        private final String validKey = "secure-production-key-xyz";
        private final ApiKeyAuthFilter filter = new ApiKeyAuthFilter(validKey);

        @Test
        void passesNonInternalRouteWithoutKey() throws Exception {
            MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/config");
            MockHttpServletResponse response = new MockHttpServletResponse();

            filter.doFilter(request, response, filterChain);

            verify(filterChain).doFilter(request, response);
            assertThat(response.getStatus()).isNotEqualTo(401);
        }

        @Test
        void returns401ForInternalRouteWithoutKey() throws Exception {
            MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/internal/sync");
            MockHttpServletResponse response = new MockHttpServletResponse();

            filter.doFilter(request, response, filterChain);

            assertThat(response.getStatus()).isEqualTo(401);
            verify(filterChain, never()).doFilter(any(), any());
        }

        @Test
        void returns401ForWebhookRouteWithoutKey() throws Exception {
            MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/webhook/notify");
            MockHttpServletResponse response = new MockHttpServletResponse();

            filter.doFilter(request, response, filterChain);

            assertThat(response.getStatus()).isEqualTo(401);
            verify(filterChain, never()).doFilter(any(), any());
        }

        @Test
        void returns401WhenInvalidKeyProvided() throws Exception {
            MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/internal/sync");
            request.addHeader("X-API-Key", "wrong-key");
            MockHttpServletResponse response = new MockHttpServletResponse();

            filter.doFilter(request, response, filterChain);

            assertThat(response.getStatus()).isEqualTo(401);
            assertThat(response.getContentAsString()).contains("AUTH_UNAUTHORIZED");
            verify(filterChain, never()).doFilter(any(), any());
        }

        @Test
        void authenticatesAndProceedsWithValidKey() throws Exception {
            SecurityContextHolder.clearContext();
            MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/internal/sync");
            request.addHeader("X-API-Key", validKey);
            MockHttpServletResponse response = new MockHttpServletResponse();

            filter.doFilter(request, response, filterChain);

            verify(filterChain).doFilter(request, response);
            assertThat(response.getStatus()).isNotEqualTo(401);
            var auth = SecurityContextHolder.getContext().getAuthentication();
            assertThat(auth).isNotNull();
            assertThat(auth.getPrincipal()).isEqualTo("api-key-client");
            assertThat(auth.getAuthorities())
                .anyMatch(a -> a.getAuthority().equals("ROLE_API_CLIENT"));
            SecurityContextHolder.clearContext();
        }

        @Test
        void validKeyOnNonInternalRouteAlsoAuthenticated() throws Exception {
            SecurityContextHolder.clearContext();
            MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/config");
            request.addHeader("X-API-Key", validKey);
            MockHttpServletResponse response = new MockHttpServletResponse();

            filter.doFilter(request, response, filterChain);

            verify(filterChain).doFilter(request, response);
            SecurityContextHolder.clearContext();
        }

        @Test
        void unauthorizedResponseIncludesWwwAuthenticateHeader() throws Exception {
            MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/internal/sync");
            MockHttpServletResponse response = new MockHttpServletResponse();

            filter.doFilter(request, response, filterChain);

            assertThat(response.getHeader("WWW-Authenticate")).isEqualTo("ApiKey");
        }
    }
}
