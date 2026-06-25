package com.parkflow.modules.auth.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
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
import com.parkflow.modules.auth.dto.PasswordResetConfirmRequest;
import com.parkflow.modules.auth.dto.PasswordResetRequest;
import com.parkflow.modules.auth.security.PasswordHashService;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.parking.operation.infrastructure.persistence.AppUserRepository;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;
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
  private AppUserRepository userRepository;

  @Mock
  private PasswordHashService passwordHashService;

  @Mock
  private AuthAuditService authAuditService;

  @InjectMocks
  private PasswordResetManagementService service;

  @Test
  void requestReset_Success() {
    AppUser user = new AppUser();
    user.setId(UUID.randomUUID());
    user.setEmail("test@test.com");
    user.setActive(true);

    when(userRepository.findGlobalByEmail("test@test.com")).thenReturn(Optional.of(user));
    when(tokenRepository.countByUserIdAndUsedFalseAndExpiresAtAfter(eq(user.getId()), any()))
        .thenReturn(0L);
    when(passwordHashService.sha256(anyString())).thenReturn("hashed-token");
    when(tokenRepository.save(any())).thenAnswer(i -> {
      PasswordResetToken t = i.getArgument(0);
      t.setId(UUID.randomUUID());
      return t;
    });

    PasswordResetRequest request = new PasswordResetRequest("test@test.com", "dev1", "127.0.0.1");
    service.requestReset(request);

    verify(tokenRepository).save(any(PasswordResetToken.class));
    verify(authAuditService).log(eq(AuthAuditAction.PASSWORD_RESET_REQUESTED), eq(user), any(), anyString(), any());
  }

  @Test
  void requestReset_UserNotFound() {
    when(userRepository.findGlobalByEmail("unknown@test.com")).thenReturn(Optional.empty());

    PasswordResetRequest request = new PasswordResetRequest("unknown@test.com", "dev1", "127.0.0.1");
    service.requestReset(request);

    verify(tokenRepository, never()).save(any());
  }

  @Test
  void requestReset_UserInactive() {
    AppUser user = new AppUser();
    user.setActive(false);
    when(userRepository.findGlobalByEmail("test@test.com")).thenReturn(Optional.of(user));

    PasswordResetRequest request = new PasswordResetRequest("test@test.com", "dev1", "127.0.0.1");
    service.requestReset(request);

    verify(tokenRepository, never()).save(any());
  }

  @Test
  void requestReset_TooManyTokens() {
    AppUser user = new AppUser();
    user.setId(UUID.randomUUID());
    user.setActive(true);
    when(userRepository.findGlobalByEmail("test@test.com")).thenReturn(Optional.of(user));
    when(tokenRepository.countByUserIdAndUsedFalseAndExpiresAtAfter(eq(user.getId()), any()))
        .thenReturn(3L);

    PasswordResetRequest request = new PasswordResetRequest("test@test.com", "dev1", "127.0.0.1");
    
    assertThatThrownBy(() -> service.requestReset(request))
        .isInstanceOf(OperationException.class)
        .hasMessageContaining("Demasiados intentos");
  }

  @Test
  void confirmReset_Success() {
    PasswordResetToken token = new PasswordResetToken();
    token.setId(UUID.randomUUID());
    token.setUserId(UUID.randomUUID());
    token.setUsed(false);
    token.setExpiresAt(OffsetDateTime.now().plusHours(1));

    AppUser user = new AppUser();
    user.setId(token.getUserId());

    when(passwordHashService.sha256("my-plain-token")).thenReturn("hashed-token");
    when(tokenRepository.findByTokenHash("hashed-token")).thenReturn(Optional.of(token));
    when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
    when(passwordHashService.encodePassword(anyString())).thenReturn("new-hashed-password");

    PasswordResetConfirmRequest request = new PasswordResetConfirmRequest("my-plain-token", "Valid1Password!", "dev1");
    service.confirmReset(request);

    verify(userRepository).save(user);
    verify(tokenRepository).save(token);
    verify(authAuditService).log(eq(AuthAuditAction.PASSWORD_RESET_COMPLETED), eq(user), any(), anyString(), any());
    
    assertThat(user.getPasswordHash()).isEqualTo("new-hashed-password");
    assertThat(token.isUsed()).isTrue();
  }

  @Test
  void confirmReset_TokenNotFound() {
    when(passwordHashService.sha256("my-plain-token")).thenReturn("hashed-token");
    when(tokenRepository.findByTokenHash("hashed-token")).thenReturn(Optional.empty());

    PasswordResetConfirmRequest request = new PasswordResetConfirmRequest("my-plain-token", "Valid1Password!", "dev1");
    
    assertThatThrownBy(() -> service.confirmReset(request))
        .isInstanceOf(OperationException.class)
        .hasMessageContaining("Token invalido");
  }

  @Test
  void confirmReset_TokenUsed() {
    PasswordResetToken token = new PasswordResetToken();
    token.setUsed(true);

    when(passwordHashService.sha256("my-plain-token")).thenReturn("hashed-token");
    when(tokenRepository.findByTokenHash("hashed-token")).thenReturn(Optional.of(token));

    PasswordResetConfirmRequest request = new PasswordResetConfirmRequest("my-plain-token", "Valid1Password!", "dev1");
    
    assertThatThrownBy(() -> service.confirmReset(request))
        .isInstanceOf(OperationException.class)
        .hasMessageContaining("Token ya utilizado");
  }

  @Test
  void confirmReset_TokenExpired() {
    PasswordResetToken token = new PasswordResetToken();
    token.setUsed(false);
    token.setExpiresAt(OffsetDateTime.now().minusHours(1));

    when(passwordHashService.sha256("my-plain-token")).thenReturn("hashed-token");
    when(tokenRepository.findByTokenHash("hashed-token")).thenReturn(Optional.of(token));

    PasswordResetConfirmRequest request = new PasswordResetConfirmRequest("my-plain-token", "Valid1Password!", "dev1");
    
    assertThatThrownBy(() -> service.confirmReset(request))
        .isInstanceOf(OperationException.class)
        .hasMessageContaining("Token expirado");
  }

  @Test
  void confirmReset_WeakPassword() {
    PasswordResetToken token = new PasswordResetToken();
    token.setUsed(false);
    token.setExpiresAt(OffsetDateTime.now().plusHours(1));

    when(passwordHashService.sha256("my-plain-token")).thenReturn("hashed-token");
    when(tokenRepository.findByTokenHash("hashed-token")).thenReturn(Optional.of(token));

    PasswordResetConfirmRequest request = new PasswordResetConfirmRequest("my-plain-token", "weak", "dev1");
    
    assertThatThrownBy(() -> service.confirmReset(request))
        .isInstanceOf(OperationException.class)
        .hasMessageContaining("La contraseña debe tener al menos");
  }

  @Test
  void confirmReset_WeakPasswordMissingSpecialChar() {
    PasswordResetToken token = new PasswordResetToken();
    token.setUsed(false);
    token.setExpiresAt(OffsetDateTime.now().plusHours(1));

    when(passwordHashService.sha256("my-plain-token")).thenReturn("hashed-token");
    when(tokenRepository.findByTokenHash("hashed-token")).thenReturn(Optional.of(token));

    PasswordResetConfirmRequest request = new PasswordResetConfirmRequest("my-plain-token", "ValidPassword1", "dev1");
    
    assertThatThrownBy(() -> service.confirmReset(request))
        .isInstanceOf(OperationException.class)
        .hasMessageContaining("La contraseña debe contener al menos");
  }

  @Test
  void confirmReset_UserNotFound() {
    PasswordResetToken token = new PasswordResetToken();
    token.setUserId(UUID.randomUUID());
    token.setUsed(false);
    token.setExpiresAt(OffsetDateTime.now().plusHours(1));

    when(passwordHashService.sha256("my-plain-token")).thenReturn("hashed-token");
    when(tokenRepository.findByTokenHash("hashed-token")).thenReturn(Optional.of(token));
    when(userRepository.findById(token.getUserId())).thenReturn(Optional.empty());

    PasswordResetConfirmRequest request = new PasswordResetConfirmRequest("my-plain-token", "Valid1Password!", "dev1");
    
    assertThatThrownBy(() -> service.confirmReset(request))
        .isInstanceOf(OperationException.class)
        .hasMessageContaining("Usuario no encontrado");
  }
}
