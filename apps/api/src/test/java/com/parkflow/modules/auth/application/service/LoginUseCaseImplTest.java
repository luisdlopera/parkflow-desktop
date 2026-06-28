package com.parkflow.modules.auth.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.parkflow.modules.audit.application.port.out.AuditPort;
import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.auth.domain.AuthAuditAction;
import com.parkflow.modules.auth.domain.AuthSession;
import com.parkflow.modules.auth.domain.AuthorizedDevice;
import com.parkflow.modules.auth.domain.UserRole;
import com.parkflow.modules.auth.domain.repository.AuthCompanyPort;
import com.parkflow.modules.auth.domain.repository.AuthSessionPort;
import com.parkflow.modules.auth.domain.repository.AuthorizedDevicePort;
import com.parkflow.modules.auth.dto.LoginRequest;
import com.parkflow.modules.auth.dto.LoginResult;
import com.parkflow.modules.auth.security.JwtTokenService;
import com.parkflow.modules.auth.security.PasswordHashService;
import com.parkflow.modules.auth.security.PasswordValidationService;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.auth.domain.repository.AppUserPort;
import com.parkflow.modules.auth.domain.RefreshTokenFamily;
import com.parkflow.modules.auth.domain.repository.RefreshTokenFamilyPort;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
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
class LoginUseCaseImplTest {

    @Mock
    private AppUserPort appUserRepository;
    @Mock
    private AuthorizedDevicePort authorizedDeviceRepository;
    @Mock
    private AuthSessionPort authSessionRepository;
    @Mock
    private JwtTokenService jwtTokenService;
    @Mock
    private PasswordHashService passwordHashService;
    @Mock
    private PasswordValidationService passwordValidationService;
    @Mock
    private RefreshTokenFamilyPort refreshTokenFamilyRepository;
    @Mock
    private AuthAuditService authAuditService;
    @Mock
    private AuditPort globalAuditService;
    @Mock
    private AuthCompanyPort authCompanyPort;
    @Mock
    private AuthenticationResponseAssembler responseAssembler;

    @InjectMocks
    private LoginUseCaseImpl loginUseCase;

    private AppUser mockUser;
    private LoginRequest validRequest;
    private AuthorizedDevice mockDevice;
    private AuthSession mockSession;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(loginUseCase, "defaultOfflineLeaseHours", 48);
        ReflectionTestUtils.setField(loginUseCase, "lockoutMinutes", 30);
        ReflectionTestUtils.setField(loginUseCase, "maxConcurrentSessions", 5);

        // Mock refresh token family repository (lenient because not all tests use it)
        lenient().when(refreshTokenFamilyRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        mockUser = new AppUser();
        mockUser.setId(UUID.randomUUID());
        mockUser.setEmail("test@example.com");
        mockUser.setPasswordHash("hashed_password");
        mockUser.setActive(true);
        mockUser.setBlocked(false);
        mockUser.setCompanyId(UUID.randomUUID());
        mockUser.setRole(UserRole.CAJERO);

        validRequest = new LoginRequest("test@example.com", "password123", "device123", "My Mac", "Mac", "fingerprint", 24);

        mockDevice = new AuthorizedDevice();
        mockDevice.setId(UUID.randomUUID());
        mockDevice.setAuthorized(true);
        mockDevice.setDeviceId("device123");

        mockSession = new AuthSession();
        mockSession.setId(UUID.randomUUID());
    }

    @Test
    void testLoginWithValidCredentials_GeneratesTokens() {
        // Arrange
        when(appUserRepository.findGlobalByEmail("test@example.com")).thenReturn(Optional.of(mockUser));
        when(passwordHashService.matchesPassword("password123", "hashed_password")).thenReturn(true);
        when(authorizedDeviceRepository.findByDeviceId("device123")).thenReturn(Optional.of(mockDevice));
        when(authorizedDeviceRepository.save(any())).thenReturn(mockDevice);
        when(authSessionRepository.save(any())).thenReturn(mockSession);
        when(refreshTokenFamilyRepository.save(any())).thenAnswer(i -> i.getArgument(0));
        when(jwtTokenService.accessTtl()).thenReturn(Duration.ofMinutes(15));
        when(jwtTokenService.refreshTtl()).thenReturn(Duration.ofDays(7));
        when(jwtTokenService.createRefreshToken(any(), any(), any(), any(), anyInt())).thenReturn("refresh_token");
        when(jwtTokenService.createAccessToken(any(), any(), any(), any(), any())).thenReturn("access_token");

        // Act
        LoginResult result = loginUseCase.login(validRequest);

        // Assert
        assertThat(result.accessToken()).isEqualTo("access_token");
        assertThat(result.refreshToken()).isEqualTo("refresh_token");
        verify(appUserRepository).save(mockUser);
        verify(authAuditService).log(eq(AuthAuditAction.LOGIN_SUCCESS), eq(mockUser), eq(mockDevice), eq("OK"), any());
    }

    @Test
    void testLoginWithInvalidEmail_Returns401() {
        // Arrange
        when(appUserRepository.findGlobalByEmail("unknown@example.com")).thenReturn(Optional.empty());
        LoginRequest req = new LoginRequest("unknown@example.com", "password", "device", "My Mac", "Mac", "fp", 24);

        // Act
        OperationException ex = catchThrowableOfType(() -> loginUseCase.login(req), OperationException.class);

        // Assert
        assertThat(ex).isNotNull();
        assertThat(ex.getStatus().value()).isEqualTo(401);
        verify(authAuditService).log(eq(AuthAuditAction.LOGIN_FAILED), eq(null), eq(null), eq("DENY_INVALID_CREDENTIALS"), any());
    }

    @Test
    void testLoginWithWrongPassword_Returns401() {
        // Arrange
        when(appUserRepository.findGlobalByEmail("test@example.com")).thenReturn(Optional.of(mockUser));
        when(passwordHashService.matchesPassword("wrong", "hashed_password")).thenReturn(false);
        LoginRequest req = new LoginRequest("test@example.com", "wrong", "device123", "My Mac", "Mac", "fp", 24);

        // Act
        OperationException ex = catchThrowableOfType(() -> loginUseCase.login(req), OperationException.class);

        // Assert
        assertThat(ex).isNotNull();
        assertThat(ex.getStatus().value()).isEqualTo(401);
        assertThat(mockUser.getFailedLoginAttempts()).isEqualTo(1);
        verify(appUserRepository).save(mockUser);
    }

    @Test
    void testLoginAfter5FailedAttempts_BlocksAccount() {
        // Arrange
        mockUser.setFailedLoginAttempts(4);
        when(appUserRepository.findGlobalByEmail("test@example.com")).thenReturn(Optional.of(mockUser));
        when(passwordHashService.matchesPassword("wrong", "hashed_password")).thenReturn(false);
        LoginRequest req = new LoginRequest("test@example.com", "wrong", "device123", "My Mac", "Mac", "fp", 24);

        // Act
        OperationException ex = catchThrowableOfType(() -> loginUseCase.login(req), OperationException.class);

        // Assert
        assertThat(ex).isNotNull();
        assertThat(ex.getStatus().value()).isEqualTo(401);
        assertThat(mockUser.getFailedLoginAttempts()).isEqualTo(5);
        assertThat(mockUser.isBlocked()).isTrue();
        assertThat(mockUser.getBlockedUntil()).isNotNull();
        verify(appUserRepository).save(mockUser);
    }

    @Test
    void testLoginWithBlockedAccount_Returns403() {
        // Arrange
        mockUser.setBlocked(true);
        mockUser.setBlockedUntil(OffsetDateTime.now().plusMinutes(10));
        when(appUserRepository.findGlobalByEmail("test@example.com")).thenReturn(Optional.of(mockUser));

        // Act
        OperationException ex = catchThrowableOfType(() -> loginUseCase.login(validRequest), OperationException.class);

        // Assert
        assertThat(ex).isNotNull();
        assertThat(ex.getStatus().value()).isEqualTo(403);
        verify(authAuditService).log(eq(AuthAuditAction.LOGIN_FAILED), eq(mockUser), eq(null), eq("DENY_ACCOUNT_BLOCKED"), any());
    }

    @Test
    void testBlockedAccount_AutoUnlocksAfterTimeout() {
        // Arrange
        mockUser.setBlocked(true);
        mockUser.setBlockedUntil(OffsetDateTime.now().minusMinutes(1)); // Already expired
        when(appUserRepository.findGlobalByEmail("test@example.com")).thenReturn(Optional.of(mockUser));
        when(passwordHashService.matchesPassword("password123", "hashed_password")).thenReturn(true);
        when(authorizedDeviceRepository.findByDeviceId("device123")).thenReturn(Optional.of(mockDevice));
        when(authorizedDeviceRepository.save(any())).thenReturn(mockDevice);
        when(authSessionRepository.save(any())).thenReturn(mockSession);
        when(refreshTokenFamilyRepository.save(any())).thenAnswer(i -> i.getArgument(0));
        when(jwtTokenService.accessTtl()).thenReturn(Duration.ofMinutes(15));
        when(jwtTokenService.refreshTtl()).thenReturn(Duration.ofDays(7));
        when(jwtTokenService.createRefreshToken(any(), any(), any(), any(), anyInt())).thenReturn("refresh_token");
        when(jwtTokenService.createAccessToken(any(), any(), any(), any(), any())).thenReturn("access_token");

        // Act
        loginUseCase.login(validRequest);

        // Assert
        assertThat(mockUser.isBlocked()).isFalse();
        assertThat(mockUser.getFailedLoginAttempts()).isEqualTo(0);
        assertThat(mockUser.getBlockedUntil()).isNull();
        // Since we save twice (once for unlock, once for last access), verification is complex, but we know it should unblock
    }

    @Test
    void testLoginWithRevokedDevice_Returns403() {
        // Arrange
        mockDevice.setAuthorized(false); // Revoked
        when(appUserRepository.findGlobalByEmail("test@example.com")).thenReturn(Optional.of(mockUser));
        when(passwordHashService.matchesPassword("password123", "hashed_password")).thenReturn(true);
        when(authorizedDeviceRepository.findByDeviceId("device123")).thenReturn(Optional.of(mockDevice));
        when(authorizedDeviceRepository.save(any())).thenReturn(mockDevice);

        // Act
        OperationException ex = catchThrowableOfType(() -> loginUseCase.login(validRequest), OperationException.class);

        // Assert
        assertThat(ex).isNotNull();
        assertThat(ex.getStatus().value()).isEqualTo(403);
        assertThat(ex.getMessage()).contains("revocado");
        verify(authAuditService).log(eq(AuthAuditAction.LOGIN_FAILED), eq(mockUser), eq(mockDevice), eq("DENY_DEVICE_REVOKED"), any());
    }

    @Test
    void testLoginWithFiveActiveSessions_RevokesOldest() {
        // Arrange: Set max concurrent sessions to 5
        ReflectionTestUtils.setField(loginUseCase, "maxConcurrentSessions", 5);

        // Create 5 active sessions with different creation times
        List<AuthSession> activeSessions = new ArrayList<>();
        for (int i = 0; i < 5; i++) {
            AuthSession session = new AuthSession();
            session.setId(UUID.randomUUID());
            session.setUser(mockUser);
            session.setDevice(mockDevice);
            session.setActive(true);
            session.setCreatedAt(OffsetDateTime.now().minusMinutes(5 - i)); // Oldest first
            activeSessions.add(session);
        }

        when(appUserRepository.findGlobalByEmail("test@example.com")).thenReturn(Optional.of(mockUser));
        when(passwordHashService.matchesPassword("password123", "hashed_password")).thenReturn(true);
        when(authorizedDeviceRepository.findByDeviceId("device123")).thenReturn(Optional.of(mockDevice));
        when(authorizedDeviceRepository.save(any())).thenReturn(mockDevice);
        when(authSessionRepository.findByUserAndActiveTrue(mockUser)).thenReturn(activeSessions);

        // Mock new session creation
        AuthSession newSession = new AuthSession();
        newSession.setId(UUID.randomUUID());
        when(authSessionRepository.save(any())).thenAnswer(invocation -> {
            AuthSession arg = invocation.getArgument(0);
            if (arg.getId() == null) {
                arg.setId(UUID.randomUUID());
            }
            return arg;
        });

        when(jwtTokenService.accessTtl()).thenReturn(Duration.ofMinutes(15));
        when(refreshTokenFamilyRepository.save(any())).thenAnswer(i -> i.getArgument(0));
        when(jwtTokenService.refreshTtl()).thenReturn(Duration.ofDays(7));
        when(jwtTokenService.createRefreshToken(any(), any(), any(), any(), anyInt())).thenReturn("refresh_token");
        when(jwtTokenService.createAccessToken(any(), any(), any(), any(), any())).thenReturn("access_token");

        // Act
        LoginResult result = loginUseCase.login(validRequest);

        // Assert: Oldest session (first one) should be revoked
        AuthSession oldestSession = activeSessions.get(0);
        assertThat(oldestSession.isActive()).isFalse();
        assertThat(oldestSession.getRevokedAt()).isNotNull();

        // Verify audit log for revocation
        verify(authAuditService).log(
            eq(AuthAuditAction.LOGIN_SUCCESS),
            eq(mockUser),
            eq(mockDevice),
            eq("REVOKED_OLDEST_SESSION_FOR_LIMIT"),
            any()
        );
    }

    @Test
    void testLoginWithCommonPassword_RejectsLogin() {
        // Arrange: Common password triggers validation error
        OperationException commonPasswordError = new OperationException(
            org.springframework.http.HttpStatus.BAD_REQUEST,
            "La contraseña elegida es muy común"
        );

        when(appUserRepository.findGlobalByEmail("test@example.com")).thenReturn(Optional.of(mockUser));
        when(passwordHashService.matchesPassword("password123", "hashed_password")).thenReturn(true);
        doThrow(commonPasswordError).when(passwordValidationService).validatePasswordNotCommon("password123");

        // Act
        OperationException ex = catchThrowableOfType(() -> loginUseCase.login(validRequest), OperationException.class);

        // Assert
        assertThat(ex).isNotNull();
        assertThat(ex.getStatus().value()).isEqualTo(400);
        assertThat(ex.getMessage()).contains("muy común");
        verify(passwordValidationService).validatePasswordNotCommon("password123");
    }

    @Test
    void testLoginWithMaxSessionsReached_KeepsNewestSessions() {
        // Given: User has exactly 5 active sessions (at limit)
        List<AuthSession> activeSessions = new ArrayList<>();
        for (int i = 0; i < 5; i++) {
            AuthSession session = new AuthSession();
            session.setId(UUID.randomUUID());
            session.setUser(mockUser);
            session.setDevice(mockDevice);
            session.setActive(true);
            session.setCreatedAt(OffsetDateTime.now().minusHours(5 - i)); // Oldest first
            activeSessions.add(session);
        }

        when(appUserRepository.findGlobalByEmail("test@example.com")).thenReturn(Optional.of(mockUser));
        when(passwordHashService.matchesPassword(anyString(), anyString())).thenReturn(true);
        when(authorizedDeviceRepository.findByDeviceId("device123")).thenReturn(Optional.of(mockDevice));
        when(authorizedDeviceRepository.save(any())).thenReturn(mockDevice);
        when(authSessionRepository.findByUserAndActiveTrue(mockUser)).thenReturn(activeSessions);
        when(authSessionRepository.save(any(AuthSession.class))).thenAnswer(arg -> {
            AuthSession session = arg.getArgument(0);
            if (session.getId() == null) session.setId(UUID.randomUUID());
            return session;
        });
        when(jwtTokenService.accessTtl()).thenReturn(Duration.ofMinutes(15));
        when(jwtTokenService.refreshTtl()).thenReturn(Duration.ofDays(7));
        when(jwtTokenService.createRefreshToken(any(), any(), any(), any(), anyInt())).thenReturn("refresh_token");
        when(jwtTokenService.createAccessToken(any(), any(), any(), any(), any())).thenReturn("access_token");
        when(refreshTokenFamilyRepository.save(any())).thenAnswer(i -> i.getArgument(0));
        when(authCompanyPort.isOnboardingCompleted(any())).thenReturn(true);
        when(responseAssembler.toUser(any(), anyBoolean())).thenReturn(null);
        when(responseAssembler.toSession(any())).thenReturn(null);
        when(responseAssembler.toDevice(any())).thenReturn(null);
        when(responseAssembler.offlineLease(any(), anyInt(), anyInt())).thenReturn(null);

        // Act
        LoginResult result = loginUseCase.login(validRequest);

        // Assert: Oldest session (first) is revoked, 4 others remain
        assertThat(activeSessions.get(0).isActive()).isFalse();
        for (int i = 1; i < 5; i++) {
            assertThat(activeSessions.get(i).isActive()).isTrue();
        }
    }

    @Test
    void testLoginWithZeroActiveSessions_CreatesFirst() {
        // Given: User has no active sessions
        when(appUserRepository.findGlobalByEmail("test@example.com")).thenReturn(Optional.of(mockUser));
        when(passwordHashService.matchesPassword("password123", "hashed_password")).thenReturn(true);
        when(authorizedDeviceRepository.findByDeviceId("device123")).thenReturn(Optional.of(mockDevice));
        when(authorizedDeviceRepository.save(any())).thenReturn(mockDevice);
        when(authSessionRepository.findByUserAndActiveTrue(mockUser)).thenReturn(new ArrayList<>());
        when(authSessionRepository.save(any(AuthSession.class))).thenAnswer(arg -> {
            AuthSession session = arg.getArgument(0);
            if (session.getId() == null) session.setId(UUID.randomUUID());
            return session;
        });
        when(jwtTokenService.accessTtl()).thenReturn(Duration.ofMinutes(15));
        when(jwtTokenService.refreshTtl()).thenReturn(Duration.ofDays(7));
        when(jwtTokenService.createRefreshToken(any(), any(), any(), any(), anyInt())).thenReturn("refresh_token");
        when(jwtTokenService.createAccessToken(any(), any(), any(), any(), any())).thenReturn("access_token");
        when(refreshTokenFamilyRepository.save(any())).thenAnswer(i -> i.getArgument(0));
        when(authCompanyPort.isOnboardingCompleted(any())).thenReturn(true);
        when(responseAssembler.toUser(any(), anyBoolean())).thenReturn(null);
        when(responseAssembler.toSession(any())).thenReturn(null);
        when(responseAssembler.toDevice(any())).thenReturn(null);
        when(responseAssembler.offlineLease(any(), anyInt(), anyInt())).thenReturn(null);

        // Act
        LoginResult result = loginUseCase.login(validRequest);

        // Assert: New session created successfully
        assertThat(result).isNotNull();
        assertThat(result.accessToken()).isNotBlank();
        verify(authSessionRepository, org.mockito.Mockito.times(2)).save(any(AuthSession.class));
    }
}
