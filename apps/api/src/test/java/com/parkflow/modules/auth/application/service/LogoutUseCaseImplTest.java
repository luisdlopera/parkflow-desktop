package com.parkflow.modules.auth.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.parkflow.modules.audit.application.port.out.AuditPort;
import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.auth.domain.AuthAuditAction;
import com.parkflow.modules.auth.domain.AuthSession;
import com.parkflow.modules.auth.domain.AuthorizedDevice;
import com.parkflow.modules.auth.domain.repository.AuthSessionPort;
import com.parkflow.modules.auth.domain.repository.AuthorizedDevicePort;
import com.parkflow.modules.auth.dto.LogoutRequest;
import com.parkflow.modules.auth.security.AuthPrincipal;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.parking.operation.infrastructure.persistence.AppUserRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

@ExtendWith(MockitoExtension.class)
class LogoutUseCaseImplTest {

  @Mock
  private AuthSessionPort authSessionRepository;

  @Mock
  private AuthorizedDevicePort authorizedDeviceRepository;

  @Mock
  private AppUserRepository appUserRepository;

  @Mock
  private AuthAuditService authAuditService;

  @Mock
  private AuditPort globalAuditService;

  @InjectMocks
  private LogoutUseCaseImpl service;

  private UUID userId;

  @BeforeEach
  void setUp() {
    userId = UUID.randomUUID();
    SecurityContext securityContext = mock(SecurityContext.class);
    Authentication authentication = mock(Authentication.class);
    AuthPrincipal principal = new AuthPrincipal(userId, UUID.randomUUID(), "test@test.com", "ROLE_USER", List.of());
    org.mockito.Mockito.lenient().when(securityContext.getAuthentication()).thenReturn(authentication);
    org.mockito.Mockito.lenient().when(authentication.getName()).thenReturn(userId.toString());
    org.mockito.Mockito.lenient().when(authentication.getPrincipal()).thenReturn(principal);
    SecurityContextHolder.setContext(securityContext);
  }

  @AfterEach
  void tearDown() {
    SecurityContextHolder.clearContext();
  }

  @Test
  void logout_Success() {
    UUID sessionId = UUID.randomUUID();
    AuthSession session = new AuthSession();
    session.setId(sessionId);
    session.setActive(true);
    AppUser user = new AppUser();
    user.setId(userId);
    session.setUser(user);
    AuthorizedDevice device = new AuthorizedDevice();
    session.setDevice(device);

    when(authSessionRepository.findById(sessionId)).thenReturn(Optional.of(session));

    LogoutRequest req = new LogoutRequest(sessionId.toString(), "rt1");
    service.logout(req);

    assertThat(session.isActive()).isFalse();
    assertThat(session.getRevokedAt()).isNotNull();
    verify(authSessionRepository).save(session);
    verify(authAuditService).log(eq(AuthAuditAction.LOGOUT), eq(user), eq(device), eq("OK"), any());
  }

  @Test
  void logout_NotFound() {
    UUID sessionId = UUID.randomUUID();
    when(authSessionRepository.findById(sessionId)).thenReturn(Optional.empty());

    LogoutRequest req = new LogoutRequest(sessionId.toString(), "rt1");
    assertThatThrownBy(() -> service.logout(req))
        .isInstanceOf(OperationException.class);
  }

  @Test
  void logoutAll_Success() {
    AppUser user = new AppUser();
    user.setId(userId);

    AuthSession session1 = new AuthSession();
    session1.setActive(true);
    AuthSession session2 = new AuthSession();
    session2.setActive(true);

    when(appUserRepository.findById(userId)).thenReturn(Optional.of(user));
    when(authSessionRepository.findByUserAndActiveTrue(user)).thenReturn(List.of(session1, session2));

    service.logoutAll();

    assertThat(session1.isActive()).isFalse();
    assertThat(session2.isActive()).isFalse();
    verify(authSessionRepository).save(session1);
    verify(authSessionRepository).save(session2);
    verify(authAuditService).log(eq(AuthAuditAction.LOGOUT_ALL), eq(user), any(), eq("OK"), any());
  }

  @Test
  void logoutDevice_Success() {
    AppUser user = new AppUser();
    user.setId(userId);

    AuthorizedDevice device = new AuthorizedDevice();
    device.setAuthorized(true);

    AuthSession session1 = new AuthSession();
    session1.setActive(true);

    when(appUserRepository.findById(userId)).thenReturn(Optional.of(user));
    when(authorizedDeviceRepository.findByDeviceId("device123")).thenReturn(Optional.of(device));
    when(authSessionRepository.findByDeviceAndActiveTrue(device)).thenReturn(List.of(session1));

    service.logoutDevice("device123");

    assertThat(session1.isActive()).isFalse();
    assertThat(device.isAuthorized()).isFalse();
    assertThat(device.getRevokedAt()).isNotNull();
    verify(authSessionRepository).save(session1);
    verify(authorizedDeviceRepository).save(device);
  }
}
