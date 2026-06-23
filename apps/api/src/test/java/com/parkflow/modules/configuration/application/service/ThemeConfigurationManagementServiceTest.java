package com.parkflow.modules.configuration.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.parkflow.modules.audit.service.AuditService;
import com.parkflow.modules.auth.security.TenantContext;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.configuration.domain.ThemeConfiguration;
import com.parkflow.modules.configuration.domain.repository.ThemeConfigurationPort;
import com.parkflow.modules.configuration.dto.ThemeConfigurationRequest;
import com.parkflow.modules.configuration.dto.ThemeConfigurationResponse;
import java.nio.file.Path;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class ThemeConfigurationManagementServiceTest {

  @Mock private ThemeConfigurationPort repo;
  @Mock private AuditService auditService;

  private ThemeConfigurationManagementService service;
  private static final UUID COMPANY_ID = UUID.randomUUID();

  @TempDir Path tempDir;

  @BeforeEach
  void setUp() {
    service = new ThemeConfigurationManagementService(repo, auditService, new ObjectMapper());
    ReflectionTestUtils.setField(service, "uploadsDir", tempDir.toString());
    ReflectionTestUtils.setField(service, "uploadsBaseUrl", "/uploads");
  }

  private ThemeConfigurationRequest req() {
    return new ThemeConfigurationRequest("#112233", "#445566", "#22c55e",
        "#f59e0b", "#ef4444", "dark");
  }

  private ThemeConfiguration existing() {
    ThemeConfiguration e = new ThemeConfiguration();
    e.setId(UUID.randomUUID());
    e.setCompanyId(COMPANY_ID);
    e.setPrimaryColor("#000000");
    e.setThemeMode("auto");
    return e;
  }

  @Test
  void getByCompany_returnsExisting() {
    when(repo.findByCompanyId(COMPANY_ID)).thenReturn(Optional.of(existing()));
    ThemeConfigurationResponse resp = service.getByCompany(COMPANY_ID);
    assertThat(resp.primaryColor()).isEqualTo("#000000");
  }

  @Test
  void getByCompany_returnsDefaultWhenMissing() {
    when(repo.findByCompanyId(COMPANY_ID)).thenReturn(Optional.empty());
    ThemeConfigurationResponse resp = service.getByCompany(COMPANY_ID);
    assertThat(resp.primaryColor()).isEqualTo("#f97316");
    assertThat(resp.themeMode()).isEqualTo("auto");
  }

  @Test
  void createOrUpdate_createsNew() {
    try (var ctx = mockStatic(TenantContext.class)) {
      ctx.when(TenantContext::getTenantId).thenReturn(COMPANY_ID);
      when(repo.findByCompanyId(COMPANY_ID)).thenReturn(Optional.empty());
      when(repo.save(any())).thenAnswer(i -> i.getArgument(0));
      ThemeConfigurationResponse resp = service.createOrUpdate(null, req());
      assertThat(resp.primaryColor()).isEqualTo("#112233");
      assertThat(resp.themeMode()).isEqualTo("dark");
      verify(auditService).record(any(), any(), any(), any(), any(), any());
    }
  }

  @Test
  void createOrUpdate_updatesExisting() {
    try (var ctx = mockStatic(TenantContext.class)) {
      ctx.when(TenantContext::getTenantId).thenReturn(COMPANY_ID);
      when(repo.findByCompanyId(COMPANY_ID)).thenReturn(Optional.of(existing()));
      when(repo.save(any())).thenAnswer(i -> i.getArgument(0));
      ThemeConfigurationResponse resp = service.createOrUpdate(COMPANY_ID, req());
      assertThat(resp.secondaryColor()).isEqualTo("#445566");
    }
  }

  @Test
  void createOrUpdate_throwsWhenNoCompany() {
    try (var ctx = mockStatic(TenantContext.class)) {
      ctx.when(TenantContext::getTenantId).thenReturn(null);
      assertThatThrownBy(() -> service.createOrUpdate(null, req()))
          .isInstanceOf(OperationException.class)
          .hasMessageContaining("Contexto de compañía");
    }
  }

  @Test
  void updateLogo_storesFile() {
    try (var ctx = mockStatic(TenantContext.class)) {
      ctx.when(TenantContext::getTenantId).thenReturn(COMPANY_ID);
      when(repo.findByCompanyId(COMPANY_ID)).thenReturn(Optional.of(existing()));
      when(repo.save(any())).thenAnswer(i -> i.getArgument(0));
      MockMultipartFile file = new MockMultipartFile("file", "logo.png",
          "image/png", new byte[]{1, 2, 3});
      ThemeConfigurationResponse resp = service.updateLogo(COMPANY_ID, file);
      assertThat(resp.logoUrl()).contains("logo.png");
    }
  }

  @Test
  void updateLogo_throwsWhenEmpty() {
    MockMultipartFile file = new MockMultipartFile("file", "logo.png",
        "image/png", new byte[]{});
    assertThatThrownBy(() -> service.updateLogo(COMPANY_ID, file))
        .isInstanceOf(OperationException.class)
        .hasMessageContaining("no puede estar vacío");
  }

  @Test
  void updateLogo_throwsWhenInvalidType() {
    MockMultipartFile file = new MockMultipartFile("file", "logo.txt",
        "text/plain", new byte[]{1, 2, 3});
    assertThatThrownBy(() -> service.updateLogo(COMPANY_ID, file))
        .isInstanceOf(OperationException.class)
        .hasMessageContaining("no permitido");
  }

  @Test
  void updateFavicon_storesFile() {
    try (var ctx = mockStatic(TenantContext.class)) {
      ctx.when(TenantContext::getTenantId).thenReturn(COMPANY_ID);
      when(repo.findByCompanyId(COMPANY_ID)).thenReturn(Optional.empty());
      when(repo.save(any())).thenAnswer(i -> i.getArgument(0));
      MockMultipartFile file = new MockMultipartFile("file", "fav.png",
          "image/png", new byte[]{9});
      ThemeConfigurationResponse resp = service.updateFavicon(COMPANY_ID, file);
      assertThat(resp.faviconUrl()).contains("favicon.png");
    }
  }

  @Test
  void removeLogo_clearsUrl() {
    try (var ctx = mockStatic(TenantContext.class)) {
      ctx.when(TenantContext::getTenantId).thenReturn(COMPANY_ID);
      ThemeConfiguration e = existing();
      e.setLogoUrl("/uploads/x/logo.png");
      when(repo.findByCompanyId(COMPANY_ID)).thenReturn(Optional.of(e));
      when(repo.save(any())).thenAnswer(i -> i.getArgument(0));
      ThemeConfigurationResponse resp = service.removeLogo(COMPANY_ID);
      assertThat(resp.logoUrl()).isNull();
    }
  }

  @Test
  void removeFavicon_clearsUrl() {
    try (var ctx = mockStatic(TenantContext.class)) {
      ctx.when(TenantContext::getTenantId).thenReturn(COMPANY_ID);
      ThemeConfiguration e = existing();
      e.setFaviconUrl("/uploads/x/favicon.png");
      when(repo.findByCompanyId(COMPANY_ID)).thenReturn(Optional.of(e));
      when(repo.save(any())).thenAnswer(i -> i.getArgument(0));
      ThemeConfigurationResponse resp = service.removeFavicon(COMPANY_ID);
      assertThat(resp.faviconUrl()).isNull();
    }
  }
}
