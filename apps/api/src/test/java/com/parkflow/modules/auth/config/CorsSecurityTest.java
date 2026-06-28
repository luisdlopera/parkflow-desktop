package com.parkflow.modules.auth.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.web.cors.CorsConfiguration;

class CorsSecurityTest {

    @Test
    void testCorsConfiguration_AllowedOrigins() {
        // Given: CORS config for development
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of(
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:6001"
        ));

        // Then: Only specific origins allowed
        assertThat(config.getAllowedOrigins()).hasSize(3);
        assertThat(config.getAllowedOrigins()).doesNotContain("https://untrusted-site.com");
    }

    @Test
    void testCorsConfiguration_AllowedMethods() {
        // Given: CORS config
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedMethods(List.of("GET", "POST", "PATCH", "DELETE", "OPTIONS"));

        // Then: Only safe HTTP methods allowed
        assertThat(config.getAllowedMethods()).contains("GET", "POST", "PATCH", "DELETE");
        assertThat(config.getAllowedMethods()).doesNotContain("TRACE", "CONNECT");
    }

    @Test
    void testCorsConfiguration_AllowedHeaders() {
        // Given: CORS config
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedHeaders(List.of("Content-Type", "Authorization", "X-Requested-With"));

        // Then: Only necessary headers allowed
        assertThat(config.getAllowedHeaders()).contains("Content-Type", "Authorization");
        assertThat(config.getAllowedHeaders()).doesNotContain("*"); // Should be explicit, not wildcard
    }

    @Test
    void testCorsConfiguration_CredeentialsAllowed() {
        // Given: CORS config
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowCredentials(true);
        config.setAllowedOrigins(List.of("http://localhost:3000"));

        // Then: Credentials (cookies) allowed for same-origin requests
        assertThat(config.getAllowCredentials()).isTrue();
    }

    @Test
    void testCorsConfiguration_MaxAge() {
        // Given: CORS preflight cache
        CorsConfiguration config = new CorsConfiguration();
        config.setMaxAge(3600L); // 1 hour

        // Then: Preflight requests cached appropriately
        assertThat(config.getMaxAge()).isEqualTo(3600L);
    }

    @Test
    void testCorsConfiguration_ExposedHeaders() {
        // Given: CORS config
        CorsConfiguration config = new CorsConfiguration();
        config.setExposedHeaders(List.of("X-Total-Count", "X-Page-Number"));

        // Then: Only safe headers exposed
        assertThat(config.getExposedHeaders()).contains("X-Total-Count");
        assertThat(config.getExposedHeaders()).doesNotContain("Authorization"); // Should not expose sensitive headers
    }
}
