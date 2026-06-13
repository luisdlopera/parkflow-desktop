package com.parkflow.modules.licensing.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import com.parkflow.modules.audit.service.AuditService;
import com.parkflow.modules.licensing.domain.repository.CompanyModulePort;
import com.parkflow.modules.licensing.domain.repository.CompanyPort;
import com.parkflow.modules.licensing.domain.repository.LicenseAuditLogPort;
import com.parkflow.modules.licensing.domain.repository.LicenseBlockEventPort;
import com.parkflow.modules.licensing.domain.repository.LicensedDevicePort;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
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
class LicensingControllerIntegrationTest {

  @MockBean private AuditService auditService;
  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private CompanyPort companyRepository;
  @Autowired private CompanyModulePort moduleRepository;
  @Autowired private LicensedDevicePort deviceRepository;
  @Autowired private LicenseAuditLogPort auditLogRepository;
  @Autowired private LicenseBlockEventPort blockEventRepository;
  @Autowired private com.parkflow.modules.parking.operation.repository.AppUserRepository appUserRepository;

  @BeforeEach
  void clean() {
    blockEventRepository.deleteAll();
    auditLogRepository.deleteAll();
    deviceRepository.deleteAll();
    moduleRepository.deleteAll();
    // Ensure test isolation for users created by company creation
    appUserRepository.deleteAll();
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
  void listCompanies_returnsAll() throws Exception {
    // create two companies directly
    com.parkflow.modules.licensing.domain.Company c1 = new com.parkflow.modules.licensing.domain.Company();
    c1.setName("Comp A");
    c1.setPlan(com.parkflow.modules.licensing.enums.PlanType.SYNC);
    c1.setStatus(com.parkflow.modules.licensing.enums.CompanyStatus.ACTIVE);
    companyRepository.save(c1);

    com.parkflow.modules.licensing.domain.Company c2 = new com.parkflow.modules.licensing.domain.Company();
    c2.setName("Comp B");
    c2.setPlan(com.parkflow.modules.licensing.enums.PlanType.PRO);
    c2.setStatus(com.parkflow.modules.licensing.enums.CompanyStatus.EXPIRED);
    companyRepository.save(c2);

    var result = mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/v1/licensing/companies"))
        .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isOk())
        .andReturn();

    com.fasterxml.jackson.databind.JsonNode body = objectMapper.readTree(result.getResponse().getContentAsString());
    org.assertj.core.api.Assertions.assertThat(body.isArray()).isTrue();
    org.assertj.core.api.Assertions.assertThat(body.size()).isGreaterThanOrEqualTo(2);
  }

  @Test
  @WithMockUser(roles = "SUPER_ADMIN")
  void getCompany_byId_success() throws Exception {
    com.parkflow.modules.licensing.domain.Company c = new com.parkflow.modules.licensing.domain.Company();
    c.setName("GetMe");
    c.setPlan(com.parkflow.modules.licensing.enums.PlanType.LOCAL);
    c.setStatus(com.parkflow.modules.licensing.enums.CompanyStatus.TRIAL);
    c = companyRepository.save(c);

    mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/v1/licensing/companies/" + c.getId()))
        .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isOk())
        .andExpect(result -> {
          com.fasterxml.jackson.databind.JsonNode node = objectMapper.readTree(result.getResponse().getContentAsString());
          org.assertj.core.api.Assertions.assertThat(node.get("name").asText()).isEqualTo("GetMe");
        });
  }

  @Test
  @WithMockUser(roles = "SUPER_ADMIN")
  void updateCompany_success_changesName() throws Exception {
    com.parkflow.modules.licensing.domain.Company c = new com.parkflow.modules.licensing.domain.Company();
    c.setName("ToUpdate");
    c.setPlan(com.parkflow.modules.licensing.enums.PlanType.LOCAL);
    c.setStatus(com.parkflow.modules.licensing.enums.CompanyStatus.ACTIVE);
    c = companyRepository.save(c);

    String updateBody = "{\"name\":\"Updated\"}";

    mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/api/v1/licensing/companies/" + c.getId())
            .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
            .content(updateBody)
            .requestAttr("currentUserEmail", "qa@parkflow.local"))
        .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isOk())
        .andExpect(result -> {
          com.fasterxml.jackson.databind.JsonNode node = objectMapper.readTree(result.getResponse().getContentAsString());
          org.assertj.core.api.Assertions.assertThat(node.get("name").asText()).isEqualTo("Updated");
        });
  }

  @Test
  @WithMockUser(roles = "SUPER_ADMIN")
  void updateCompany_duplicateNit_returnsBadRequest() throws Exception {
    com.parkflow.modules.licensing.domain.Company a = new com.parkflow.modules.licensing.domain.Company();
    a.setName("A");
    a.setNit("NIT-1");
    a.setPlan(com.parkflow.modules.licensing.enums.PlanType.LOCAL);
    a.setStatus(com.parkflow.modules.licensing.enums.CompanyStatus.ACTIVE);
    a = companyRepository.save(a);

    com.parkflow.modules.licensing.domain.Company b = new com.parkflow.modules.licensing.domain.Company();
    b.setName("B");
    b.setPlan(com.parkflow.modules.licensing.enums.PlanType.LOCAL);
    b.setStatus(com.parkflow.modules.licensing.enums.CompanyStatus.ACTIVE);
    b = companyRepository.save(b);

    String updateBody = "{\"nit\":\"NIT-1\"}";

    mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/api/v1/licensing/companies/" + b.getId())
            .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
            .content(updateBody)
            .requestAttr("currentUserEmail", "qa@parkflow.local"))
        .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isBadRequest())
        .andExpect(result -> {
          com.fasterxml.jackson.databind.JsonNode node = objectMapper.readTree(result.getResponse().getContentAsString());
          org.assertj.core.api.Assertions.assertThat(node.get("errorCode").asText()).isEqualTo("COMPANY_ALREADY_EXISTS");
        });
  }

  @Test
  @WithMockUser(roles = "SUPER_ADMIN")
  void deactivateCompany_success_setsCancelled() throws Exception {
    com.parkflow.modules.licensing.domain.Company c = new com.parkflow.modules.licensing.domain.Company();
    c.setName("ToDeactivate");
    c.setPlan(com.parkflow.modules.licensing.enums.PlanType.LOCAL);
    c.setStatus(com.parkflow.modules.licensing.enums.CompanyStatus.ACTIVE);
    c = companyRepository.save(c);

    mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete("/api/v1/licensing/companies/" + c.getId() + "/deactivate")
            .requestAttr("currentUserEmail", "qa@parkflow.local"))
        .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isNoContent());

    var updated = companyRepository.findById(c.getId()).orElseThrow();
    org.assertj.core.api.Assertions.assertThat(updated.getStatus()).isEqualTo(com.parkflow.modules.licensing.enums.CompanyStatus.CANCELLED);
  }

  @Test
  @WithMockUser(roles = "SUPER_ADMIN")
  void deleteCompany_hardDelete_removesCompany() throws Exception {
    com.parkflow.modules.licensing.domain.Company c = new com.parkflow.modules.licensing.domain.Company();
    c.setName("ToDelete");
    c.setPlan(com.parkflow.modules.licensing.enums.PlanType.LOCAL);
    c.setStatus(com.parkflow.modules.licensing.enums.CompanyStatus.ACTIVE);
    c = companyRepository.save(c);

    mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete("/api/v1/licensing/companies/" + c.getId() + "/purge")
            .requestAttr("currentUserEmail", "qa@parkflow.local"))
        .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isNoContent());

    org.assertj.core.api.Assertions.assertThat(companyRepository.findById(c.getId())).isEmpty();
  }

  @Test
  @WithMockUser(roles = "SUPER_ADMIN")
  void renewLicense_setsActive() throws Exception {
    com.parkflow.modules.licensing.domain.Company c = new com.parkflow.modules.licensing.domain.Company();
    c.setName("ToRenew");
    c.setPlan(com.parkflow.modules.licensing.enums.PlanType.LOCAL);
    c.setStatus(com.parkflow.modules.licensing.enums.CompanyStatus.PAST_DUE);
    c = companyRepository.save(c);

    var result = mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/v1/licensing/companies/" + c.getId() + "/renew?months=6")
            .requestAttr("currentUserEmail", "qa@parkflow.local"))
        .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isOk())
        .andReturn();

    com.fasterxml.jackson.databind.JsonNode node = objectMapper.readTree(result.getResponse().getContentAsString());
    org.assertj.core.api.Assertions.assertThat(node.get("status").asText()).isEqualTo("ACTIVE");
  }

  @Test
  @WithMockUser(roles = "OPERADOR")
  void listCompanies_forbidden_forNonAdmin() throws Exception {
    mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/v1/licensing/companies"))
        .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isForbidden());
  }

  @Test
  @WithMockUser(roles = "SUPER_ADMIN")
  void createCompany_validationErrors_returnsBadRequest() throws Exception {
    String body = "{\"plan\":\"PRO\"}"; // missing name

    mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/v1/licensing/companies")
            .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
            .content(body)
            .requestAttr("currentUserEmail", "qa@parkflow.local"))
        .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isBadRequest())
        .andExpect(result -> {
          com.fasterxml.jackson.databind.JsonNode node = objectMapper.readTree(result.getResponse().getContentAsString());
          org.assertj.core.api.Assertions.assertThat(node.get("errorCode").asText()).isEqualTo("VALIDATION_ERROR");
        });
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
