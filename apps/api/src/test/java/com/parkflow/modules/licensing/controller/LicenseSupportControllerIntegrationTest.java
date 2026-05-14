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
import com.parkflow.modules.licensing.repository.LicenseBlockEventRepository;
import com.parkflow.modules.licensing.service.LicenseAuditService;
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
  @MockBean private LicenseAuditService auditService;
  @MockBean private LicenseBlockEventRepository blockEventRepository;

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
        eq("support@parkflow.local"),
        eq("Pago aplicado"),
        eq("MANUAL_UNBLOCK"));
  }
}
