package com.parkflow.modules.auth.application.service;

import com.parkflow.modules.auth.application.port.in.ProfileManagementUseCase;
import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.auth.domain.AuthAuditAction;
import com.parkflow.modules.auth.domain.AuthSession;
import com.parkflow.modules.auth.domain.repository.AuthCompanyPort;
import com.parkflow.modules.auth.domain.repository.AuthSessionPort;
import com.parkflow.modules.auth.dto.AuthUserResponse;
import com.parkflow.modules.auth.dto.ChangePasswordRequest;
import com.parkflow.modules.auth.dto.ProfileResponse;
import com.parkflow.modules.auth.dto.UpdateProfileRequest;
import com.parkflow.modules.auth.security.PasswordHashService;
import com.parkflow.modules.auth.security.SecurityUtils;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.parking.operation.repository.AppUserRepository;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProfileManagementUseCaseImpl implements ProfileManagementUseCase {

  private static final Pattern PASSWORD_PATTERN = Pattern.compile(
      "^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=!.])(?=\\S+$).{8,}$");

  private final AppUserRepository appUserRepository;
  private final AuthSessionPort authSessionRepository;
  private final PasswordHashService passwordHashService;
  private final AuthAuditService authAuditService;
  private final AuthCompanyPort authCompanyPort;
  private final AuthenticationResponseAssembler responseAssembler;

  @Override
  @Transactional(readOnly = true)
  public AuthUserResponse me() {
    UUID userId = SecurityUtils.requireUserId();
    AppUser user =
        appUserRepository
            .findById(userId)
            .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));
            
    boolean onboardingCompleted = authCompanyPort.isOnboardingCompleted(user.getCompanyId());
    return responseAssembler.toUser(user, onboardingCompleted);
  }

  @Override
  @Transactional(readOnly = true)
  public ProfileResponse getProfile() {
    return toProfile(requireCurrentUser());
  }

  @Override
  @Transactional
  public ProfileResponse updateProfile(UpdateProfileRequest request) {
    AppUser user = requireCurrentUser();
    UUID userId = user.getId();
    UUID companyId = user.getCompanyId();
    String email = request.email().trim().toLowerCase();

    appUserRepository
        .findByEmailIgnoreCaseAndCompanyId(email, companyId)
        .filter(u -> !u.getId().equals(userId))
        .ifPresent(
            u -> {
              throw new OperationException(HttpStatus.CONFLICT, "Ya existe un usuario con este correo");
            });

    String doc = normalizeDocument(request.document());
    if (doc != null
        && appUserRepository.existsByDocumentIgnoreCaseAndCompanyIdAndIdNot(doc, companyId, userId)) {
      throw new OperationException(HttpStatus.CONFLICT, "Ya existe un usuario con este documento");
    }

    user.setName(request.name().trim());
    user.setEmail(email);
    user.setDocument(doc);
    user.setPhone(trimToNull(request.phone()));
    user.setSite(trimToNull(request.site()));
    user.setTerminal(trimToNull(request.terminal()));
    user.setUpdatedAt(OffsetDateTime.now());

    try {
      user = appUserRepository.save(user);
    } catch (DataIntegrityViolationException ex) {
      throw new OperationException(HttpStatus.CONFLICT, "Datos duplicados (correo o documento)");
    }

    log.info("AUTH: Profile updated - userId={}, email={}", user.getId(), maskEmail(user.getEmail()));
    return toProfile(user);
  }

  @Override
  @Transactional
  public void changePassword(ChangePasswordRequest request) {
    UUID userId = SecurityUtils.requireUserId();
    AppUser user =
        appUserRepository
            .findById(userId)
            .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));

    log.info("AUTH: Password change attempt - userId={}, email={}", user.getId(), maskEmail(user.getEmail()));

    if (!passwordHashService.matchesPassword(request.currentPassword(), user.getPasswordHash())) {
      log.warn("AUTH: Password change failed - current password invalid - userId={}", user.getId());
      throw new OperationException(HttpStatus.UNAUTHORIZED, "Contrasena actual invalida");
    }

    validatePasswordStrength(request.newPassword());

    user.setPasswordHash(passwordHashService.encodePassword(request.newPassword()));
    user.setPasswordChangedAt(OffsetDateTime.now());
    user.setRequirePasswordChange(false);
    appUserRepository.save(user);

    int sessionsRevoked = 0;
    for (AuthSession session : authSessionRepository.findByUserAndActiveTrue(user)) {
      session.setActive(false);
      session.setRevokedAt(OffsetDateTime.now());
      authSessionRepository.save(session);
      sessionsRevoked++;
    }

    log.info("AUTH: Password changed successfully - userId={}, sessionsRevoked={}", user.getId(), sessionsRevoked);
    authAuditService.log(AuthAuditAction.PASSWORD_CHANGED, user, null, "OK",
        Map.of("sessionsRevoked", sessionsRevoked));
  }

  private void validatePasswordStrength(String password) {
    if (password == null || password.length() < 8) {
      throw new OperationException(HttpStatus.BAD_REQUEST,
          "La contraseña debe tener al menos 8 caracteres");
    }

    if (!PASSWORD_PATTERN.matcher(password).matches()) {
      throw new OperationException(HttpStatus.BAD_REQUEST,
          "La contraseña debe contener al menos: una mayúscula, una minúscula, un número y un carácter especial (@#$%^&+=!.))");
    }
  }

  private AppUser requireCurrentUser() {
    UUID userId = SecurityUtils.requireUserId();
    return appUserRepository
        .findById(userId)
        .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));
  }

  private ProfileResponse toProfile(AppUser user) {
    return new ProfileResponse(
        user.getId(),
        user.getName(),
        user.getEmail(),
        user.getDocument(),
        user.getPhone(),
        user.getRole(),
        user.getSite(),
        user.getTerminal(),
        user.isActive(),
        user.isCanVoidTickets(),
        user.isCanReprintTickets(),
        user.isCanCloseCash(),
        user.isRequirePasswordChange(),
        user.getLastAccessAt(),
        user.getPasswordChangedAt(),
        user.getCreatedAt(),
        user.getUpdatedAt());
  }

  private String normalizeDocument(String document) {
    if (!StringUtils.hasText(document)) {
      return null;
    }
    return document.trim();
  }

  private String trimToNull(String value) {
    if (!StringUtils.hasText(value)) {
      return null;
    }
    return value.trim();
  }

  private String maskEmail(String email) {
    if (email == null || email.length() < 3 || !email.contains("@")) {
      return "***";
    }
    String[] parts = email.split("@");
    String local = parts[0];
    String domain = parts[1];

    if (local.length() <= 1) {
      return "***@" + domain;
    }

    return local.charAt(0) + "***@" + domain;
  }
}
