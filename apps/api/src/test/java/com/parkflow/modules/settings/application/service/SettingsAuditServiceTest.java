package com.parkflow.modules.settings.application.service;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.parkflow.modules.auth.application.service.AuthAuditService;
import com.parkflow.modules.auth.domain.AuthAuditAction;
import com.parkflow.modules.auth.security.AuthPrincipal;
import com.parkflow.modules.auth.security.SecurityUtils;
import com.parkflow.modules.parking.operation.domain.repository.AppUserPort;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.MockedStatic;
import org.mockito.Mockito;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@SuppressWarnings("unchecked")
class SettingsAuditServiceTest {

  private AuthAuditService authAuditService;
  private AppUserPort appUserRepository;
  private SettingsAuditService service;

  @BeforeEach
  void setUp() {
    authAuditService = mock(AuthAuditService.class);
    appUserRepository = mock(AppUserPort.class);
    service = new SettingsAuditService(authAuditService, appUserRepository);
  }

  @Test
  void log_ShouldIncludeContextAndMetadata() {
    UUID userId = UUID.randomUUID();
    when(appUserRepository.findById(userId)).thenReturn(Optional.empty());

    MockHttpServletRequest request = new MockHttpServletRequest();
    request.setRequestURI("/test");
    request.addHeader("X-Forwarded-For", "127.0.0.1, 10.0.0.1");
    request.addHeader("X-Parkflow-Terminal", "TERM1");
    request.addHeader("X-Parkflow-Audit-Reason", "testing");
    RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));

    SecurityContext securityContext = mock(SecurityContext.class);
    Authentication auth = mock(Authentication.class);
    AuthPrincipal principal = new AuthPrincipal(userId, UUID.randomUUID(), "test@test.com", "ADMIN", java.util.List.of());
    when(auth.getPrincipal()).thenReturn(principal);
    when(securityContext.getAuthentication()).thenReturn(auth);
    SecurityContextHolder.setContext(securityContext);

    try (MockedStatic<SecurityUtils> utils = Mockito.mockStatic(SecurityUtils.class)) {
      utils.when(SecurityUtils::requireUserId).thenReturn(userId);

      service.log(AuthAuditAction.LOGIN_SUCCESS, "SUCCESS", Map.of("key", "value"));

      verify(authAuditService).log(eq(AuthAuditAction.LOGIN_SUCCESS), any(), any(), eq("SUCCESS"), any(Map.class));
    } finally {
      RequestContextHolder.resetRequestAttributes();
      SecurityContextHolder.clearContext();
    }
  }
}
