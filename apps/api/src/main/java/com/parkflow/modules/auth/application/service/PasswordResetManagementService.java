package com.parkflow.modules.auth.application.service;

import com.parkflow.modules.auth.application.port.in.PasswordResetUseCase;
import com.parkflow.modules.auth.dto.PasswordResetConfirmRequest;
import com.parkflow.modules.auth.dto.PasswordResetRequest;
import com.parkflow.modules.auth.domain.AuthAuditAction;
import com.parkflow.modules.auth.domain.PasswordResetToken;
import com.parkflow.modules.auth.domain.repository.PasswordResetTokenPort;
import com.parkflow.modules.auth.security.PasswordHashService;
import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.auth.domain.repository.AppUserPort;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class PasswordResetManagementService implements PasswordResetUseCase {

  private static final int TOKEN_LENGTH = 32;
  private static final int EXPIRY_HOURS = 1;
  private static final int MAX_ACTIVE_TOKENS_PER_USER = 3;
  private static final Pattern PASSWORD_PATTERN = Pattern.compile(
      "^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=!.])(?=\\S+$).{8,}$");

  private final PasswordResetTokenPort passwordResetTokenPort;
  private final AppUserPort userRepository;
  private final PasswordHashService passwordHashService;
  private final AuthAuditService authAuditService;
  private final SecureRandom secureRandom = new SecureRandom();

  @Override
  @Transactional
  public void requestReset(PasswordResetRequest request) {
    String email = request.email().trim().toLowerCase();
    log.info("AUTH: Password reset requested - email={}", maskEmail(email));

    Optional<AppUser> userOpt = userRepository.findGlobalByEmail(email);

    if (userOpt.isEmpty()) {
      log.warn("AUTH: Password reset requested for non-existent user - email={}", maskEmail(email));
      return;
    }

    AppUser user = userOpt.get();

    if (!user.isActive()) {
      log.warn("AUTH: Password reset requested for inactive account - userId={}", user.getId());
      return;
    }

    long activeTokens = passwordResetTokenPort.countByUserIdAndUsedFalseAndExpiresAtAfter(
        user.getId(), OffsetDateTime.now());
    if (activeTokens >= MAX_ACTIVE_TOKENS_PER_USER) {
      log.warn("AUTH: Too many password reset attempts - userId={}", user.getId());
      throw new OperationException(HttpStatus.TOO_MANY_REQUESTS,
          "Demasiados intentos. Por favor espere antes de solicitar un nuevo código.");
    }

    String plainToken = generateSecureToken();
    String tokenHash = passwordHashService.sha256(plainToken);

    PasswordResetToken token = new PasswordResetToken();
    token.setTokenHash(tokenHash);
    token.setUserId(user.getId());
    token.setExpiresAt(OffsetDateTime.now().plusHours(EXPIRY_HOURS));
    token.setIpAddress(request.ipAddress());
    passwordResetTokenPort.save(token);

    log.info("AUTH: Password reset token generated - userId={}, tokenId={}", user.getId(), token.getId());

    if (isDevEnvironment()) {
      log.info("DEV ONLY - Reset token for {}: {}", email, plainToken);
    }

    authAuditService.log(AuthAuditAction.PASSWORD_RESET_REQUESTED, user, null, "OK",
        Map.of("tokenId", token.getId().toString()));
  }

  @Override
  @Transactional
  public void confirmReset(PasswordResetConfirmRequest request) {
    String tokenHash = passwordHashService.sha256(request.token());

    PasswordResetToken token = passwordResetTokenPort.findByTokenHash(tokenHash)
        .orElseThrow(() -> new OperationException(HttpStatus.BAD_REQUEST, "Token invalido o expirado"));

    if (token.isUsed()) {
      log.warn("AUTH: Password reset failed - token already used - tokenId={}", token.getId());
      throw new OperationException(HttpStatus.BAD_REQUEST, "Token ya utilizado");
    }

    if (token.isExpired()) {
      log.warn("AUTH: Password reset failed - token expired - tokenId={}", token.getId());
      throw new OperationException(HttpStatus.BAD_REQUEST, "Token expirado");
    }

    validatePasswordStrength(request.newPassword());

    AppUser user = userRepository.findById(token.getUserId())
        .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));

    user.setPasswordHash(passwordHashService.encodePassword(request.newPassword()));
    user.setPasswordChangedAt(OffsetDateTime.now());
    userRepository.save(user);

    token.setUsed(true);
    token.setUsedAt(OffsetDateTime.now());
    passwordResetTokenPort.save(token);

    log.info("AUTH: Password reset completed - userId={}", user.getId());

    authAuditService.log(AuthAuditAction.PASSWORD_RESET_COMPLETED, user, null, "OK", Map.of());
  }

  private String generateSecureToken() {
    byte[] bytes = new byte[TOKEN_LENGTH];
    secureRandom.nextBytes(bytes);
    return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
  }

  private void validatePasswordStrength(String password) {
    if (password == null || password.length() < 8) {
      throw new OperationException(HttpStatus.BAD_REQUEST,
          "La contraseña debe tener al menos 8 caracteres");
    }

    if (!PASSWORD_PATTERN.matcher(password).matches()) {
      throw new OperationException(HttpStatus.BAD_REQUEST,
          "La contraseña debe contener al menos: una mayúscula, una minúscula, un número y un carácter especial");
    }
  }

  private String maskEmail(String email) {
    if (email == null || email.length() < 3 || !email.contains("@")) {
      return "***";
    }
    String[] parts = email.split("@");
    String local = parts[0];
    String domain = parts[1];
    return local.charAt(0) + "***@" + domain;
  }

  private boolean isDevEnvironment() {
    String profile = System.getProperty("spring.profiles.active", "default");
    return profile.equals("default") || profile.equals("dev");
  }
}
