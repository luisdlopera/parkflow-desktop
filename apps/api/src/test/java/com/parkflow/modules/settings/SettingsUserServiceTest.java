package com.parkflow.modules.settings;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import com.parkflow.modules.auth.security.PasswordHashService;
import com.parkflow.modules.auth.security.TenantContext;
import com.parkflow.modules.parking.operation.domain.AppUser;
import com.parkflow.modules.parking.operation.domain.UserRole;
import com.parkflow.modules.parking.operation.exception.OperationException;
import com.parkflow.modules.parking.operation.domain.repository.AppUserPort;
import com.parkflow.modules.settings.dto.UserCreateRequest;
import com.parkflow.modules.settings.dto.UserStatusRequest;
import com.parkflow.modules.settings.application.service.SettingsAuditService;
import com.parkflow.modules.settings.application.service.SettingsUserService;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import com.parkflow.modules.auth.security.AuthPrincipal;

@ExtendWith(MockitoExtension.class)
class SettingsUserServiceTest {

  @Mock private AppUserPort appUserRepository;
  @Mock private PasswordHashService passwordHashService;
  @Mock private SettingsAuditService settingsAuditService;
  @Mock private com.parkflow.modules.audit.service.AuditService globalAuditService;
  @Mock private com.fasterxml.jackson.databind.ObjectMapper objectMapper;

  private UUID companyId;

  private SettingsUserService service;

  @BeforeEach
  void setUp() {
    companyId = UUID.randomUUID();
    service = new SettingsUserService(appUserRepository, passwordHashService, settingsAuditService, globalAuditService, objectMapper);
    UUID actorId = UUID.randomUUID();
    AuthPrincipal principal =
        new AuthPrincipal(
            actorId,
            companyId,
            "admin@test.com",
            UserRole.SUPER_ADMIN.name(),
            java.util.List.of(new SimpleGrantedAuthority("usuarios:editar")));
    SecurityContextHolder.getContext()
        .setAuthentication(new UsernamePasswordAuthenticationToken(principal, null, principal.authorities()));
    TenantContext.setTenantId(companyId);
  }

  @org.junit.jupiter.api.AfterEach
  void tearDown() {
    SecurityContextHolder.clearContext();
    TenantContext.clear();
  }

  @Test
  void createFailsOnDuplicateEmail() {
    AppUser existing = new AppUser();
    existing.setCompanyId(companyId);
    when(appUserRepository.findByEmailIgnoreCaseAndCompanyId(eq("a@test.com"), any()))
        .thenReturn(Optional.of(existing));

    UserCreateRequest req =
        new UserCreateRequest("A", "a@test.com", null, null, UserRole.CAJERO, null, null,
            false, false, false, false, "password123");

    assertThatThrownBy(() -> service.create(req))
        .isInstanceOf(OperationException.class)
        .satisfies(
            ex -> assertThat(((OperationException) ex).getStatus()).isEqualTo(HttpStatus.CONFLICT));
  }

  @Test
  void createEncodesPassword() {
    when(appUserRepository.findByEmailIgnoreCaseAndCompanyId(eq("new@test.com"), any())).thenReturn(Optional.empty());
    when(passwordHashService.encodePassword("password123")).thenReturn("hash");
    when(appUserRepository.save(any(AppUser.class)))
        .thenAnswer(
            inv -> {
              AppUser u = inv.getArgument(0);
              if (u.getId() == null) {
                u.setId(UUID.randomUUID());
              }
              return u;
            });

    UserCreateRequest req =
        new UserCreateRequest(
            "New", "new@test.com", null, null, UserRole.CAJERO, null, null,
            false, false, false, false, "password123");

    service.create(req);
  }

  @Test
  void cannotDeactivateLastActiveSuperAdmin() {
    UUID id = UUID.randomUUID();
    AppUser user = new AppUser();
    user.setId(id);
    user.setCompanyId(companyId);
    user.setRole(UserRole.SUPER_ADMIN);
    user.setActive(true);
    when(appUserRepository.findById(id)).thenReturn(Optional.of(user));
    when(appUserRepository.countByRoleAndCompanyIdAndIsActiveTrue(eq(UserRole.SUPER_ADMIN), any())).thenReturn(1L);

    assertThatThrownBy(() -> service.patchStatus(id, new UserStatusRequest(false)))
        .isInstanceOf(OperationException.class)
        .satisfies(
            ex -> assertThat(((OperationException) ex).getStatus()).isEqualTo(HttpStatus.CONFLICT));
  }
}
