package com.parkflow.modules.settings;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.parkflow.modules.auth.security.PasswordHashService;
import com.parkflow.modules.parking.operation.domain.AppUser;
import com.parkflow.modules.parking.operation.domain.UserRole;
import com.parkflow.modules.parking.operation.exception.OperationException;
import com.parkflow.modules.parking.operation.repository.AppUserRepository;
import com.parkflow.modules.settings.dto.UserCreateRequest;
import com.parkflow.modules.settings.dto.UserStatusRequest;
import com.parkflow.modules.settings.service.SettingsAuditService;
import com.parkflow.modules.settings.service.SettingsUserService;
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

  @Mock private AppUserRepository appUserRepository;
  @Mock private PasswordHashService passwordHashService;
  @Mock private SettingsAuditService settingsAuditService;

  private SettingsUserService service;

  @BeforeEach
  void setUp() {
    service = new SettingsUserService(appUserRepository, passwordHashService, settingsAuditService);
    UUID actorId = UUID.randomUUID();
    AuthPrincipal principal =
        new AuthPrincipal(
            actorId,
            "admin@test.com",
            UserRole.SUPER_ADMIN.name(),
            java.util.List.of(new SimpleGrantedAuthority("usuarios:editar")));
    SecurityContextHolder.getContext()
        .setAuthentication(new UsernamePasswordAuthenticationToken(principal, null, principal.authorities()));
  }

  @org.junit.jupiter.api.AfterEach
  void tearDown() {
    SecurityContextHolder.clearContext();
  }

  @Test
  void createFailsOnDuplicateEmail() {
    when(appUserRepository.findByEmailIgnoreCase("a@test.com"))
        .thenReturn(Optional.of(new AppUser()));

    UserCreateRequest req =
        new UserCreateRequest("A", "a@test.com", null, null, UserRole.CAJERO, null, null, "password123");

    assertThatThrownBy(() -> service.create(req))
        .isInstanceOf(OperationException.class)
        .satisfies(
            ex -> assertThat(((OperationException) ex).getStatus()).isEqualTo(HttpStatus.CONFLICT));
  }

  @Test
  void createEncodesPassword() {
    when(appUserRepository.findByEmailIgnoreCase("new@test.com")).thenReturn(Optional.empty());
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
            "New", "new@test.com", null, null, UserRole.CAJERO, null, null, "password123");

    service.create(req);
  }

  @Test
  void cannotDeactivateLastActiveSuperAdmin() {
    UUID id = UUID.randomUUID();
    AppUser user = new AppUser();
    user.setId(id);
    user.setRole(UserRole.SUPER_ADMIN);
    user.setActive(true);
    when(appUserRepository.findById(id)).thenReturn(Optional.of(user));
    when(appUserRepository.countByRoleAndIsActiveTrue(UserRole.SUPER_ADMIN)).thenReturn(1L);

    assertThatThrownBy(() -> service.patchStatus(id, new UserStatusRequest(false)))
        .isInstanceOf(OperationException.class)
        .satisfies(
            ex -> assertThat(((OperationException) ex).getStatus()).isEqualTo(HttpStatus.CONFLICT));
  }
}
