package com.parkflow.modules.auth.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.parkflow.modules.audit.application.port.out.AuditPort;
import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.auth.domain.AuthAuditAction;
import com.parkflow.modules.auth.domain.AuthSession;
import com.parkflow.modules.auth.domain.AuthorizedDevice;
import com.parkflow.modules.auth.domain.RefreshTokenFamily;
import com.parkflow.modules.auth.domain.repository.AppUserPort;
import com.parkflow.modules.auth.domain.repository.AuthSessionPort;
import com.parkflow.modules.auth.domain.repository.AuthorizedDevicePort;
import com.parkflow.modules.auth.domain.repository.RefreshTokenFamilyPort;
import com.parkflow.modules.auth.dto.LogoutRequest;
import com.parkflow.modules.auth.security.JwtTokenService;
import com.parkflow.modules.auth.security.RedisSessionCacheService;
import com.parkflow.modules.common.exception.OperationException;

import java.time.Duration;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class LogoutUseCaseImplTest {

    @Mock
    private AuthSessionPort authSessionRepository;
    @Mock
    private AuthorizedDevicePort authorizedDeviceRepository;
    @Mock
    private AppUserPort appUserRepository;
    @Mock
    private AuthAuditService authAuditService;
    @Mock
    private AuditPort globalAuditService;
    @Mock
    private RedisSessionCacheService redisSessionCacheService;
    @Mock
    private JwtTokenService jwtTokenService;
    @Mock
    private RefreshTokenFamilyPort refreshTokenFamilyPort;

    @InjectMocks
    private LogoutUseCaseImpl logoutUseCase;

    private AuthSession mockSession;
    private AppUser mockUser;
    private AuthorizedDevice mockDevice;
    private RefreshTokenFamily mockFamily;
    private UUID sessionId;
    private UUID familyId;

    @BeforeEach
    void setUp() {
        sessionId = UUID.randomUUID();
        familyId = UUID.randomUUID();

        mockUser = new AppUser();
        mockUser.setId(UUID.randomUUID());

        mockDevice = new AuthorizedDevice();
        mockDevice.setId(UUID.randomUUID());

        mockSession = new AuthSession();
        mockSession.setId(sessionId);
        mockSession.setUser(mockUser);
        mockSession.setDevice(mockDevice);
        mockSession.setActive(true);
        mockSession.setTokenFamilyId(familyId);

        mockFamily = new RefreshTokenFamily();
        mockFamily.setFamilyId(familyId);
        mockFamily.setGenerationNumber(2);
    }

    @Test
    void testLogout_Success_RevokesSessionAndFamily() {
        // Arrange
        LogoutRequest request = new LogoutRequest(sessionId.toString(), "refresh_token");
        when(authSessionRepository.findById(sessionId)).thenReturn(Optional.of(mockSession));
        when(refreshTokenFamilyPort.findById(familyId)).thenReturn(Optional.of(mockFamily));
        when(jwtTokenService.accessTtl()).thenReturn(Duration.ofMinutes(15));

        // Act
        logoutUseCase.logout(request);

        // Assert
        assertThat(mockSession.isActive()).isFalse();
        assertThat(mockSession.getRevokedAt()).isNotNull();
        verify(authSessionRepository).save(mockSession);

        // Verify family revocation
        assertThat(mockFamily.isRevoked()).isTrue();
        assertThat(mockFamily.getRevokeReason()).isEqualTo("USER_LOGOUT");
        verify(refreshTokenFamilyPort).save(mockFamily);

        verify(redisSessionCacheService).addToBlacklist(sessionId, Duration.ofMinutes(15));
        verify(authAuditService).log(eq(AuthAuditAction.LOGOUT), eq(mockUser), eq(mockDevice), eq("OK"), any());
    }

    @Test
    void testLogout_SessionNotFound_ThrowsException() {
        // Arrange
        LogoutRequest request = new LogoutRequest(sessionId.toString(), "refresh_token");
        when(authSessionRepository.findById(sessionId)).thenReturn(Optional.empty());

        // Act
        OperationException ex = catchThrowableOfType(() -> logoutUseCase.logout(request), OperationException.class);

        // Assert
        assertThat(ex).isNotNull();
        assertThat(ex.getStatus().value()).isEqualTo(404);
    }
}
