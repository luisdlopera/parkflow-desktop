package com.parkflow.modules.settings.service;

import com.parkflow.modules.auth.entity.AuthAuditAction;
import com.parkflow.modules.auth.security.PasswordHashService;
import com.parkflow.modules.auth.security.SecurityUtils;
import com.parkflow.modules.parking.operation.domain.AppUser;
import com.parkflow.modules.parking.operation.domain.UserRole;
import com.parkflow.modules.parking.operation.exception.OperationException;
import com.parkflow.modules.parking.operation.repository.AppUserRepository;
import com.parkflow.modules.settings.dto.ResetPasswordRequest;
import com.parkflow.modules.settings.dto.SettingsPageResponse;
import com.parkflow.modules.settings.dto.UserAdminResponse;
import com.parkflow.modules.settings.dto.UserCreateRequest;
import com.parkflow.modules.settings.dto.UserPatchRequest;
import com.parkflow.modules.settings.dto.UserStatusRequest;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
public class SettingsUserService {
  private final AppUserRepository appUserRepository;
  private final PasswordHashService passwordHashService;
  private final SettingsAuditService settingsAuditService;

  @Transactional(readOnly = true)
  public SettingsPageResponse<UserAdminResponse> list(String q, Boolean active, Pageable pageable) {
    Page<AppUser> page = appUserRepository.search(q, active, pageable);
    return SettingsPageResponse.of(page.map(this::toResponse));
  }

  @Transactional(readOnly = true)
  public UserAdminResponse get(UUID id) {
    AppUser user =
        appUserRepository
            .findById(id)
            .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));
    return toResponse(user);
  }

  @Transactional
  public UserAdminResponse create(UserCreateRequest req) {
    UserRole actor = SecurityUtils.requireUserRole();
    assertCanAssignRole(actor, req.role());

    String email = req.email().trim().toLowerCase();
    if (appUserRepository.findByEmailIgnoreCase(email).isPresent()) {
      throw new OperationException(HttpStatus.CONFLICT, "Ya existe un usuario con este correo");
    }

    String doc = normalizeDocument(req.document());
    if (doc != null && appUserRepository.existsByDocumentIgnoreCase(doc)) {
      throw new OperationException(HttpStatus.CONFLICT, "Ya existe un usuario con este documento");
    }

    AppUser user = new AppUser();
    user.setName(req.name().trim());
    user.setEmail(email);
    user.setDocument(doc);
    user.setPhone(trimToNull(req.phone()));
    user.setSite(trimToNull(req.site()));
    user.setTerminal(trimToNull(req.terminal()));
    user.setRole(req.role());
    user.setCanVoidTickets(req.canVoidTickets());
    user.setCanReprintTickets(req.canReprintTickets());
    user.setCanCloseCash(req.canCloseCash());
    user.setRequirePasswordChange(req.requirePasswordChange());
    user.setPasswordHash(passwordHashService.encodePassword(req.initialPassword()));
    user.setPasswordChangedAt(OffsetDateTime.now());
    user.setActive(true);
    user.setCreatedAt(OffsetDateTime.now());
    user.setUpdatedAt(OffsetDateTime.now());
    try {
      user = appUserRepository.save(user);
    } catch (DataIntegrityViolationException ex) {
      throw new OperationException(HttpStatus.CONFLICT, "Datos duplicados (correo o documento)");
    }

    settingsAuditService.log(
        AuthAuditAction.SETTINGS_USER_CREATE,
        "OK",
        Map.of("userId", user.getId().toString(), "email", user.getEmail(), "role", user.getRole().name()));

    return toResponse(user);
  }

  @Transactional
  public UserAdminResponse patch(UUID id, UserPatchRequest req) {
    UserRole actor = SecurityUtils.requireUserRole();
    AppUser user =
        appUserRepository
            .findById(id)
            .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));

    if (req.role() != null) {
      assertCanAssignRole(actor, req.role());
      assertNotDemoteLastSuperAdmin(user, req.role());
    }

    Map<String, Object> before = snapshot(user);

    if (StringUtils.hasText(req.name())) {
      user.setName(req.name().trim());
    }
    if (StringUtils.hasText(req.email())) {
      String email = req.email().trim().toLowerCase();
      appUserRepository
          .findByEmailIgnoreCase(email)
          .filter(u -> !u.getId().equals(id))
          .ifPresent(
              u -> {
                throw new OperationException(HttpStatus.CONFLICT, "Ya existe un usuario con este correo");
              });
      user.setEmail(email);
    }
    if (req.document() != null) {
      String doc = normalizeDocument(req.document());
      if (doc != null && appUserRepository.existsByDocumentIgnoreCaseAndIdNot(doc, id)) {
        throw new OperationException(HttpStatus.CONFLICT, "Ya existe un usuario con este documento");
      }
      user.setDocument(doc);
    }
    if (req.phone() != null) {
      user.setPhone(trimToNull(req.phone()));
    }
    if (req.site() != null) {
      user.setSite(trimToNull(req.site()));
    }
    if (req.terminal() != null) {
      user.setTerminal(trimToNull(req.terminal()));
    }
    if (req.role() != null) {
      user.setRole(req.role());
    }
    if (req.canVoidTickets() != null) {
      user.setCanVoidTickets(req.canVoidTickets());
    }
    if (req.canReprintTickets() != null) {
      user.setCanReprintTickets(req.canReprintTickets());
    }
    if (req.canCloseCash() != null) {
      user.setCanCloseCash(req.canCloseCash());
    }
    if (req.requirePasswordChange() != null) {
      user.setRequirePasswordChange(req.requirePasswordChange());
    }
    user.setUpdatedAt(OffsetDateTime.now());

    try {
      user = appUserRepository.save(user);
    } catch (DataIntegrityViolationException ex) {
      throw new OperationException(HttpStatus.CONFLICT, "Datos duplicados (correo o documento)");
    }

    settingsAuditService.log(
        AuthAuditAction.SETTINGS_USER_UPDATE,
        "OK",
        Map.of("userId", id.toString(), "before", before, "after", snapshot(user)));

    return toResponse(user);
  }

  private void assertNotDemoteLastSuperAdmin(AppUser user, UserRole newRole) {
    if (user.getRole() == UserRole.SUPER_ADMIN && newRole != UserRole.SUPER_ADMIN) {
      long activeSupers = appUserRepository.countByRoleAndIsActiveTrue(UserRole.SUPER_ADMIN);
      if (user.isActive() && activeSupers <= 1) {
        throw new OperationException(
            HttpStatus.CONFLICT, "No puede cambiar el rol del unico super administrador activo");
      }
    }
  }

  @Transactional
  public UserAdminResponse patchStatus(UUID id, UserStatusRequest req) {
    AppUser user =
        appUserRepository
            .findById(id)
            .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));

    if (!req.active() && user.getRole() == UserRole.SUPER_ADMIN && user.isActive()) {
      long c = appUserRepository.countByRoleAndIsActiveTrue(UserRole.SUPER_ADMIN);
      if (c <= 1) {
        throw new OperationException(
            HttpStatus.CONFLICT, "No puede inactivar el unico super administrador");
      }
    }

    boolean prev = user.isActive();
    user.setActive(req.active());
    user.setUpdatedAt(OffsetDateTime.now());
    user = appUserRepository.save(user);

    settingsAuditService.log(
        AuthAuditAction.SETTINGS_USER_STATUS,
        "OK",
        Map.of("userId", id.toString(), "previousActive", prev, "active", user.isActive()));

    return toResponse(user);
  }

  @Transactional
  public void resetPassword(UUID id, ResetPasswordRequest req) {
    AppUser user =
        appUserRepository
            .findById(id)
            .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));
    user.setPasswordHash(passwordHashService.encodePassword(req.newPassword()));
    user.setPasswordChangedAt(OffsetDateTime.now());
    user.setUpdatedAt(OffsetDateTime.now());
    appUserRepository.save(user);
    settingsAuditService.log(
        AuthAuditAction.SETTINGS_USER_PASSWORD_RESET,
        "OK",
        Map.of("userId", id.toString(), "email", user.getEmail()));
  }

  private void assertCanAssignRole(UserRole actor, UserRole target) {
    if (target == UserRole.SUPER_ADMIN && actor != UserRole.SUPER_ADMIN) {
      throw new OperationException(HttpStatus.FORBIDDEN, "Solo un super administrador puede asignar ese rol");
    }
  }

  private UserAdminResponse toResponse(AppUser u) {
    return new UserAdminResponse(
        u.getId(),
        u.getName(),
        u.getEmail(),
        u.getDocument(),
        u.getPhone(),
        u.getRole(),
        u.getSite(),
        u.getTerminal(),
        u.isActive(),
        u.isCanVoidTickets(),
        u.isCanReprintTickets(),
        u.isCanCloseCash(),
        u.isRequirePasswordChange(),
        u.getLastAccessAt(),
        u.getCreatedAt(),
        u.getUpdatedAt());
  }

  private Map<String, Object> snapshot(AppUser u) {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("name", u.getName());
    m.put("email", u.getEmail());
    m.put("role", u.getRole().name());
    m.put("active", u.isActive());
    m.put("site", u.getSite());
    m.put("terminal", u.getTerminal());
    m.put("document", u.getDocument());
    return m;
  }

  private String normalizeDocument(String document) {
    if (!StringUtils.hasText(document)) {
      return null;
    }
    return document.trim();
  }

  private String trimToNull(String s) {
    if (!StringUtils.hasText(s)) {
      return null;
    }
    return s.trim();
  }
}
