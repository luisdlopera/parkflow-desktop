package com.parkflow.modules.auth.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.auth.domain.PasswordResetToken;
import com.parkflow.modules.auth.domain.repository.PasswordResetTokenPort;
import com.parkflow.modules.auth.dto.PasswordResetConfirmRequest;
import com.parkflow.modules.auth.dto.PasswordResetRequest;
import com.parkflow.modules.auth.security.PasswordHashService;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.parking.operation.repository.AppUserRepository;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.http.HttpStatus;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class PasswordResetManagementServiceTest {

    @Mock private PasswordResetTokenPort tokenRepository;
    @Mock private AppUserRepository userRepository;
    @Mock private PasswordHashService passwordHashService;
    @Mock private AuthAuditService authAuditService;

    @InjectMocks
    private PasswordResetManagementService service;

    private AppUser activeUser;

    @BeforeEach
    void setUp() {
        activeUser = new AppUser();
        activeUser.setId(UUID.randomUUID());
        activeUser.setEmail("usuario@empresa.co");
        activeUser.setActive(true);

        when(passwordHashService.sha256(anyString())).thenReturn("hashed-token");
        when(passwordHashService.encodePassword(anyString())).thenReturn("encoded-password");
        when(tokenRepository.save(any())).thenAnswer(inv -> {
            PasswordResetToken t = inv.getArgument(0);
            if (t.getId() == null) t.setId(UUID.randomUUID());
            return t;
        });
    }

    @Nested
    class RequestReset {

        @Test
        void generatesTokenForActiveUser() {
            when(userRepository.findGlobalByEmail("usuario@empresa.co")).thenReturn(Optional.of(activeUser));
            when(tokenRepository.countByUserIdAndUsedFalseAndExpiresAtAfter(eq(activeUser.getId()), any())).thenReturn(0L);

            assertThatCode(() -> service.requestReset(new PasswordResetRequest("usuario@empresa.co", null, "127.0.0.1")))
                .doesNotThrowAnyException();

            verify(tokenRepository).save(argThat(t ->
                t.getUserId().equals(activeUser.getId()) &&
                !t.isUsed() &&
                t.getExpiresAt().isAfter(OffsetDateTime.now())));
        }

        @Test
        void silentlyIgnoresNonExistentEmail() {
            when(userRepository.findGlobalByEmail("noexiste@empresa.co")).thenReturn(Optional.empty());

            // Must not throw — security: don't reveal user existence
            assertThatCode(() -> service.requestReset(new PasswordResetRequest("noexiste@empresa.co", null, null)))
                .doesNotThrowAnyException();

            verify(tokenRepository, never()).save(any());
        }

        @Test
        void silentlyIgnoresInactiveUser() {
            activeUser.setActive(false);
            when(userRepository.findGlobalByEmail("usuario@empresa.co")).thenReturn(Optional.of(activeUser));

            assertThatCode(() -> service.requestReset(new PasswordResetRequest("usuario@empresa.co", null, null)))
                .doesNotThrowAnyException();

            verify(tokenRepository, never()).save(any());
        }

        @Test
        void throwsWhenTooManyActiveTokens() {
            when(userRepository.findGlobalByEmail("usuario@empresa.co")).thenReturn(Optional.of(activeUser));
            when(tokenRepository.countByUserIdAndUsedFalseAndExpiresAtAfter(eq(activeUser.getId()), any()))
                .thenReturn(3L); // MAX_ACTIVE_TOKENS_PER_USER = 3

            assertThatThrownBy(() -> service.requestReset(new PasswordResetRequest("usuario@empresa.co", null, null)))
                .isInstanceOf(OperationException.class)
                .hasMessageContaining("Demasiados intentos")
                .satisfies(ex -> assertThat(((OperationException) ex).getStatus()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS));
        }

        @Test
        void logsAuditAfterTokenGenerated() {
            when(userRepository.findGlobalByEmail("usuario@empresa.co")).thenReturn(Optional.of(activeUser));
            when(tokenRepository.countByUserIdAndUsedFalseAndExpiresAtAfter(any(), any())).thenReturn(0L);

            service.requestReset(new PasswordResetRequest("usuario@empresa.co", null, "10.0.0.1"));

            verify(authAuditService).log(
                eq(com.parkflow.modules.auth.domain.AuthAuditAction.PASSWORD_RESET_REQUESTED),
                eq(activeUser), isNull(), eq("OK"), any());
        }
    }

    @Nested
    class ConfirmReset {

        @Test
        void resetsPasswordWithValidToken() {
            PasswordResetToken token = buildToken(false, false);
            when(tokenRepository.findByTokenHash("hashed-token")).thenReturn(Optional.of(token));
            when(userRepository.findById(activeUser.getId())).thenReturn(Optional.of(activeUser));
            when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            assertThatCode(() -> service.confirmReset(
                    new PasswordResetConfirmRequest("plain-token", "NewPass@1234!", null)))
                .doesNotThrowAnyException();

            verify(userRepository).save(argThat(u -> u.getPasswordHash().equals("encoded-password")));
            verify(tokenRepository).save(argThat(t -> t.isUsed() && t.getUsedAt() != null));
        }

        @Test
        void throwsWhenTokenNotFound() {
            when(tokenRepository.findByTokenHash(anyString())).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.confirmReset(
                    new PasswordResetConfirmRequest("fake-token", "NewPass@1234!", null)))
                .isInstanceOf(OperationException.class)
                .hasMessageContaining("invalido o expirado");
        }

        @Test
        void throwsWhenTokenAlreadyUsed() {
            PasswordResetToken token = buildToken(true /* used */, false);
            when(tokenRepository.findByTokenHash("hashed-token")).thenReturn(Optional.of(token));

            assertThatThrownBy(() -> service.confirmReset(
                    new PasswordResetConfirmRequest("plain-token", "NewPass@1234!", null)))
                .isInstanceOf(OperationException.class)
                .hasMessageContaining("ya utilizado");
        }

        @Test
        void throwsWhenTokenExpired() {
            PasswordResetToken token = buildToken(false, true /* expired */);
            when(tokenRepository.findByTokenHash("hashed-token")).thenReturn(Optional.of(token));

            assertThatThrownBy(() -> service.confirmReset(
                    new PasswordResetConfirmRequest("plain-token", "NewPass@1234!", null)))
                .isInstanceOf(OperationException.class)
                .hasMessageContaining("expirado");
        }

        @Test
        void throwsWhenPasswordTooShort() {
            PasswordResetToken token = buildToken(false, false);
            when(tokenRepository.findByTokenHash("hashed-token")).thenReturn(Optional.of(token));

            assertThatThrownBy(() -> service.confirmReset(
                    new PasswordResetConfirmRequest("plain-token", "short", null)))
                .isInstanceOf(OperationException.class)
                .hasMessageContaining("8 caracteres");
        }

        @Test
        void throwsWhenPasswordLacksComplexity() {
            PasswordResetToken token = buildToken(false, false);
            when(tokenRepository.findByTokenHash("hashed-token")).thenReturn(Optional.of(token));

            // Missing special character and uppercase
            assertThatThrownBy(() -> service.confirmReset(
                    new PasswordResetConfirmRequest("plain-token", "password123", null)))
                .isInstanceOf(OperationException.class)
                .hasMessageContaining("mayúscula");
        }

        @Test
        void logsAuditAfterSuccessfulReset() {
            PasswordResetToken token = buildToken(false, false);
            when(tokenRepository.findByTokenHash("hashed-token")).thenReturn(Optional.of(token));
            when(userRepository.findById(activeUser.getId())).thenReturn(Optional.of(activeUser));
            when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            service.confirmReset(new PasswordResetConfirmRequest("plain-token", "NewPass@1234!", null));

            verify(authAuditService).log(
                eq(com.parkflow.modules.auth.domain.AuthAuditAction.PASSWORD_RESET_COMPLETED),
                eq(activeUser), isNull(), eq("OK"), any());
        }
    }

    // -------------------------------------------------------------------------

    private PasswordResetToken buildToken(boolean used, boolean expired) {
        PasswordResetToken t = new PasswordResetToken();
        t.setId(UUID.randomUUID());
        t.setTokenHash("hashed-token");
        t.setUserId(activeUser.getId());
        t.setUsed(used);
        t.setExpiresAt(expired
            ? OffsetDateTime.now().minusHours(2)
            : OffsetDateTime.now().plusMinutes(30));
        return t;
    }

}
