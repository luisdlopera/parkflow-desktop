package com.parkflow.config;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import java.util.Arrays;

/**
 * Validates that critical security properties are overridden in non-development profiles.
 * Prevents accidental deployment with default secrets.
 */
@Slf4j
@Configuration
public class SecurityPropertiesValidator {

    private final Environment environment;

    @Value("${app.security.api-key}")
    private String apiKey;

    @Value("${app.security.jwt-secret}")
    private String jwtSecret;

    public SecurityPropertiesValidator(Environment environment) {
        this.environment = environment;
    }

    @PostConstruct
    public void validate() {
        boolean isDev = Arrays.asList(environment.getActiveProfiles()).contains("dev") 
                     || environment.getActiveProfiles().length == 0;

        if (!isDev) {
            // Validate API key: ensure it's not the example placeholder or blank
            if (apiKey == null || apiKey.trim().isEmpty() || "REPLACE_WITH_SECURE_API_KEY".equals(apiKey)) {
                log.error("CRITICAL: Default or empty API Key detected in non-development profile!");
                throw new IllegalStateException("Production environment must override app.security.api-key");
            }

            // Validate JWT secret: must be Base64 and at least 32 bytes when decoded
            if (jwtSecret == null || jwtSecret.trim().isEmpty() || "REPLACE_WITH_BASE64_JWT_SECRET".equals(jwtSecret)) {
                log.error("CRITICAL: Default or empty JWT Secret detected in non-development profile!");
                throw new IllegalStateException("Production environment must override app.security.jwt-secret");
            }
            try {
                byte[] bytes = java.util.Base64.getDecoder().decode(jwtSecret);
                if (bytes.length < 32) {
                    log.error("CRITICAL: JWT secret after Base64 decode is shorter than 32 bytes (256 bits)");
                    throw new IllegalStateException("JWT secret must be at least 32 bytes when Base64 decoded");
                }
            } catch (IllegalArgumentException ex) {
                log.error("CRITICAL: JWT secret is not valid Base64");
                throw new IllegalStateException("JWT secret must be Base64 encoded and at least 32 bytes after decoding");
            }

            log.info("Security properties validation passed.");
        } else {
            log.warn("Development profile active: default security properties are allowed.");
        }
    }
}
