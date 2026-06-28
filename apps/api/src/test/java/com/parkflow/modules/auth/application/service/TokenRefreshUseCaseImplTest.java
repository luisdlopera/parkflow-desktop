package com.parkflow.modules.auth.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.auth.domain.AuthAuditAction;
import com.parkflow.modules.auth.domain.AuthSession;
import com.parkflow.modules.auth.domain.AuthorizedDevice;
import com.parkflow.modules.auth.domain.RefreshTokenFamily;
import com.parkflow.modules.auth.domain.UserRole;
import com.parkflow.modules.auth.domain.repository.AuthCompanyPort;
import com.parkflow.modules.auth.domain.repository.AuthSessionPort;
import com.parkflow.modules.auth.domain.repository.RefreshTokenFamilyPort;
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
    private RefreshTokenFamilyPort refreshTokenFamilyRepository;
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
        lenient().when(passwordHashService.sha256("valid_raw_token")).thenReturn("hashed_token");
        lenient().when(authSessionRepository.save(any())).thenAnswer(inv -> {
            AuthSession session = inv.getArgument(0);
            if (session.getId() == null) {
                session.setId(UUID.randomUUID());
            }
            return session;
        });
        lenient().when(jwtTokenService.accessTtl()).thenReturn(Duration.ofMinutes(15));
        lenient().when(jwtTokenService.refreshTtl()).thenReturn(Duration.ofDays(7));
        lenient().when(jwtTokenService.extractFamilyId(anyString())).thenReturn(null);
        lenient().when(jwtTokenService.extractGeneration(anyString())).thenReturn(1);
        lenient().when(jwtTokenService.createRefreshToken(any(), any(), any())).thenReturn("new_token");
        lenient().when(jwtTokenService.createRefreshToken(any(), any(), any(), any(), anyInt())).thenReturn("new_token");
        lenient().when(jwtTokenService.createAccessToken(any(), any(), any(), any(), any())).thenReturn("new_access");

        // Act
        LoginResult result = tokenRefreshUseCase.refreshFromCookie("valid_raw_token");

        // Assert
        assertThat(result).isNotNull();
        assertThat(result.accessToken()).isNotBlank();
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
        lenient().when(jwtTokenService.extractFamilyId(anyString())).thenReturn(null);
        lenient().when(jwtTokenService.extractGeneration(anyString())).thenReturn(1);

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
        lenient().when(jwtTokenService.extractFamilyId(anyString())).thenReturn(null);
        lenient().when(jwtTokenService.extractGeneration(anyString())).thenReturn(1);

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
        lenient().when(jwtTokenService.extractFamilyId(anyString())).thenReturn(null);
        lenient().when(jwtTokenService.extractGeneration(anyString())).thenReturn(1);

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

    @Test
    void testRefresh_TokenTheftDetected_RevokesFamily() {
        // Arrange: Token with older generation = replayed/stolen token
        UUID familyId = UUID.randomUUID();
        RefreshTokenFamily family = new RefreshTokenFamily();
        family.setFamilyId(familyId);
        family.setGenerationNumber(3); // Current family is at generation 3

        mockSession.setTokenFamilyId(familyId);
        mockSession.setTokenGeneration(1);

        when(mockClaims.get("typ", String.class)).thenReturn("refresh");
        when(mockClaims.get("jti", String.class)).thenReturn("jti123");
        when(jwtTokenService.parse("stolen_token")).thenReturn(mockClaims);
        when(authSessionRepository.findByRefreshJtiAndActiveTrue("jti123")).thenReturn(Optional.of(mockSession));
        when(passwordHashService.sha256("stolen_token")).thenReturn("hashed_token");
        when(jwtTokenService.extractFamilyId("stolen_token")).thenReturn(familyId);
        when(jwtTokenService.extractGeneration("stolen_token")).thenReturn(1); // Old generation = theft
        when(refreshTokenFamilyRepository.findById(familyId)).thenReturn(Optional.of(family));

        RefreshRequest req = new RefreshRequest("device123");

        // Act
        OperationException ex = catchThrowableOfType(() -> tokenRefreshUseCase.refresh(req, "stolen_token"), OperationException.class);

        // Assert
        assertThat(ex).isNotNull();
        assertThat(ex.getStatus().value()).isEqualTo(401);
        assertThat(family.isRevoked()).isTrue(); // Family should be marked as revoked
        assertThat(family.getRevokeReason()).isEqualTo("THEFT_DETECTED");
        verify(refreshTokenFamilyRepository).save(family);
        verify(authAuditService).log(eq(AuthAuditAction.LOGIN_FAILED), eq(mockUser), eq(mockDevice), eq("TOKEN_THEFT_DETECTED"), any());
    }

    @Test
    void testRefresh_TokenFamilyNormal_IncrementsGeneration() {
        // Arrange: Normal refresh with valid generation progression
        UUID familyId = UUID.randomUUID();
        RefreshTokenFamily family = new RefreshTokenFamily();
        family.setFamilyId(familyId);
        family.setGenerationNumber(2);

        mockSession.setTokenFamilyId(familyId);
        mockSession.setTokenGeneration(2);

        when(mockClaims.get("typ", String.class)).thenReturn("refresh");
        when(mockClaims.get("jti", String.class)).thenReturn("jti123");
        when(jwtTokenService.parse("valid_token")).thenReturn(mockClaims);
        when(authSessionRepository.findByRefreshJtiAndActiveTrue("jti123")).thenReturn(Optional.of(mockSession));
        when(passwordHashService.sha256("valid_token")).thenReturn("hashed_token");
        when(jwtTokenService.extractFamilyId("valid_token")).thenReturn(familyId);
        when(jwtTokenService.extractGeneration("valid_token")).thenReturn(2); // Matching generation
        when(refreshTokenFamilyRepository.findById(familyId)).thenReturn(Optional.of(family));
        when(refreshTokenFamilyRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(authSessionRepository.save(any())).thenAnswer(inv -> {
            AuthSession s = inv.getArgument(0);
            if (s.getId() == null) s.setId(UUID.randomUUID());
            return s;
        });
        when(jwtTokenService.accessTtl()).thenReturn(Duration.ofMinutes(15));
        when(jwtTokenService.refreshTtl()).thenReturn(Duration.ofDays(7));
        when(jwtTokenService.createRefreshToken(any(), any(), any(), any(), eq(3))).thenReturn("new_token"); // Generation 3
        when(jwtTokenService.createAccessToken(any(), any(), any(), any(), any())).thenReturn("access_token");

        RefreshRequest req = new RefreshRequest("device123");

        // Act
        LoginResult result = tokenRefreshUseCase.refresh(req, "valid_token");

        // Assert
        assertThat(result).isNotNull();
        assertThat(family.getGenerationNumber()).isEqualTo(3); // Should be incremented
        assertThat(family.isRevoked()).isFalse(); // Should not be revoked for valid refresh
        verify(refreshTokenFamilyRepository).save(family);
    }
}
