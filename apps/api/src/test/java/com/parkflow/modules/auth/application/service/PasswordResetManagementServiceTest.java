package com.parkflow.modules.auth.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.auth.domain.AuthAuditAction;
import com.parkflow.modules.auth.domain.PasswordResetToken;
import com.parkflow.modules.auth.domain.repository.PasswordResetTokenPort;
import com.parkflow.modules.auth.security.PasswordValidationService;
import com.parkflow.modules.auth.dto.PasswordResetConfirmRequest;
import com.parkflow.modules.auth.dto.PasswordResetRequest;
import com.parkflow.modules.auth.security.PasswordHashService;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.auth.domain.repository.AppUserPort;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class PasswordResetManagementServiceTest {

    @Mock
    private PasswordResetTokenPort tokenRepository;
    @Mock
    private AppUserPort userRepository;
    @Mock
    private PasswordHashService passwordHashService;
    @Mock
    private AuthAuditService authAuditService;
    @Mock
    private PasswordValidationService passwordValidationService;

    @InjectMocks
    private PasswordResetManagementService passwordResetService;

    private AppUser mockUser;
    private PasswordResetToken mockToken;

    @BeforeEach
    void setUp() {
        mockUser = new AppUser();
        mockUser.setId(UUID.randomUUID());
        mockUser.setEmail("test@example.com");
        mockUser.setActive(true);

        mockToken = new PasswordResetToken();
        mockToken.setId(UUID.randomUUID());
        mockToken.setUserId(mockUser.getId());
        mockToken.setTokenHash("hashed_token");
        mockToken.setExpiresAt(OffsetDateTime.now().plusHours(1));
        mockToken.setUsed(false);
    }

    @Test
    void testRequestReset_ValidUser_GeneratesToken() {
        // Arrange
        when(userRepository.findGlobalByEmail("test@example.com")).thenReturn(Optional.of(mockUser));
        when(tokenRepository.countByUserIdAndUsedFalseAndExpiresAtAfter(eq(mockUser.getId()), any()))
            .thenReturn(0L);
        when(passwordHashService.sha256(anyString())).thenReturn("hashed_token");
        when(tokenRepository.save(any())).thenAnswer(inv -> {
            PasswordResetToken t = inv.getArgument(0);
            t.setId(UUID.randomUUID());
            return t;
        });

        PasswordResetRequest req = new PasswordResetRequest("test@example.com", "device123", "127.0.0.1");

        // Act
        passwordResetService.requestReset(req);

        // Assert
        verify(tokenRepository).save(any(PasswordResetToken.class));
        verify(authAuditService).log(eq(AuthAuditAction.PASSWORD_RESET_REQUESTED), eq(mockUser), eq(null), eq("OK"), any());
    }

    @Test
    void testRequestReset_UserNotFound_DoesNothing() {
        // Arrange
        when(userRepository.findGlobalByEmail("unknown@example.com")).thenReturn(Optional.empty());
        PasswordResetRequest req = new PasswordResetRequest("unknown@example.com", "device123", "127.0.0.1");

        // Act
        passwordResetService.requestReset(req);

        // Assert
        verify(tokenRepository, never()).save(any());
        verify(authAuditService, never()).log(any(), any(), any(), any(), any());
    }

    @Test
    void testRequestReset_TooManyAttempts_ThrowsException() {
        // Arrange
        when(userRepository.findGlobalByEmail("test@example.com")).thenReturn(Optional.of(mockUser));
        when(tokenRepository.countByUserIdAndUsedFalseAndExpiresAtAfter(eq(mockUser.getId()), any()))
            .thenReturn(3L); // MAX is 3
        PasswordResetRequest req = new PasswordResetRequest("test@example.com", "device123", "127.0.0.1");

        // Act
        OperationException ex = catchThrowableOfType(() -> passwordResetService.requestReset(req), OperationException.class);

        // Assert
        assertThat(ex).isNotNull();
        assertThat(ex.getStatus().value()).isEqualTo(429); // TOO_MANY_REQUESTS
        verify(tokenRepository, never()).save(any());
    }

    @Test
    void testConfirmReset_ValidToken_ChangesPassword() {
        // Arrange
        when(passwordHashService.sha256("plain_token")).thenReturn("hashed_token");
        when(tokenRepository.findByTokenHash("hashed_token")).thenReturn(Optional.of(mockToken));
        when(userRepository.findById(mockUser.getId())).thenReturn(Optional.of(mockUser));
        when(passwordHashService.encodePassword("NewP@ssw0rd")).thenReturn("new_hash");

        PasswordResetConfirmRequest req = new PasswordResetConfirmRequest("plain_token", "NewP@ssw0rd", "device123");

        // Act
        passwordResetService.confirmReset(req);

        // Assert
        verify(userRepository).save(mockUser);
        assertThat(mockUser.getPasswordHash()).isEqualTo("new_hash");
        verify(tokenRepository).save(mockToken);
        assertThat(mockToken.isUsed()).isTrue();
        verify(authAuditService).log(eq(AuthAuditAction.PASSWORD_RESET_COMPLETED), eq(mockUser), eq(null), eq("OK"), any());
    }

    @Test
    void testConfirmReset_InvalidToken_ThrowsException() {
        // Arrange
        when(passwordHashService.sha256("invalid")).thenReturn("invalid_hash");
        when(tokenRepository.findByTokenHash("invalid_hash")).thenReturn(Optional.empty());

        PasswordResetConfirmRequest req = new PasswordResetConfirmRequest("invalid", "NewP@ssw0rd", "device123");

        // Act
        OperationException ex = catchThrowableOfType(() -> passwordResetService.confirmReset(req), OperationException.class);

        // Assert
        assertThat(ex).isNotNull();
        assertThat(ex.getStatus().value()).isEqualTo(400); // BAD_REQUEST
    }

    @Test
    void testConfirmReset_UsedToken_ThrowsException() {
        // Arrange
        mockToken.setUsed(true);
        when(passwordHashService.sha256("plain_token")).thenReturn("hashed_token");
        when(tokenRepository.findByTokenHash("hashed_token")).thenReturn(Optional.of(mockToken));

        PasswordResetConfirmRequest req = new PasswordResetConfirmRequest("plain_token", "NewP@ssw0rd", "device123");

        // Act
        OperationException ex = catchThrowableOfType(() -> passwordResetService.confirmReset(req), OperationException.class);

        // Assert
        assertThat(ex).isNotNull();
        assertThat(ex.getStatus().value()).isEqualTo(400);
        assertThat(ex.getMessage()).contains("utilizado");
    }

    @Test
    void testConfirmReset_ExpiredToken_ThrowsException() {
        // Arrange
        mockToken.setExpiresAt(OffsetDateTime.now().minusHours(1)); // Expired
        when(passwordHashService.sha256("plain_token")).thenReturn("hashed_token");
        when(tokenRepository.findByTokenHash("hashed_token")).thenReturn(Optional.of(mockToken));

        PasswordResetConfirmRequest req = new PasswordResetConfirmRequest("plain_token", "NewP@ssw0rd", "device123");

        // Act
        OperationException ex = catchThrowableOfType(() -> passwordResetService.confirmReset(req), OperationException.class);

        // Assert
        assertThat(ex).isNotNull();
        assertThat(ex.getStatus().value()).isEqualTo(400);
        assertThat(ex.getMessage()).contains("expirado");
    }

    @Test
    void testConfirmReset_WeakPassword_ThrowsException() {
        // Arrange
        when(passwordHashService.sha256("plain_token")).thenReturn("hashed_token");
        when(tokenRepository.findByTokenHash("hashed_token")).thenReturn(Optional.of(mockToken));
        org.mockito.Mockito.doThrow(new OperationException(org.springframework.http.HttpStatus.BAD_REQUEST, "La contraseña debe tener al menos 8 caracteres"))
            .when(passwordValidationService).validatePasswordStrength("weak");

        PasswordResetConfirmRequest req = new PasswordResetConfirmRequest("plain_token", "weak", "device123");

        // Act
        OperationException ex = catchThrowableOfType(() -> passwordResetService.confirmReset(req), OperationException.class);

        // Assert
        assertThat(ex).isNotNull();
        assertThat(ex.getStatus().value()).isEqualTo(400);
        assertThat(ex.getMessage()).contains("8 caracteres");
    }
}
