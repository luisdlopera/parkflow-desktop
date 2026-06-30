package com.parkflow.modules.auth.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import com.parkflow.modules.audit.application.port.out.AuditPort;
import com.parkflow.modules.auth.domain.*;
import com.parkflow.modules.auth.domain.repository.*;
import com.parkflow.modules.auth.infrastructure.config.OAuth2ClientConfig;
import com.parkflow.modules.auth.security.*;
import com.parkflow.modules.common.exception.OperationException;
import jakarta.servlet.http.HttpServletResponse;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.*;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;

@ExtendWith(MockitoExtension.class)
class OAuth2ServiceTest {

    @Mock private OAuth2StateStore stateStore;
    @Mock private UserIdentityPort userIdentityPort;
    @Mock private AppUserPort appUserPort;
    @Mock private AuthCompanyPort authCompanyPort;
    @Mock private AuthSessionPort authSessionPort;
    @Mock private AuthorizedDevicePort authorizedDevicePort;
    @Mock private RefreshTokenFamilyPort refreshTokenFamilyPort;
    @Mock private JwtTokenService jwtTokenService;
    @Mock private PasswordHashService passwordHashService;
    @Mock private AuthenticationResponseAssembler responseAssembler;
    @Mock private AuthAuditService authAuditService;
    @Mock private AuditPort globalAuditService;
    @Mock private AuthCookieFactory authCookieFactory;
    @Mock private RestTemplate oAuth2RestTemplate;
    @Mock private HttpServletResponse httpServletResponse;

    private OAuth2ClientConfig oAuth2ClientConfig;
    private OAuth2Service oAuth2Service;
    private UUID userId;
    private UUID companyId;

    @BeforeEach
    void setUp() {
        oAuth2ClientConfig = new OAuth2ClientConfig(
            "test-client-id", "test-client-secret",
            "", ""
        );
        oAuth2Service = new OAuth2Service(
            stateStore, userIdentityPort, appUserPort, authCompanyPort,
            authSessionPort, authorizedDevicePort, refreshTokenFamilyPort,
            jwtTokenService, passwordHashService, responseAssembler,
            authAuditService, globalAuditService, authCookieFactory,
            oAuth2ClientConfig, oAuth2RestTemplate
        );
        ReflectionTestUtils.setField(oAuth2Service, "frontendUrl", "http://localhost:6001");

        userId = UUID.randomUUID();
        companyId = UUID.randomUUID();
    }

    @Test
    void buildAuthorizationUrl_shouldReturnValidUrl() {
        String provider = "google";
        String redirectBaseUrl = "http://localhost:6011";

        String url = oAuth2Service.buildAuthorizationUrl(provider, redirectBaseUrl);

        assertThat(url).isNotNull();
        assertThat(url).startsWith("https://accounts.google.com/o/oauth2/v2/auth");
        assertThat(url).contains("response_type=code");
        assertThat(url).contains("client_id=test-client-id");
        assertThat(url).contains("redirect_uri=" + redirectBaseUrl + "/api/v1/auth/oauth2/callback/" + provider);
        assertThat(url).contains("scope=openid");
        assertThat(url).contains("state=");
        assertThat(url).contains("nonce=");
        assertThat(url).contains("access_type=offline");
        assertThat(url).contains("prompt=consent");
    }

    @Test
    void buildAuthorizationUrl_shouldHaveUniqueStatePerCall() {
        String url1 = oAuth2Service.buildAuthorizationUrl("google", "http://localhost:6011");
        String url2 = oAuth2Service.buildAuthorizationUrl("google", "http://localhost:6011");

        String state1 = extractParam(url1, "state");
        String state2 = extractParam(url2, "state");
        assertThat(state1).isNotEqualTo(state2);
    }

    @Test
    void handleCallback_shouldThrowWhenStateIsInvalid() {
        when(stateStore.consume("invalid-state")).thenReturn(null);

        assertThatThrownBy(() ->
            oAuth2Service.handleCallback("google", "code", "invalid-state", httpServletResponse)
        ).isInstanceOf(OAuth2Exception.class)
         .hasFieldOrPropertyWithValue("errorCode", "invalid_state");
    }

    @Test
    void handleCallback_shouldThrowWhenProviderMismatch() {
        when(stateStore.consume("valid-state")).thenReturn(
            new OAuth2StateStore.OAuth2State("microsoft", "nonce", "redirect-uri")
        );

        assertThatThrownBy(() ->
            oAuth2Service.handleCallback("google", "code", "valid-state", httpServletResponse)
        ).isInstanceOf(OAuth2Exception.class)
         .hasFieldOrPropertyWithValue("errorCode", "provider_mismatch");
    }

    @Test
    void handleCallback_shouldThrowWhenTokenExchangeFails() {
        String state = "state";
        OAuth2StateStore.OAuth2State storedState = storedState("google", "nonce");
        when(stateStore.consume(state)).thenReturn(storedState);

        assertThatThrownBy(() ->
            oAuth2Service.handleCallback("google", "code", state, httpServletResponse)
        ).isInstanceOf(OperationException.class)
         .extracting(e -> ((OperationException) e).getStatus())
         .isEqualTo(HttpStatus.BAD_GATEWAY);
    }

    @Test
    void handleCallback_shouldThrowWhenIdTokenMissing() {
        String state = "state";
        OAuth2StateStore.OAuth2State storedState = storedState("google", "nonce");
        when(stateStore.consume(state)).thenReturn(storedState);
        Map<String, Object> tokenResponse = Map.of("access_token", "abc");
        doReturn(new ResponseEntity<>(tokenResponse, HttpStatus.OK))
            .when(oAuth2RestTemplate)
            .postForEntity(anyString(), any(), eq(Map.class));

        assertThatThrownBy(() ->
            oAuth2Service.handleCallback("google", "code", state, httpServletResponse)
        ).isInstanceOf(OAuth2Exception.class)
         .hasFieldOrPropertyWithValue("errorCode", "invalid_id_token");
    }

    @Test
    void oauth2Exception_shouldHaveCorrectErrorCodes() {
        assertThat(OAuth2Exception.invalidState().getErrorCode()).isEqualTo("invalid_state");
        assertThat(OAuth2Exception.userNotFound().getErrorCode()).isEqualTo("user_not_found");
        assertThat(OAuth2Exception.userInactive().getErrorCode()).isEqualTo("user_inactive");
        assertThat(OAuth2Exception.userBlocked().getErrorCode()).isEqualTo("user_blocked");
        assertThat(OAuth2Exception.invalidIdToken().getErrorCode()).isEqualTo("invalid_id_token");
        assertThat(OAuth2Exception.providerMismatch().getErrorCode()).isEqualTo("provider_mismatch");
    }

    private OAuth2StateStore.OAuth2State storedState(String provider, String nonce) {
        return new OAuth2StateStore.OAuth2State(
            provider, nonce,
            "http://localhost:6011/api/v1/auth/oauth2/callback/" + provider);
    }

    private String extractParam(String url, String param) {
        String[] parts = url.split("\\?");
        if (parts.length < 2) return null;
        for (String pair : parts[1].split("&")) {
            String[] kv = pair.split("=", 2);
            if (kv.length == 2 && kv[0].equals(param)) return kv[1];
        }
        return null;
    }
}
