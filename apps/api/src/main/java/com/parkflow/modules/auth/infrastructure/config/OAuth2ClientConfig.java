package com.parkflow.modules.auth.infrastructure.config;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

@Slf4j
@Configuration
public class OAuth2ClientConfig {

    private final Map<String, ClientRegistrationConfig> registrations = new ConcurrentHashMap<>();

    public OAuth2ClientConfig(
            @Value("${oauth2.google.client-id:}") String googleClientId,
            @Value("${oauth2.google.client-secret:}") String googleClientSecret,
            @Value("${oauth2.microsoft.client-id:}") String microsoftClientId,
            @Value("${oauth2.microsoft.client-secret:}") String microsoftClientSecret) {
        if (!googleClientId.isBlank() && !googleClientSecret.isBlank()) {
            registrations.put("google", new ClientRegistrationConfig(
                "google", googleClientId, googleClientSecret,
                "https://accounts.google.com/o/oauth2/v2/auth",
                "https://oauth2.googleapis.com/token",
                "https://www.googleapis.com/oauth2/v3/certs",
                "https://accounts.google.com",
                List.of("openid", "profile", "email")
            ));
            log.info("OAUTH: Google client registered");
        }

        if (!microsoftClientId.isBlank() && !microsoftClientSecret.isBlank()) {
            registrations.put("microsoft", new ClientRegistrationConfig(
                "microsoft", microsoftClientId, microsoftClientSecret,
                "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
                "https://login.microsoftonline.com/common/oauth2/v2.0/token",
                "https://login.microsoftonline.com/common/discovery/v2.0/keys",
                "https://login.microsoftonline.com/common/v2.0",
                List.of("openid", "profile", "email")
            ));
            log.info("OAUTH: Microsoft client registered");
        }
    }

    public ClientRegistrationConfig getRegistration(String provider) {
        ClientRegistrationConfig reg = registrations.get(provider);
        if (reg == null) {
            throw new IllegalArgumentException("OAuth2 provider not configured: " + provider);
        }
        return reg;
    }

    @Bean
    public RestTemplate oAuth2RestTemplate() {
        return new RestTemplateBuilder()
            .setConnectTimeout(Duration.ofSeconds(10))
            .setReadTimeout(Duration.ofSeconds(15))
            .build();
    }

    public record ClientRegistrationConfig(
        String provider,
        String clientId,
        String clientSecret,
        String authorizationUri,
        String tokenUri,
        String jwkSetUri,
        String issuerUri,
        List<String> scopes
    ) {}
}
