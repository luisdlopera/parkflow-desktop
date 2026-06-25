package com.parkflow.modules.audit.application.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.parkflow.modules.audit.domain.AuditAction;
import com.parkflow.modules.audit.domain.AuditLog;
import com.parkflow.modules.audit.repository.AuditLogRepository;
import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.auth.security.TenantContext;
import jakarta.servlet.http.HttpServletRequest;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@ExtendWith(MockitoExtension.class)
@DisplayName("AuditService Unit Tests")
class AuditServiceTest {

  @Mock private AuditLogRepository auditLogRepository;
  
  @InjectMocks private AuditService auditService;

  @Captor private ArgumentCaptor<AuditLog> logCaptor;

  @BeforeEach
  void setUp() {
    SecurityContextHolder.clearContext();
  }

  @AfterEach
  void tearDown() {
    SecurityContextHolder.clearContext();
    RequestContextHolder.resetRequestAttributes();
    TenantContext.clear();
  }

  @Test
  void record_ShouldSaveCompleteAuditLog_WhenGivenAllData() {
    UUID companyId = UUID.randomUUID();
    AppUser user = new AppUser();
    user.setEmail("test@test.com");
    user.setCompanyId(companyId);

    HttpServletRequest request = mock(HttpServletRequest.class);
    when(request.getHeader("X-Forwarded-For")).thenReturn("192.168.1.1");
    when(request.getHeader("User-Agent")).thenReturn("Mozilla");
    
    ServletRequestAttributes attrs = mock(ServletRequestAttributes.class);
    when(attrs.getRequest()).thenReturn(request);
    RequestContextHolder.setRequestAttributes(attrs);

    auditService.record(AuditAction.REINICIAR_ONBOARDING, companyId, user, "old", "new", "meta");

    verify(auditLogRepository).save(logCaptor.capture());
    AuditLog saved = logCaptor.getValue();
    
    assertEquals(AuditAction.REINICIAR_ONBOARDING, saved.getAction());
    assertEquals(companyId, saved.getCompanyId());
    assertEquals("test@test.com", saved.getUsername());
    assertEquals("192.168.1.1", saved.getIpAddress());
    assertEquals("Mozilla", saved.getDevice());
    assertEquals("old", saved.getPreviousPayload());
    assertEquals("new", saved.getNewPayload());
    assertEquals("meta", saved.getMetadata());
    assertNotNull(saved.getCreatedAt());
  }

  @Test
  void record_ShouldExtractUserFromSecurityContext_WhenUserIsNull() {
    AppUser user = new AppUser();
    user.setEmail("context@test.com");
    user.setCompanyId(UUID.randomUUID());

    Authentication auth = mock(Authentication.class);
    when(auth.getPrincipal()).thenReturn(user);
    SecurityContext context = mock(SecurityContext.class);
    when(context.getAuthentication()).thenReturn(auth);
    SecurityContextHolder.setContext(context);

    auditService.record(AuditAction.CREAR, null, null, null);

    verify(auditLogRepository).save(logCaptor.capture());
    AuditLog saved = logCaptor.getValue();
    
    assertEquals("context@test.com", saved.getUsername());
    assertEquals(user.getCompanyId(), saved.getCompanyId());
  }

  @Test
  void record_ShouldFallbackToSystem_WhenNoAuthAvailable() {
    auditService.record(AuditAction.CREAR, null, null, null);

    verify(auditLogRepository).save(logCaptor.capture());
    AuditLog saved = logCaptor.getValue();
    
    assertEquals("SYSTEM", saved.getUsername());
  }

  @Test
  void record_ShouldGetCompanyIdFromTenantContext_WhenCompanyIdIsNull() {
    UUID tenantId = UUID.randomUUID();
    TenantContext.setTenantId(tenantId);

    auditService.record(AuditAction.CREAR, null, null, null);

    verify(auditLogRepository).save(logCaptor.capture());
    AuditLog saved = logCaptor.getValue();
    
    assertEquals(tenantId, saved.getCompanyId());
  }
  
  @Test
  void record_ShouldFallbackToRemoteAddr_WhenXForwardedForIsNull() {
    HttpServletRequest request = mock(HttpServletRequest.class);
    when(request.getHeader("X-Forwarded-For")).thenReturn(null);
    when(request.getRemoteAddr()).thenReturn("10.0.0.1");
    
    ServletRequestAttributes attrs = mock(ServletRequestAttributes.class);
    when(attrs.getRequest()).thenReturn(request);
    RequestContextHolder.setRequestAttributes(attrs);

    auditService.record(AuditAction.CREAR, null, null, null);

    verify(auditLogRepository).save(logCaptor.capture());
    AuditLog saved = logCaptor.getValue();
    
    assertEquals("10.0.0.1", saved.getIpAddress());
  }

  @Test
  void record_Overloads_ShouldWorkCorrectly() {
    AppUser user = new AppUser();
    user.setEmail("overload@test.com");
    
    auditService.record(AuditAction.CREAR, user, "old", "new", "meta");
    verify(auditLogRepository).save(logCaptor.capture());
    assertEquals("overload@test.com", logCaptor.getValue().getUsername());
  }
}
