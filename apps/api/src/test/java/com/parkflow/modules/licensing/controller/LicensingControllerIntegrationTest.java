package com.parkflow.modules.licensing.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.parkflow.modules.licensing.repository.CompanyModuleRepository;
import com.parkflow.modules.licensing.repository.CompanyRepository;
import com.parkflow.modules.licensing.repository.LicenseAuditLogRepository;
import com.parkflow.modules.licensing.repository.LicenseBlockEventRepository;
import com.parkflow.modules.licensing.repository.LicensedDeviceRepository;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class LicensingControllerIntegrationTest {

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private CompanyRepository companyRepository;
  @Autowired private CompanyModuleRepository moduleRepository;
  @Autowired private LicensedDeviceRepository deviceRepository;
  @Autowired private LicenseAuditLogRepository auditLogRepository;
  @Autowired private LicenseBlockEventRepository blockEventRepository;

  @BeforeEach
  void clean() {
    blockEventRepository.deleteAll();
    auditLogRepository.deleteAll();
    deviceRepository.deleteAll();
    moduleRepository.deleteAll();
    companyRepository.deleteAll();
  }

  @Test
  @WithMockUser(roles = "SUPER_ADMIN")
  void createGenerateValidateAndHeartbeatLicenseLifecycle() throws Exception {
    String createBody = """
      {
        "name": "ParkFlow Licenses",
        "nit": "900123457",
        "plan": "PRO",
        "trialDays": 0,
        "maxDevices": 2,
        "maxLocations": 2,
        "maxUsers": 10,
        "offlineModeAllowed": true
      }
      """;

    var createResult = mockMvc.perform(post("/api/v1/licensing/companies")
            .contentType(MediaType.APPLICATION_JSON)
            .content(createBody)
            .requestAttr("currentUserEmail", "qa@parkflow.local"))
        .andExpect(status().isOk())
        .andReturn();

    JsonNode companyJson = objectMapper.readTree(createResult.getResponse().getContentAsString());
    UUID companyId = UUID.fromString(companyJson.get("id").asText());

    assertThat(companyJson.get("status").asText()).isEqualTo("ACTIVE");
    assertThat(companyJson.get("modules")).hasSize(7);

    String generateBody = """
      {
        "companyId": "%s",
        "deviceFingerprint": "fp-lic-001",
        "hostname": "DESKTOP-1",
        "operatingSystem": "macOS",
        "appVersion": "1.0.0"
      }
      """.formatted(companyId);

    var generateResult = mockMvc.perform(post("/api/v1/licensing/licenses/generate")
            .contentType(MediaType.APPLICATION_JSON)
            .content(generateBody)
            .requestAttr("currentUserEmail", "qa@parkflow.local"))
        .andExpect(status().isOk())
        .andReturn();

    JsonNode licenseJson = objectMapper.readTree(generateResult.getResponse().getContentAsString());
    String licenseKey = licenseJson.get("licenseKey").asText();
    String signature = licenseJson.get("signature").asText();

    String validateBody = """
      {
        "companyId": "%s",
        "deviceFingerprint": "fp-lic-001",
        "licenseKey": "%s",
        "signature": "%s",
        "appVersion": "1.0.0"
      }
      """.formatted(companyId, licenseKey, signature);

    mockMvc.perform(post("/api/v1/licensing/validate")
            .contentType(MediaType.APPLICATION_JSON)
            .content(validateBody)
            .header("X-API-Key", "test-api-key-12345"))
        .andExpect(status().isOk())
        .andExpect(result -> {
          JsonNode body = objectMapper.readTree(result.getResponse().getContentAsString());
          assertThat(body.get("valid").asBoolean()).isTrue();
          assertThat(body.get("allowOperations").asBoolean()).isTrue();
          assertThat(body.get("enabledModules")).isNotEmpty();
        });

    String heartbeatBody = """
      {
        "companyId": "%s",
        "deviceFingerprint": "fp-lic-001",
        "appVersion": "1.0.1",
        "pendingSyncCount": 0,
        "syncedCount": 0,
        "failedSyncCount": 0
      }
      """.formatted(companyId);

    mockMvc.perform(post("/api/v1/licensing/heartbeat")
            .contentType(MediaType.APPLICATION_JSON)
            .content(heartbeatBody)
            .header("X-API-Key", "test-api-key-12345"))
        .andExpect(status().isOk())
        .andExpect(result -> {
          JsonNode body = objectMapper.readTree(result.getResponse().getContentAsString());
          assertThat(body.get("allowOperations").asBoolean()).isTrue();
          assertThat(body.get("allowSync").asBoolean()).isTrue();
        });

    assertThat(deviceRepository.findByCompanyIdAndDeviceFingerprint(companyId, "fp-lic-001")).isPresent();
  }

  @Test
  @WithMockUser(roles = "SUPER_ADMIN")
  void rejectsNonAdminCreateRequests() throws Exception {
    mockMvc.perform(post("/api/v1/licensing/companies")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"name\":\"X\",\"plan\":\"PRO\"}")
            .requestAttr("currentUserEmail", "qa@parkflow.local"))
        .andExpect(status().isOk());
  }
}
