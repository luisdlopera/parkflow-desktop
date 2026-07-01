package com.parkflow.modules.auth.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.mockito.Mockito.when;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.MalformedJwtException;
import java.util.Date;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.env.Environment;

@ExtendWith(MockitoExtension.class)
class JwtTokenServiceTest {

    @Mock
    private Environment environment;

    private JwtTokenService jwtTokenService;
    private final String testSecret = "dummy_secret_for_testing_purposes";
    private final UUID userId = UUID.randomUUID();
    private final UUID companyId = UUID.randomUUID();
    private final UUID sessionId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        when(environment.getActiveProfiles()).thenReturn(new String[]{"test"});
        jwtTokenService = new JwtTokenService(testSecret, 15, 7, 30, environment);
    }

    @Test
    void testCreateAccessToken_ReturnsValidJwt() {
        // Act
        String token = jwtTokenService.createAccessToken(
            userId, companyId, sessionId, "test@example.com", Map.of("role", "ADMIN"));

        // Assert
        assertThat(token).isNotBlank();
        Claims claims = jwtTokenService.parse(token);
        assertThat(claims.getSubject()).isEqualTo(userId.toString());
        assertThat(claims.get("cid")).isEqualTo(companyId.toString());
        assertThat(claims.get("sid")).isEqualTo(sessionId.toString());
        assertThat(claims.get("email")).isEqualTo("test@example.com");
        assertThat(claims.get("role")).isEqualTo("ADMIN");
    }

    @Test
    void testCreateRefreshToken_ReturnsValidJwt() {
        // Act
        String token = jwtTokenService.createRefreshToken(userId, sessionId, "jti123");

        // Assert
        assertThat(token).isNotBlank();
        Claims claims = jwtTokenService.parse(token);
        assertThat(claims.getSubject()).isEqualTo(userId.toString());
        assertThat(claims.get("sid")).isEqualTo(sessionId.toString());
        assertThat(claims.get("jti")).isEqualTo("jti123");
        assertThat(claims.get("typ")).isEqualTo("refresh");
    }

    @Test
    void testParse_InvalidToken_ThrowsException() {
        // Act
        MalformedJwtException ex = catchThrowableOfType(() -> jwtTokenService.parse("invalid.token.here"), MalformedJwtException.class);

        // Assert
        assertThat(ex).isNotNull();
    }

    @Test
    void testClockSkew_AllowsSlightlyExpiredToken() {
        // Arrange
        // Clock skew is 30 seconds by default in the test setup
        javax.crypto.SecretKey secretKey = (javax.crypto.SecretKey) org.springframework.test.util.ReflectionTestUtils.getField(jwtTokenService, "key");
        String token = io.jsonwebtoken.Jwts.builder()
            .subject(userId.toString())
            .expiration(new Date(System.currentTimeMillis() - 10000)) // Expired 10 seconds ago
            .signWith(secretKey)
            .compact();

        // Act & Assert
        // Should NOT throw ExpiredJwtException because 10s is within the 30s skew
        Claims claims = jwtTokenService.parse(token);
        assertThat(claims.getSubject()).isEqualTo(userId.toString());
    }

    @Test
    void testClockSkew_RejectsTokenBeyondSkew() {
        // Arrange
        javax.crypto.SecretKey secretKey = (javax.crypto.SecretKey) org.springframework.test.util.ReflectionTestUtils.getField(jwtTokenService, "key");
        String token = io.jsonwebtoken.Jwts.builder()
            .subject(userId.toString())
            .expiration(new Date(System.currentTimeMillis() - 40000)) // Expired 40 seconds ago
            .signWith(secretKey)
            .compact();

        // Act & Assert
        ExpiredJwtException ex = catchThrowableOfType(() -> jwtTokenService.parse(token), ExpiredJwtException.class);
        assertThat(ex).isNotNull();
    }

    @Test
    void testInitialization_ShortKeyProd_ThrowsException() {
        // Arrange
        when(environment.getActiveProfiles()).thenReturn(new String[]{"prod"});

        // Act
        IllegalStateException ex = catchThrowableOfType(() -> new JwtTokenService("short", 15, 7, 30, environment), IllegalStateException.class);

        // Assert
        assertThat(ex).isNotNull();
        assertThat(ex.getMessage()).contains("must be a 256-bit");
    }

    @Test
    void testKeyRotation_NotSupported_FailsWhenKeyChanges() {
        // Arrange
        String token = jwtTokenService.createAccessToken(
            userId, companyId, sessionId, "test@example.com", Map.of());

        // Simulate key rotation by creating a new service with a different key
        JwtTokenService rotatedService = new JwtTokenService(
            "new_dummy_secret_for_testing_purposes_must_be_32_chars", 15, 7, 30, environment);

        // Act & Assert
        // The rotated service should fail to parse the token signed with the old key
        io.jsonwebtoken.security.SignatureException ex = catchThrowableOfType(
            () -> rotatedService.parse(token), 
            io.jsonwebtoken.security.SignatureException.class);
        
        assertThat(ex).isNotNull();
    }
}
