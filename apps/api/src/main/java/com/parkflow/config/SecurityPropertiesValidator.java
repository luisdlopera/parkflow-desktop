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
            if ("dev-api-key-123".equals(apiKey)) {
                log.error("CRITICAL: Default API Key detected in non-development profile!");
                throw new IllegalStateException("Production environment must override app.security.api-key");
            }
            // Don't hardcode actual secrets in source. Compare against a placeholder instead.
            if ("REPLACE_WITH_BASE64_JWT_SECRET".equals(jwtSecret)) {
                log.error("CRITICAL: Default JWT Secret detected in non-development profile!");
                throw new IllegalStateException("Production environment must override app.security.jwt-secret");
            }
            log.info("Security properties validation passed.");
        } else {
            log.warn("Development profile active: default security properties are allowed.");
        }
    }
}
