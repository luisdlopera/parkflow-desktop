package com.parkflow.modules.auth.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.auth.domain.AuthAuditAction;
import com.parkflow.modules.auth.domain.AuthSession;
import com.parkflow.modules.auth.domain.AuthorizedDevice;
import com.parkflow.modules.auth.domain.UserRole;
import com.parkflow.modules.auth.domain.repository.AuthCompanyPort;
import com.parkflow.modules.auth.domain.repository.AuthSessionPort;
import com.parkflow.modules.auth.dto.LoginResult;
import com.parkflow.modules.auth.dto.RefreshRequest;
import com.parkflow.modules.auth.security.JwtTokenService;
import com.parkflow.modules.auth.security.PasswordHashService;
import com.parkflow.modules.common.exception.OperationException;
import io.jsonwebtoken.Claims;

import java.time.Duration;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class TokenRefreshUseCaseImplTest {

    @Mock
    private AuthSessionPort authSessionRepository;
    @Mock
    private JwtTokenService jwtTokenService;
    @Mock
    private PasswordHashService passwordHashService;
    @Mock
    private AuthAuditService authAuditService;
    @Mock
    private AuthCompanyPort authCompanyPort;
    @Mock
    private AuthenticationResponseAssembler responseAssembler;

    @InjectMocks
    private TokenRefreshUseCaseImpl tokenRefreshUseCase;

    private AppUser mockUser;
    private AuthorizedDevice mockDevice;
    private AuthSession mockSession;
    @Mock
    private Claims mockClaims;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(tokenRefreshUseCase, "defaultOfflineLeaseHours", 48);

        mockUser = new AppUser();
        mockUser.setId(UUID.randomUUID());
        mockUser.setEmail("test@example.com");
        mockUser.setActive(true);
        mockUser.setCompanyId(UUID.randomUUID());
        mockUser.setRole(UserRole.CAJERO);

        mockDevice = new AuthorizedDevice();
        mockDevice.setId(UUID.randomUUID());
        mockDevice.setDeviceId("device123");
        mockDevice.setAuthorized(true);

        mockSession = new AuthSession();
        mockSession.setId(UUID.randomUUID());
        mockSession.setUser(mockUser);
        mockSession.setDevice(mockDevice);
        mockSession.setRefreshJti("jti123");
        mockSession.setRefreshTokenHash("hashed_token");
        mockSession.setActive(true);
        mockSession.setCompanyId(mockUser.getCompanyId());
    }

    @Test
    void testRefreshFromCookie_ValidToken_RotatesAndReturnsTokens() {
        // Arrange
        when(mockClaims.get("typ", String.class)).thenReturn("refresh");
        when(mockClaims.get("jti", String.class)).thenReturn("jti123");
        when(jwtTokenService.parse("valid_raw_token")).thenReturn(mockClaims);
        when(authSessionRepository.findByRefreshJtiAndActiveTrue("jti123")).thenReturn(Optional.of(mockSession));
        when(passwordHashService.sha256("valid_raw_token")).thenReturn("hashed_token");
        when(authSessionRepository.save(any())).thenAnswer(inv -> {
            AuthSession session = inv.getArgument(0);
            if (session.getId() == null) {
                session.setId(UUID.randomUUID());
            }
            return session;
        });
        when(jwtTokenService.accessTtl()).thenReturn(Duration.ofMinutes(15));
        when(jwtTokenService.refreshTtl()).thenReturn(Duration.ofDays(7));
        when(jwtTokenService.createRefreshToken(any(), any(), any())).thenReturn("new_refresh_token");
        when(jwtTokenService.createAccessToken(any(), any(), any(), any(), any())).thenReturn("new_access_token");

        // Act
        LoginResult result = tokenRefreshUseCase.refreshFromCookie("valid_raw_token");

        // Assert
        assertThat(result.accessToken()).isEqualTo("new_access_token");
        assertThat(result.refreshToken()).isEqualTo("new_refresh_token");
        assertThat(mockSession.isActive()).isFalse(); // old session revoked
        verify(authAuditService).log(eq(AuthAuditAction.REFRESH), eq(mockUser), eq(mockDevice), eq("OK"), any());
    }

    @Test
    void testRefreshFromCookie_InvalidToken_ThrowsUnauthorized() {
        // Arrange
        when(jwtTokenService.parse("invalid")).thenThrow(new RuntimeException("invalid"));

        // Act
        OperationException ex = catchThrowableOfType(() -> tokenRefreshUseCase.refreshFromCookie("invalid"), OperationException.class);

        // Assert
        assertThat(ex).isNotNull();
        assertThat(ex.getStatus().value()).isEqualTo(401);
    }

    @Test
    void testRefreshFromCookie_WrongType_ThrowsUnauthorized() {
        // Arrange
        when(mockClaims.get("typ", String.class)).thenReturn("access");
        when(jwtTokenService.parse("raw")).thenReturn(mockClaims);

        // Act
        OperationException ex = catchThrowableOfType(() -> tokenRefreshUseCase.refreshFromCookie("raw"), OperationException.class);

        // Assert
        assertThat(ex).isNotNull();
        assertThat(ex.getStatus().value()).isEqualTo(401);
    }

    @Test
    void testRefresh_WrongDeviceId_ThrowsUnauthorized() {
        // Arrange
        when(mockClaims.get("typ", String.class)).thenReturn("refresh");
        when(mockClaims.get("jti", String.class)).thenReturn("jti123");
        when(jwtTokenService.parse("raw")).thenReturn(mockClaims);
        when(authSessionRepository.findByRefreshJtiAndActiveTrue("jti123")).thenReturn(Optional.of(mockSession));
        
        RefreshRequest req = new RefreshRequest("different_device");

        // Act
        OperationException ex = catchThrowableOfType(() -> tokenRefreshUseCase.refresh(req, "raw"), OperationException.class);

        // Assert
        assertThat(ex).isNotNull();
        assertThat(ex.getStatus().value()).isEqualTo(401);
    }

    @Test
    void testRefresh_ReplayDetected_RevokesSessionAndThrowsUnauthorized() {
        // Arrange
        when(mockClaims.get("typ", String.class)).thenReturn("refresh");
        when(mockClaims.get("jti", String.class)).thenReturn("jti123");
        when(jwtTokenService.parse("raw")).thenReturn(mockClaims);
        when(authSessionRepository.findByRefreshJtiAndActiveTrue("jti123")).thenReturn(Optional.of(mockSession));
        when(passwordHashService.sha256("raw")).thenReturn("different_hash"); // Hash mismatch = stolen token replay
        
        RefreshRequest req = new RefreshRequest("device123");

        // Act
        OperationException ex = catchThrowableOfType(() -> tokenRefreshUseCase.refresh(req, "raw"), OperationException.class);

        // Assert
        assertThat(ex).isNotNull();
        assertThat(ex.getStatus().value()).isEqualTo(401);
        assertThat(mockSession.isActive()).isFalse(); // Compromised session is revoked
        verify(authSessionRepository).save(mockSession);
    }

    @Test
    void testRefresh_UserInactive_ThrowsForbidden() {
        // Arrange
        mockUser.setActive(false);
        when(mockClaims.get("typ", String.class)).thenReturn("refresh");
        when(mockClaims.get("jti", String.class)).thenReturn("jti123");
        when(jwtTokenService.parse("raw")).thenReturn(mockClaims);
        when(authSessionRepository.findByRefreshJtiAndActiveTrue("jti123")).thenReturn(Optional.of(mockSession));
        when(passwordHashService.sha256("raw")).thenReturn("hashed_token");
        
        RefreshRequest req = new RefreshRequest("device123");

        // Act
        OperationException ex = catchThrowableOfType(() -> tokenRefreshUseCase.refresh(req, "raw"), OperationException.class);

        // Assert
        assertThat(ex).isNotNull();
        assertThat(ex.getStatus().value()).isEqualTo(403);
    }

    @Test
    void testRefresh_DeviceRevoked_ThrowsForbidden() {
        // Arrange
        mockDevice.setAuthorized(false);
        when(mockClaims.get("typ", String.class)).thenReturn("refresh");
        when(mockClaims.get("jti", String.class)).thenReturn("jti123");
        when(jwtTokenService.parse("raw")).thenReturn(mockClaims);
        when(authSessionRepository.findByRefreshJtiAndActiveTrue("jti123")).thenReturn(Optional.of(mockSession));
        when(passwordHashService.sha256("raw")).thenReturn("hashed_token");
        
        RefreshRequest req = new RefreshRequest("device123");

        // Act
        OperationException ex = catchThrowableOfType(() -> tokenRefreshUseCase.refresh(req, "raw"), OperationException.class);

        // Assert
        assertThat(ex).isNotNull();
        assertThat(ex.getStatus().value()).isEqualTo(403);
    }
}
