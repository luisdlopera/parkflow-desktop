package com.parkflow.modules.auth.application.service;

import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSVerifier;
import com.nimbusds.jose.crypto.ECDSAVerifier;
import com.nimbusds.jose.crypto.RSASSAVerifier;
import com.nimbusds.jose.jwk.ECKey;
import com.nimbusds.jose.jwk.JWK;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import com.parkflow.modules.audit.application.port.out.AuditPort;
import com.parkflow.modules.audit.domain.AuditAction;
import com.parkflow.modules.auth.application.port.in.OAuth2PortIn;
import com.parkflow.modules.auth.domain.*;
import com.parkflow.modules.auth.domain.repository.*;
import com.parkflow.modules.auth.infrastructure.config.OAuth2ClientConfig;
import com.parkflow.modules.auth.security.*;
import com.parkflow.modules.common.exception.OperationException;
import jakarta.servlet.http.HttpServletResponse;
import java.net.URI;
import java.net.URL;
import java.text.ParseException;
import java.time.OffsetDateTime;
import java.util.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

@Slf4j
@Service
@RequiredArgsConstructor
public class OAuth2Service implements OAuth2PortIn {

    private static final String PENDING_REFRESH_PREFIX = "pending:";

    private final OAuth2StateStore stateStore;
    private final UserIdentityPort userIdentityPort;
    private final AppUserPort appUserPort;
    private final AuthCompanyPort authCompanyPort;
    private final AuthSessionPort authSessionPort;
    private final AuthorizedDevicePort authorizedDevicePort;
    private final RefreshTokenFamilyPort refreshTokenFamilyPort;
    private final JwtTokenService jwtTokenService;
    private final PasswordHashService passwordHashService;
    private final AuthenticationResponseAssembler responseAssembler;
    private final AuthAuditService authAuditService;
    private final AuditPort globalAuditService;
    private final AuthCookieFactory authCookieFactory;
    private final OAuth2ClientConfig oAuth2ClientConfig;
    private final RestTemplate oAuth2RestTemplate;

    @Value("${app.frontend-url:http://localhost:6001}")
    private String frontendUrl;

    @Value("${app.security.offline-lease-hours:48}")
    private int defaultOfflineLeaseHours;

    @Override
    public String buildAuthorizationUrl(String provider, String redirectBaseUrl) {
        OAuth2ClientConfig.ClientRegistrationConfig reg = oAuth2ClientConfig.getRegistration(provider);
        String state = UUID.randomUUID().toString();
        String nonce = UUID.randomUUID().toString();
        String redirectUri = redirectBaseUrl + "/api/v1/auth/oauth2/callback/" + provider;

        stateStore.save(state, provider, nonce, redirectUri);

        return UriComponentsBuilder
            .fromUriString(reg.authorizationUri())
            .queryParam("response_type", "code")
            .queryParam("client_id", reg.clientId())
            .queryParam("redirect_uri", redirectUri)
            .queryParam("scope", String.join(" ", reg.scopes()))
            .queryParam("state", state)
            .queryParam("nonce", nonce)
            .queryParam("access_type", "offline")
            .queryParam("prompt", "consent")
            .build()
            .toUriString();
    }

    @Override
    @Transactional
    public void handleCallback(String provider, String code, String state, HttpServletResponse response) {
        OAuth2StateStore.OAuth2State stored = stateStore.consume(state);
        if (stored == null) {
            throw OAuth2Exception.invalidState();
        }
        if (!stored.provider().equals(provider)) {
            throw OAuth2Exception.providerMismatch();
        }

        OAuth2ClientConfig.ClientRegistrationConfig reg = oAuth2ClientConfig.getRegistration(provider);
        Map<String, Object> tokenResponse = exchangeCode(reg, code, stored.redirectUri());
        String idToken = (String) tokenResponse.get("id_token");
        if (idToken == null) {
            throw OAuth2Exception.invalidIdToken();
        }

        JWTClaimsSet claims = validateIdToken(reg, idToken, stored.nonce());

        String email;
        String sub;
        try {
            email = claims.getStringClaim("email");
            sub = claims.getSubject();
        } catch (java.text.ParseException e) {
            log.warn("OAUTH: Failed to parse claims from ID token - provider={}", provider);
            throw OAuth2Exception.invalidIdToken();
        }
        if (email == null || email.isBlank()) {
            log.warn("OAUTH: ID token missing email claim - provider={}, sub={}", provider, sub);
            throw OAuth2Exception.invalidIdToken();
        }

        UserIdentity identity = userIdentityPort.findByProviderAndProviderUserId(provider, sub).orElse(null);
        AppUser user;

        if (identity == null) {
            user = appUserPort.findGlobalByEmail(email)
                .orElseThrow(OAuth2Exception::userNotFound);

            UserIdentity newIdentity = new UserIdentity();
            newIdentity.setAppUserId(user.getId());
            newIdentity.setProvider(provider);
            newIdentity.setProviderUserId(sub);
            newIdentity.setEmail(email);
            userIdentityPort.save(newIdentity);

            log.info("OAUTH: Linked identity - provider={}, sub={}, userId={}", provider, sub, user.getId());
        } else {
            user = appUserPort.findById(identity.getAppUserId())
                .orElseThrow(OAuth2Exception::userNotFound);

            if (email != null && !email.equals(identity.getEmail())) {
                identity.setEmail(email);
                userIdentityPort.save(identity);
            }
        }

        if (!user.isActive()) {
            throw OAuth2Exception.userInactive();
        }
        if (user.isBlocked()) {
            throw OAuth2Exception.userBlocked();
        }

        user.setLastAccessAt(OffsetDateTime.now());
        appUserPort.save(user);

        AuthorizedDevice device = getOrCreateOAuthDevice(provider, user);
        AuthSession session = createOAuthSession(user, device);
        String refreshToken = jwtTokenService.createRefreshToken(
            user.getId(), session.getId(), session.getRefreshJti(),
            session.getTokenFamilyId(), session.getTokenGeneration());
        session.setRefreshTokenHash(passwordHashService.sha256(refreshToken));
        authSessionPort.save(session);

        String accessToken = jwtTokenService.createAccessToken(
            user.getId(), user.getCompanyId(), session.getId(), user.getEmail(),
            RolePermissions.claims(user.getRole()));

        authCookieFactory.setAuthCookies(response, accessToken, refreshToken, true);

        authAuditService.log(
            AuthAuditAction.LOGIN_SUCCESS,
            user, device, "OAUTH2_" + provider.toUpperCase(),
            Map.of("sessionId", session.getId().toString(), "provider", provider));

        globalAuditService.record(
            AuditAction.LOGIN, user, null,
            "OAuth2 login via " + provider,
            "Session ID: " + session.getId());
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    private Map<String, Object> exchangeCode(OAuth2ClientConfig.ClientRegistrationConfig reg, String code, String redirectUri) {
        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("code", code);
        body.add("client_id", reg.clientId());
        body.add("client_secret", reg.clientSecret());
        body.add("redirect_uri", redirectUri);
        body.add("grant_type", "authorization_code");

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<Map> response = oAuth2RestTemplate.postForEntity(reg.tokenUri(), request, Map.class);
            return response.getBody();
        } catch (Exception e) {
            log.error("OAUTH: Token exchange failed - provider={}, error={}", reg.provider(), e.getMessage());
            throw new OperationException(
                org.springframework.http.HttpStatus.BAD_GATEWAY,
                "Error al intercambiar el codigo de autorizacion con el proveedor.");
        }
    }

    private JWTClaimsSet validateIdToken(OAuth2ClientConfig.ClientRegistrationConfig reg, String idToken, String expectedNonce) {
        try {
            SignedJWT signedJWT = SignedJWT.parse(idToken);

            JWKSet jwkSet = JWKSet.load(URI.create(reg.jwkSetUri()).toURL());
            String keyId = signedJWT.getHeader().getKeyID();
            JWK jwk = jwkSet.getKeyByKeyId(keyId);
            if (jwk == null) {
                log.warn("OAUTH: JWK not found for keyId={}, provider={}", keyId, reg.provider());
                throw OAuth2Exception.invalidIdToken();
            }

            JWSVerifier verifier;
            if (jwk instanceof RSAKey rsaKey) {
                verifier = new RSASSAVerifier(rsaKey);
            } else if (jwk instanceof ECKey ecKey) {
                verifier = new ECDSAVerifier(ecKey);
            } else {
                throw OAuth2Exception.invalidIdToken();
            }

            if (!signedJWT.verify(verifier)) {
                throw OAuth2Exception.invalidIdToken();
            }

            JWTClaimsSet claims = signedJWT.getJWTClaimsSet();

            if (claims.getExpirationTime() != null && claims.getExpirationTime().before(new Date())) {
                throw OAuth2Exception.invalidIdToken();
            }

            if (claims.getIssuer() != null && !claims.getIssuer().equals(reg.issuerUri())) {
                log.warn("OAUTH: ID token issuer mismatch - expected={}, actual={}", reg.issuerUri(), claims.getIssuer());
                throw OAuth2Exception.invalidIdToken();
            }

            if (claims.getAudience() != null && !claims.getAudience().contains(reg.clientId())) {
                log.warn("OAUTH: ID token audience mismatch - expected={}, actual={}", reg.clientId(), claims.getAudience());
                throw OAuth2Exception.invalidIdToken();
            }

            String nonce = claims.getStringClaim("nonce");
            if (nonce == null || !nonce.equals(expectedNonce)) {
                log.warn("OAUTH: ID token nonce mismatch");
                throw OAuth2Exception.invalidIdToken();
            }

            return claims;

        } catch (ParseException | JOSEException | java.io.IOException e) {
            log.error("OAUTH: ID token validation failed - provider={}, error={}", reg.provider(), e.getMessage());
            throw OAuth2Exception.invalidIdToken();
        }
    }

    private AuthorizedDevice getOrCreateOAuthDevice(String provider, AppUser user) {
        String deviceId = "oauth2-" + provider + "-" + user.getId();
        AuthorizedDevice device = authorizedDevicePort.findByDeviceId(deviceId).orElseGet(() -> {
            AuthorizedDevice newDevice = new AuthorizedDevice();
            newDevice.setDeviceId(deviceId);
            newDevice.setDisplayName("Login via " + provider.substring(0, 1).toUpperCase() + provider.substring(1));
            newDevice.setPlatform("web");
            newDevice.setAuthorized(true);
            newDevice.setCompanyId(user.getCompanyId());
            newDevice.setLastSeenAt(OffsetDateTime.now());
            return newDevice;
        });
        device.setLastSeenAt(OffsetDateTime.now());
        return authorizedDevicePort.save(device);
    }

    private AuthSession createOAuthSession(AppUser user, AuthorizedDevice device) {
        AuthSession session = new AuthSession();
        session.setUser(user);
        session.setDevice(device);
        session.setCompanyId(user.getCompanyId());
        session.setRefreshJti(UUID.randomUUID().toString());
        session.setRefreshExpiresAt(OffsetDateTime.now().plus(jwtTokenService.refreshTtl()));
        session.setAccessExpiresAt(OffsetDateTime.now().plus(jwtTokenService.accessTtl()));
        session.setRefreshTokenHash(PENDING_REFRESH_PREFIX + UUID.randomUUID());

        RefreshTokenFamily family = new RefreshTokenFamily();
        family.setFamilyId(UUID.randomUUID());
        family.setUser(user);
        family.setCompanyId(user.getCompanyId());
        family.setGenerationNumber(1);
        family.setCreatedAt(OffsetDateTime.now());
        family = refreshTokenFamilyPort.save(family);

        session.setTokenFamilyId(family.getFamilyId());
        session.setTokenGeneration(1);
        session = authSessionPort.save(session);
        return session;
    }
}
