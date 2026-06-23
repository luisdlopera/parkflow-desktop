package com.parkflow.modules.settings;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.parkflow.modules.audit.application.port.out.AuditPort;
import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.auth.domain.UserRole;
import com.parkflow.modules.auth.security.AuthPrincipal;
import com.parkflow.modules.auth.security.PasswordHashService;
import com.parkflow.modules.auth.security.TenantContext;
import com.parkflow.modules.common.dto.ResetPasswordRequest;
import com.parkflow.modules.common.dto.UserCreateRequest;
import com.parkflow.modules.common.dto.UserPatchRequest;
import com.parkflow.modules.common.dto.UserStatusRequest;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.parking.operation.repository.AppUserRepository;
import com.parkflow.modules.settings.application.service.SettingsAuditService;
import com.parkflow.modules.settings.application.service.SettingsUserService;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

@ExtendWith(MockitoExtension.class)
class SettingsUserServiceTest {

  @Mock private AppUserRepository appUserRepository;
  @Mock private PasswordHashService passwordHashService;
  @Mock private SettingsAuditService settingsAuditService;
  @Mock private AuditPort globalAuditService;
  @Mock private ObjectMapper objectMapper;

  private SettingsUserService service;
  private final UUID companyId = UUID.randomUUID();
  private final UUID actorId = UUID.randomUUID();

  @BeforeEach
  void setUp() {
    service = new SettingsUserService(appUserRepository, passwordHashService, settingsAuditService, globalAuditService, objectMapper);
    AuthPrincipal principal = new AuthPrincipal(
            actorId,
            companyId,
            "admin@test.com",
            UserRole.SUPER_ADMIN.name(),
            java.util.List.of(new SimpleGrantedAuthority("usuarios:editar")));
    SecurityContextHolder.getContext()
        .setAuthentication(new UsernamePasswordAuthenticationToken(principal, null, principal.authorities()));
    TenantContext.setTenantId(companyId);
  }

  @AfterEach
  void tearDown() {
    SecurityContextHolder.clearContext();
    TenantContext.clear();
  }

  // --- CREATE ---
  @Test
  void createSuccess() {
    UserCreateRequest req = new UserCreateRequest("A", "new@test.com", "123", "123", UserRole.CAJERO, "S1", "T1", false, "pwd");
    when(appUserRepository.findByEmailIgnoreCaseAndCompanyId(eq("new@test.com"), any())).thenReturn(Optional.empty());
    when(appUserRepository.existsByDocumentIgnoreCaseAndCompanyId(eq("123"), any())).thenReturn(false);
    when(passwordHashService.encodePassword("pwd")).thenReturn("hash");
    when(appUserRepository.save(any(AppUser.class))).thenAnswer(i -> {
      AppUser u = i.getArgument(0);
      u.setId(UUID.randomUUID());
      return u;
    });

    var res = service.create(req);
    assertThat(res.email()).isEqualTo("new@test.com");
    verify(settingsAuditService).log(any(), any(), any());
  }

  @Test
  void createFailsDuplicateEmail() {
    UserCreateRequest req = new UserCreateRequest("A", "a@test.com", null, null, UserRole.CAJERO, null, null, false, "pwd");
    AppUser existing = new AppUser();
    existing.setCompanyId(companyId);
    when(appUserRepository.findByEmailIgnoreCaseAndCompanyId(eq("a@test.com"), any())).thenReturn(Optional.of(existing));

    assertThatThrownBy(() -> service.create(req))
        .isInstanceOf(OperationException.class)
        .hasMessageContaining("correo");
  }

  @Test
  void createFailsDuplicateDocument() {
    UserCreateRequest req = new UserCreateRequest("A", "new@test.com", "123", null, UserRole.CAJERO, null, null, false, "pwd");
    when(appUserRepository.findByEmailIgnoreCaseAndCompanyId(any(), any())).thenReturn(Optional.empty());
    when(appUserRepository.existsByDocumentIgnoreCaseAndCompanyId(eq("123"), any())).thenReturn(true);

    assertThatThrownBy(() -> service.create(req))
        .isInstanceOf(OperationException.class)
        .hasMessageContaining("documento");
  }

  @Test
  void createFailsDataIntegrity() {
    UserCreateRequest req = new UserCreateRequest("A", "new@test.com", null, null, UserRole.CAJERO, null, null, false, "pwd");
    when(appUserRepository.findByEmailIgnoreCaseAndCompanyId(any(), any())).thenReturn(Optional.empty());
    when(appUserRepository.save(any())).thenThrow(new DataIntegrityViolationException(""));

    assertThatThrownBy(() -> service.create(req))
        .isInstanceOf(OperationException.class)
        .hasMessageContaining("Datos duplicados");
  }

  // --- PATCH ---
  @Test
  void patchSuccess() {
    UUID id = UUID.randomUUID();
    AppUser user = new AppUser();
    user.setId(id);
    user.setCompanyId(companyId);
    user.setRole(UserRole.CAJERO);
    when(appUserRepository.findById(id)).thenReturn(Optional.of(user));

    UserPatchRequest req = new UserPatchRequest("New Name", "new@mail.com", "123", "123", UserRole.ADMIN, "S", "T", true);
    when(appUserRepository.findByEmailIgnoreCaseAndCompanyId(any(), any())).thenReturn(Optional.empty());
    when(appUserRepository.existsByDocumentIgnoreCaseAndCompanyIdAndIdNot(any(), any(), any())).thenReturn(false);
    when(appUserRepository.save(any())).thenAnswer(i -> i.getArgument(0));

    var res = service.patch(id, req);
    assertThat(res.name()).isEqualTo("New Name");
    assertThat(res.email()).isEqualTo("new@mail.com");
    assertThat(res.document()).isEqualTo("123");
    assertThat(res.role()).isEqualTo(UserRole.ADMIN);
  }

  @Test
  void patchFailsDuplicateEmail() {
    UUID id = UUID.randomUUID();
    AppUser user = new AppUser();
    user.setId(id);
    user.setCompanyId(companyId);
    user.setRole(UserRole.CAJERO);
    when(appUserRepository.findById(id)).thenReturn(Optional.of(user));

    UserPatchRequest req = new UserPatchRequest("New Name", "new@mail.com", "123", "123", UserRole.ADMIN, "S", "T", true);
    AppUser existing = new AppUser();
    existing.setId(UUID.randomUUID());
    when(appUserRepository.findByEmailIgnoreCaseAndCompanyId(any(), any())).thenReturn(Optional.of(existing));

    assertThatThrownBy(() -> service.patch(id, req))
        .isInstanceOf(OperationException.class)
        .hasMessageContaining("correo");
  }

  @Test
  void patchFailsDuplicateDocument() {
    UUID id = UUID.randomUUID();
    AppUser user = new AppUser();
    user.setId(id);
    user.setCompanyId(companyId);
    user.setRole(UserRole.CAJERO);
    when(appUserRepository.findById(id)).thenReturn(Optional.of(user));

    UserPatchRequest req = new UserPatchRequest("New Name", null, "123", "123", UserRole.ADMIN, "S", "T", true);
    when(appUserRepository.existsByDocumentIgnoreCaseAndCompanyIdAndIdNot(any(), any(), any())).thenReturn(true);

    assertThatThrownBy(() -> service.patch(id, req))
        .isInstanceOf(OperationException.class)
        .hasMessageContaining("documento");
  }

  @Test
  void patchFailsDataIntegrity() {
    UUID id = UUID.randomUUID();
    AppUser user = new AppUser();
    user.setId(id);
    user.setCompanyId(companyId);
    user.setRole(UserRole.CAJERO);
    when(appUserRepository.findById(id)).thenReturn(Optional.of(user));

    UserPatchRequest req = new UserPatchRequest("New Name", null, null, null, null, null, null, null);
    when(appUserRepository.save(any())).thenThrow(new DataIntegrityViolationException(""));

    assertThatThrownBy(() -> service.patch(id, req))
        .isInstanceOf(OperationException.class)
        .hasMessageContaining("Datos duplicados");
  }

  @Test
  void patchCannotDemoteLastSuperAdmin() {
    UUID id = UUID.randomUUID();
    AppUser user = new AppUser();
    user.setId(id);
    user.setCompanyId(companyId);
    user.setRole(UserRole.SUPER_ADMIN);
    user.setActive(true);
    when(appUserRepository.findById(id)).thenReturn(Optional.of(user));
    when(appUserRepository.countByRoleAndCompanyIdAndIsActiveTrue(any(), any())).thenReturn(1L);

    UserPatchRequest req = new UserPatchRequest(null, null, null, null, UserRole.ADMIN, null, null, null);

    assertThatThrownBy(() -> service.patch(id, req))
        .isInstanceOf(OperationException.class)
        .hasMessageContaining("unico super");
  }

  // --- PATCH STATUS ---
  @Test
  void patchStatusSuccess() {
    UUID id = UUID.randomUUID();
    AppUser user = new AppUser();
    user.setId(id);
    user.setCompanyId(companyId);
    user.setRole(UserRole.CAJERO);
    user.setActive(true);
    when(appUserRepository.findById(id)).thenReturn(Optional.of(user));
    when(appUserRepository.save(any())).thenAnswer(i -> i.getArgument(0));

    var res = service.patchStatus(id, new UserStatusRequest(false));
    assertThat(res.active()).isFalse();
  }

  @Test
  void patchStatusCannotInactivateLastSuperAdmin() {
    UUID id = UUID.randomUUID();
    AppUser user = new AppUser();
    user.setId(id);
    user.setCompanyId(companyId);
    user.setRole(UserRole.SUPER_ADMIN);
    user.setActive(true);
    when(appUserRepository.findById(id)).thenReturn(Optional.of(user));
    when(appUserRepository.countByRoleAndCompanyIdAndIsActiveTrue(any(), any())).thenReturn(1L);

    assertThatThrownBy(() -> service.patchStatus(id, new UserStatusRequest(false)))
        .isInstanceOf(OperationException.class)
        .hasMessageContaining("unico super");
  }

  // --- RESET PASSWORD ---
  @Test
  void resetPasswordSuccess() {
    UUID id = UUID.randomUUID();
    AppUser user = new AppUser();
    user.setId(id);
    user.setCompanyId(companyId);
    user.setEmail("test@test.com");
    when(appUserRepository.findById(id)).thenReturn(Optional.of(user));
    when(passwordHashService.encodePassword("newpwd")).thenReturn("hash2");

    service.resetPassword(id, new ResetPasswordRequest("newpwd"));

    verify(appUserRepository).save(user);
    assertThat(user.getPasswordHash()).isEqualTo("hash2");
  }
}
