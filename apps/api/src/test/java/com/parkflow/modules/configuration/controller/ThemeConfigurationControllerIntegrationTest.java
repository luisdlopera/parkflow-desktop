package com.parkflow.modules.configuration.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.parkflow.config.BaseIntegrationTest;
import com.parkflow.modules.auth.security.TenantContext;
import com.parkflow.modules.configuration.application.port.in.ThemeConfigurationUseCase;
import com.parkflow.modules.configuration.dto.ThemeConfigurationRequest;
import com.parkflow.modules.configuration.dto.ThemeConfigurationResponse;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.test.context.support.WithMockUser;

@DisplayName("ThemeConfigurationController Integration Tests")
class ThemeConfigurationControllerIntegrationTest extends BaseIntegrationTest {

  @MockBean
  private ThemeConfigurationUseCase themeConfigurationUseCase;

  @Autowired
  private ObjectMapper objectMapper;

  private UUID companyId;
  private ThemeConfigurationResponse mockResponse;

  @BeforeEach
  void setUp() {
    companyId = UUID.randomUUID();
    TenantContext.setTenantId(companyId);

    mockResponse = new ThemeConfigurationResponse(
        UUID.randomUUID(),
        companyId,
        "#000000",
        "#FFFFFF",
        "#00FF00",
        "#FFFF00",
        "#FF0000",
        "light",
        null,
        null,
        OffsetDateTime.now(),
        OffsetDateTime.now()
    );
  }

  @AfterEach
  void tearDown() {
    TenantContext.clear();
  }

  @Test
  @WithMockUser(roles = "ADMIN")
  void getTheme_ShouldReturnResponse() throws Exception {
    when(themeConfigurationUseCase.getByCompany(companyId)).thenReturn(mockResponse);

    mockMvc.perform(get("/api/v1/configuration/theme"))
        .andExpect(status().isOk());
  }

  @Test
  @WithMockUser(roles = "ADMIN")
  void upsertTheme_ShouldReturnResponse() throws Exception {
    ThemeConfigurationRequest request = new ThemeConfigurationRequest(
        "#000000", "#FFFFFF", "#00FF00", "#FFFF00", "#FF0000", "dark"
    );

    when(themeConfigurationUseCase.createOrUpdate(any(), any())).thenReturn(mockResponse);

    mockMvc.perform(put("/api/v1/configuration/theme")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isOk());
  }

  @Test
  @WithMockUser(roles = "ADMIN")
  void uploadLogo_ShouldReturnResponse() throws Exception {
    MockMultipartFile file = new MockMultipartFile("file", "logo.png", "image/png", "img".getBytes());

    when(themeConfigurationUseCase.updateLogo(any(), any())).thenReturn(mockResponse);

    mockMvc.perform(multipart("/api/v1/configuration/theme/logo").file(file))
        .andExpect(status().isOk());
  }

  @Test
  @WithMockUser(roles = "ADMIN")
  void removeLogo_ShouldReturnResponse() throws Exception {
    when(themeConfigurationUseCase.removeLogo(any())).thenReturn(mockResponse);

    mockMvc.perform(delete("/api/v1/configuration/theme/logo"))
        .andExpect(status().isOk());
  }

  @Test
  @WithMockUser(roles = "ADMIN")
  void uploadFavicon_ShouldReturnResponse() throws Exception {
    MockMultipartFile file = new MockMultipartFile("file", "favicon.png", "image/png", "img".getBytes());

    when(themeConfigurationUseCase.updateFavicon(any(), any())).thenReturn(mockResponse);

    mockMvc.perform(multipart("/api/v1/configuration/theme/favicon").file(file))
        .andExpect(status().isOk());
  }

  @Test
  @WithMockUser(roles = "ADMIN")
  void removeFavicon_ShouldReturnResponse() throws Exception {
    when(themeConfigurationUseCase.removeFavicon(any())).thenReturn(mockResponse);

    mockMvc.perform(delete("/api/v1/configuration/theme/favicon"))
        .andExpect(status().isOk());
  }
}
