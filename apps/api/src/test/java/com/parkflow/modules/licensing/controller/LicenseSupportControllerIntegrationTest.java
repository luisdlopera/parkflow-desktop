package com.parkflow.modules.licensing.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.parkflow.modules.licensing.dto.LicenseDiagnosticsResponse;
import com.parkflow.modules.licensing.enums.CompanyStatus;
import com.parkflow.modules.licensing.enums.PlanType;
import com.parkflow.modules.licensing.domain.repository.LicenseBlockEventPort;
import com.parkflow.modules.audit.application.service.AuditService;
import com.parkflow.modules.licensing.application.service.LicenseAuditService;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class LicenseSupportControllerIntegrationTest {

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @MockBean private AuditService globalAuditService;
  @MockBean private LicenseAuditService auditService;
  @MockBean private LicenseBlockEventPort blockEventRepository;

  @Test
  @WithMockUser(roles = "SUPPORT")
  void diagnoseCompanyReturnsServicePayload() throws Exception {
    UUID companyId = UUID.randomUUID();
    LicenseDiagnosticsResponse payload = LicenseDiagnosticsResponse.builder()
        .companyId(companyId.toString())
        .companyName("ParkFlow SA")
        .currentStatus(CompanyStatus.BLOCKED)
        .currentPlan(PlanType.PRO)
        .healthStatus("CRITICAL")
        .warnings(List.of("warning"))
        .recommendations(List.of("recommendation"))
        .build();

    when(auditService.diagnoseCompany(companyId)).thenReturn(payload);

    mockMvc.perform(get("/api/v1/licensing/support/diagnose/company/{companyId}", companyId))
        .andExpect(status().isOk())
        .andExpect(result -> {
          var body = objectMapper.readTree(result.getResponse().getContentAsString());
          assertThat(body.get("companyId").asText()).isEqualTo(companyId.toString());
          assertThat(body.get("healthStatus").asText()).isEqualTo("CRITICAL");
        });
  }

  @Test
  @WithMockUser(roles = "SUPPORT")
  void resolveBlockEventUsesCurrentUserEmail() throws Exception {
    UUID blockEventId = UUID.randomUUID();

    mockMvc.perform(post("/api/v1/licensing/support/blocks/{blockEventId}/resolve", blockEventId)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"notes\":\"Pago aplicado\",\"correctiveAction\":\"MANUAL_UNBLOCK\"}")
            .requestAttr("currentUserEmail", "support@parkflow.local"))
        .andExpect(status().isOk());

    verify(auditService).resolveBlockEvent(
        eq(blockEventId),
        org.mockito.ArgumentMatchers.anyString(),
        eq("Pago aplicado"),
        eq("MANUAL_UNBLOCK"));
  }

  @Test
  @WithMockUser(roles = "SUPPORT")
  void diagnoseDevice_ReturnsOk() throws Exception {
    when(auditService.diagnoseDevice(eq("HW-1"))).thenReturn(
        com.parkflow.modules.licensing.dto.DeviceDiagnosticsResponse.builder().build());

    mockMvc.perform(get("/api/v1/licensing/support/diagnose/device/{hardwareId}", "HW-1"))
        .andExpect(status().isOk());
  }

  @Test
  @WithMockUser(roles = "SUPPORT")
  void getCompanyBlockEvents_ReturnsOk() throws Exception {
    UUID companyId = UUID.randomUUID();
    when(blockEventRepository.findByCompanyIdOrderByCreatedAtDesc(eq(companyId))).thenReturn(List.of());
    when(blockEventRepository.findUnresolvedByCompanyId(eq(companyId))).thenReturn(List.of());

    mockMvc.perform(get("/api/v1/licensing/support/blocks/company/{companyId}", companyId))
        .andExpect(status().isOk());
  }

  @Test
  @WithMockUser(roles = "SUPPORT")
  void getUnresolvedBlocks_ReturnsOk() throws Exception {
    when(blockEventRepository.findUnresolvedEvents()).thenReturn(List.of());

    mockMvc.perform(get("/api/v1/licensing/support/blocks/unresolved"))
        .andExpect(status().isOk());
  }

  @Test
  @WithMockUser(roles = "SUPER_ADMIN")
  void getFalsePositives_ReturnsOk() throws Exception {
    when(blockEventRepository.findFalsePositives()).thenReturn(List.of());

    mockMvc.perform(get("/api/v1/licensing/support/blocks/false-positives"))
        .andExpect(status().isOk());
  }

  @Test
  @WithMockUser(roles = "SUPPORT")
  void getPriorityCases_ReturnsOk() throws Exception {
    when(auditService.getPrioritySupportCases()).thenReturn(List.of());

    mockMvc.perform(get("/api/v1/licensing/support/cases/priority"))
        .andExpect(status().isOk());
  }

  @Test
  @WithMockUser(roles = "SUPER_ADMIN")
  void getStatistics_ReturnsOk() throws Exception {
    when(auditService.getBlockStatistics(org.mockito.ArgumentMatchers.any()))
        .thenReturn(com.parkflow.modules.licensing.dto.BlockStatisticsResponse.builder().build());

    mockMvc.perform(get("/api/v1/licensing/support/statistics"))
        .andExpect(status().isOk());
  }

  @Test
  @WithMockUser(roles = "SUPER_ADMIN")
  void markAsFalsePositive_ReturnsOk() throws Exception {
    UUID eventId = UUID.randomUUID();
    mockMvc.perform(post("/api/v1/licensing/support/blocks/{eventId}/false-positive", eventId)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"notes\":\"Test false positive\"}")
            .requestAttr("currentUserEmail", "admin@parkflow.local"))
        .andExpect(status().isOk());

    verify(auditService).markAsFalsePositive(eq(eventId), eq("admin@parkflow.local"), eq("Test false positive"));
  }

  @Test
  @WithMockUser(roles = "SUPPORT")
  void unblockCompany_ReturnsOk() throws Exception {
    UUID companyId = UUID.randomUUID();
    when(blockEventRepository.findUnresolvedByCompanyId(companyId)).thenReturn(List.of());

    mockMvc.perform(post("/api/v1/licensing/support/company/{companyId}/unblock", companyId)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"reason\":\"Test reason\"}")
            .requestAttr("currentUserEmail", "support@parkflow.local"))
        .andExpect(status().isOk());
  }
}
