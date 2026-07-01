package com.parkflow.modules.settings.application.service;

import com.parkflow.modules.auth.domain.AuthAuditAction;
import com.parkflow.modules.auth.security.PasswordHashService;
import com.parkflow.modules.auth.security.SecurityUtils;
import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.auth.domain.UserRole;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.parking.operation.infrastructure.persistence.AppUserRepository;
import com.parkflow.modules.settings.application.port.in.UserManagementUseCase;
import com.parkflow.modules.common.dto.*;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/**
 * @deprecated Use {@link UserManagementService} and {@link UserQueryService} instead.
 *             This facade is maintained for backward compatibility.
 */
@Deprecated(since = "2.1", forRemoval = false)
@Service
@RequiredArgsConstructor
@Slf4j
public class SettingsUserService implements UserManagementUseCase {
  private final AppUserRepository appUserRepository;
  private final PasswordHashService passwordHashService;
  private final SettingsAuditService settingsAuditService;
  private final com.parkflow.modules.audit.application.port.out.AuditPort globalAuditService;
  private final com.fasterxml.jackson.databind.ObjectMapper objectMapper;

  @Override
  @Transactional(readOnly = true)
  public PageResponse<UserAdminResponse> list(String q, Boolean active, UserRole role, Pageable pageable) {
    UUID companyId = SecurityUtils.requireCompanyId();
    Page<AppUser> page = appUserRepository.search(q, active, companyId, pageable);
    return PageResponse.of(page.map(this::toResponse));
  }

  @Override
  @Transactional(readOnly = true)
  public UserAdminResponse get(UUID id) {
    UUID companyId = SecurityUtils.requireCompanyId();
    AppUser user =
        appUserRepository
            .findById(id)
            .filter(u -> u.getCompanyId().equals(companyId))
            .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));
    return toResponse(user);
  }

  @Override
  @Transactional
  public UserAdminResponse create(UserCreateRequest req) {
    UserRole actor = SecurityUtils.requireUserRole();
    assertCanAssignRole(actor, req.role());

    String email = req.email().trim().toLowerCase();
    if (appUserRepository.findByEmailIgnoreCaseAndCompanyId(email, SecurityUtils.requireCompanyId()).isPresent()) {
      throw new OperationException(HttpStatus.CONFLICT, "Ya existe un usuario con este correo");
    }

    String doc = normalizeDocument(req.document());
    if (doc != null && appUserRepository.existsByDocumentIgnoreCaseAndCompanyId(doc, SecurityUtils.requireCompanyId())) {
      throw new OperationException(HttpStatus.CONFLICT, "Ya existe un usuario con este documento");
    }

    AppUser user = new AppUser();
    user.setCompanyId(SecurityUtils.requireCompanyId());
    user.setName(req.name().trim());
    user.setEmail(email);
    user.setDocument(doc);
    user.setPhone(trimToNull(req.phone()));
    user.setRole(req.role());
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

    try {
        globalAuditService.record(
            com.parkflow.modules.audit.domain.AuditAction.CREAR,
            null,
            objectMapper.writeValueAsString(req),
            "User created: " + user.getId());
    } catch (Exception e) {
        // ignore serialization errors for audit
    }

    return toResponse(user);
  }

  @Override
  @Transactional
  public UserAdminResponse patch(UUID id, UserPatchRequest req) {
    UserRole actor = SecurityUtils.requireUserRole();
    UUID companyId = SecurityUtils.requireCompanyId();
    AppUser user =
        appUserRepository
            .findById(id)
            .filter(u -> u.getCompanyId().equals(companyId))
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
          .findByEmailIgnoreCaseAndCompanyId(email, companyId)
          .filter(u -> !u.getId().equals(id))
          .ifPresent(
              u -> {
                throw new OperationException(HttpStatus.CONFLICT, "Ya existe un usuario con este correo");
              });
      user.setEmail(email);
    }
    if (req.document() != null) {
      String doc = normalizeDocument(req.document());
      if (doc != null && appUserRepository.existsByDocumentIgnoreCaseAndCompanyIdAndIdNot(doc, companyId, id)) {
        throw new OperationException(HttpStatus.CONFLICT, "Ya existe un usuario con este documento");
      }
      user.setDocument(doc);
    }
    if (req.phone() != null) {
      user.setPhone(trimToNull(req.phone()));
    }
    if (req.role() != null) {
      user.setRole(req.role());
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

    try {
        globalAuditService.record(
            com.parkflow.modules.audit.domain.AuditAction.EDITAR,
            objectMapper.writeValueAsString(before),
            objectMapper.writeValueAsString(snapshot(user)));
    } catch (Exception e) {
        // ignore
    }

    return toResponse(user);
  }

  private void assertNotDemoteLastSuperAdmin(AppUser user, UserRole newRole) {
    if (user.getRole() == UserRole.SUPER_ADMIN && newRole != UserRole.SUPER_ADMIN) {
      long activeSupers = appUserRepository.countByRoleAndCompanyIdAndIsActiveTrue(UserRole.SUPER_ADMIN, user.getCompanyId());
      if (user.isActive() && activeSupers <= 1) {
        throw new OperationException(
            HttpStatus.CONFLICT, "No puede cambiar el rol del unico super administrador activo");
      }
    }
  }

  @Transactional
  public UserAdminResponse patchStatus(UUID id, UserStatusRequest req) {
    UUID companyId = SecurityUtils.requireCompanyId();
    AppUser user =
        appUserRepository
            .findById(id)
            .filter(u -> u.getCompanyId().equals(companyId))
            .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));

    if (!req.active() && user.getRole() == UserRole.SUPER_ADMIN && user.isActive()) {
      long c = appUserRepository.countByRoleAndCompanyIdAndIsActiveTrue(UserRole.SUPER_ADMIN, companyId);
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

    globalAuditService.record(
        com.parkflow.modules.audit.domain.AuditAction.ELIMINAR,
        "active=" + prev,
        "active=" + user.isActive(),
        "User status changed: " + id);

    return toResponse(user);
  }

  @Override
  @Transactional
  public void resetPassword(UUID id, ResetPasswordRequest req) {
    UUID companyId = SecurityUtils.requireCompanyId();
    AppUser user =
        appUserRepository
            .findById(id)
            .filter(u -> u.getCompanyId().equals(companyId))
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
        null,
        null,
        u.isActive(),
        u.isBlocked(),
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
