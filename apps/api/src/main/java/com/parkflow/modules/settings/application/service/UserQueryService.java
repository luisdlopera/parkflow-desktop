package com.parkflow.modules.settings.application.service;

import com.parkflow.modules.auth.security.SecurityUtils;
import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.auth.domain.UserRole;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.parking.operation.infrastructure.persistence.AppUserRepository;
import com.parkflow.modules.common.dto.UserAdminResponse;
import com.parkflow.modules.common.dto.PageResponse;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * User Query - handles retrieval and listing of users.
 * Read-only service for querying user state.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class UserQueryService {
  private final AppUserRepository appUserRepository;

  @Transactional(readOnly = true)
  public PageResponse<UserAdminResponse> list(String q, Boolean active, UserRole role, Pageable pageable) {
    UUID companyId = SecurityUtils.requireCompanyId();
    Page<AppUser> page = appUserRepository.search(q, active, companyId, pageable);
    return PageResponse.of(page.map(this::toResponse));
  }

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

  // ─── helpers ───────────────────────────────────────────────────────────────

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
}
