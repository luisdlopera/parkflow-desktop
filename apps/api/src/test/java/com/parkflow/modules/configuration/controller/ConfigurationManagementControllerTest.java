package com.parkflow.modules.configuration.controller;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.parkflow.modules.audit.service.AuditService;
import com.parkflow.modules.configuration.dto.*;
import com.parkflow.modules.licensing.domain.Company;
import com.parkflow.modules.licensing.domain.repository.CompanyPort;
import com.parkflow.modules.licensing.enums.PlanType;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import com.parkflow.modules.auth.security.TenantContext;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ConfigurationManagementControllerTest {

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private CompanyPort companyPort;
  @MockBean private AuditService auditService;
  private UUID testCompanyId;

  @BeforeEach
  void setUp() {
    Company company = new Company();
    company.setName("Test Company");
    company.setPlan(PlanType.SYNC);
    Company saved = companyPort.save(company);
    testCompanyId = saved.getId();
    TenantContext.setTenantId(testCompanyId);
  }

  @AfterEach
  void tearDown() {
    TenantContext.clear();
  }

  // ==================== CAPACITY MANAGEMENT TESTS ====================

  @Test
  @DisplayName("Should require authentication for GET capacity")
  void shouldRequireAuthenticationForGetCapacity() throws Exception {
    mockMvc
        .perform(get("/api/v1/configuration/capacity").header("X-Company-ID", testCompanyId.toString()))
        .andExpect(status().isUnauthorized());
  }

  @Test
  @WithMockUser(roles = "ADMIN")
  @DisplayName("Should return capacity configuration for authenticated user")
  void shouldReturnCapacityConfiguration() throws Exception {
    mockMvc
        .perform(get("/api/v1/configuration/capacity").header("X-Company-ID", testCompanyId.toString()))
        .andExpect(status().isOk());
  }

  @Test
  @WithMockUser(roles = "ADMIN")
  @DisplayName("Should update capacity configuration with valid request")
  void shouldUpdateCapacity() throws Exception {
    CapacityRequest request = CapacityRequest.builder().totalCapacity(50).build();

    mockMvc
        .perform(
            patch("/api/v1/configuration/capacity")
                .with(csrf())
                .header("X-Company-ID", testCompanyId.toString())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isOk());
  }

  @Test
  @WithMockUser(roles = "ADMIN")
  @DisplayName("Should reject invalid capacity request")
  void shouldRejectInvalidCapacityRequest() throws Exception {
    String invalidRequest = "{\"totalCapacity\": 0}";

    mockMvc
        .perform(
            patch("/api/v1/configuration/capacity")
                .with(csrf())
                .header("X-Company-ID", testCompanyId.toString())
                .contentType(MediaType.APPLICATION_JSON)
                .content(invalidRequest))
        .andExpect(status().isBadRequest());
  }

  // ==================== SHIFT CONFIGURATION TESTS ====================

  @Test
  @DisplayName("Should require authentication for GET shift configuration")
  void shouldRequireAuthenticationForGetShiftConfig() throws Exception {
    mockMvc
        .perform(get("/api/v1/configuration/shifts").header("X-Company-ID", testCompanyId.toString()))
        .andExpect(status().isUnauthorized());
  }

  @Test
  @WithMockUser(roles = "ADMIN")
  @DisplayName("Should return shift configuration")
  void shouldReturnShiftConfiguration() throws Exception {
    mockMvc
        .perform(get("/api/v1/configuration/shifts").header("X-Company-ID", testCompanyId.toString()))
        .andExpect(status().isOk());
  }

  @Test
  @WithMockUser(roles = "ADMIN")
  @DisplayName("Should update shift configuration with valid times")
  void shouldUpdateShiftConfiguration() throws Exception {
    ShiftConfigurationRequest request =
        ShiftConfigurationRequest.builder()
            .shiftsEnabled(true)
            .dayShiftStart("07:00")
            .dayShiftEnd("19:00")
            .nightShiftStart("19:00")
            .nightShiftEnd("07:00")
            .build();

    mockMvc
        .perform(
            patch("/api/v1/configuration/shifts")
                .with(csrf())
                .header("X-Company-ID", testCompanyId.toString())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isOk());
  }

  @Test
  @WithMockUser(roles = "ADMIN")
  @DisplayName("Should reject invalid shift times")
  void shouldRejectInvalidShiftTimes() throws Exception {
    ShiftConfigurationRequest request =
        ShiftConfigurationRequest.builder()
            .shiftsEnabled(true)
            .dayShiftStart("19:00")
            .dayShiftEnd("07:00")
            .nightShiftStart("19:00")
            .nightShiftEnd("07:00")
            .build();

    mockMvc
        .perform(
            patch("/api/v1/configuration/shifts")
                .with(csrf())
                .header("X-Company-ID", testCompanyId.toString())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isBadRequest());
  }

  // ==================== MODULE CONFIGURATION TESTS ====================

  @Test
  @DisplayName("Should require authentication for GET modules configuration")
  void shouldRequireAuthenticationForGetModules() throws Exception {
    mockMvc
        .perform(get("/api/v1/configuration/modules").header("X-Company-ID", testCompanyId.toString()))
        .andExpect(status().isUnauthorized());
  }

  @Test
  @WithMockUser(roles = "ADMIN")
  @DisplayName("Should return modules configuration")
  void shouldReturnModulesConfiguration() throws Exception {
    mockMvc
        .perform(get("/api/v1/configuration/modules").header("X-Company-ID", testCompanyId.toString()))
        .andExpect(status().isOk());
  }

  @Test
  @WithMockUser(roles = "ADMIN")
  @DisplayName("Should update modules configuration")
  void shouldUpdateModulesConfiguration() throws Exception {
    ModuleConfigurationRequest request =
        ModuleConfigurationRequest.builder()
            .clientsEnabled(true)
            .agreementsEnabled(false)
            .monthlyEnabled(true)
            .shiftsEnabled(false)
            .cashEnabled(true)
            .advancedAuditEnabled(false)
            .build();

    mockMvc
        .perform(
            patch("/api/v1/configuration/modules")
                .with(csrf())
                .header("X-Company-ID", testCompanyId.toString())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isOk());
  }

  // ==================== REGION CONFIGURATION TESTS ====================

  @Test
  @DisplayName("Should require authentication for GET region configuration")
  void shouldRequireAuthenticationForGetRegion() throws Exception {
    mockMvc
        .perform(get("/api/v1/configuration/region").header("X-Company-ID", testCompanyId.toString()))
        .andExpect(status().isUnauthorized());
  }

  @Test
  @WithMockUser(roles = "ADMIN")
  @DisplayName("Should return region configuration")
  void shouldReturnRegionConfiguration() throws Exception {
    mockMvc
        .perform(get("/api/v1/configuration/region").header("X-Company-ID", testCompanyId.toString()))
        .andExpect(status().isOk());
  }

  @Test
  @WithMockUser(roles = "ADMIN")
  @DisplayName("Should update region configuration")
  void shouldUpdateRegionConfiguration() throws Exception {
    RegionConfigurationRequest request =
        RegionConfigurationRequest.builder()
            .countryCode("MX")
            .platePattern("^[A-Z]{3}[0-9]{3,4}$")
            .platePrefixes("CDMX,MTY")
            .timezone("America/Mexico_City")
            .build();

    mockMvc
        .perform(
            patch("/api/v1/configuration/region")
                .with(csrf())
                .header("X-Company-ID", testCompanyId.toString())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isOk());
  }

  @Test
  @WithMockUser(roles = "ADMIN")
  @DisplayName("Should reject missing country code")
  void shouldRejectMissingCountryCode() throws Exception {
    String invalidRequest = "{\"platePattern\": \"^[A-Z]{3}[0-9]{3}$\"}";

    mockMvc
        .perform(
            patch("/api/v1/configuration/region")
                .with(csrf())
                .header("X-Company-ID", testCompanyId.toString())
                .contentType(MediaType.APPLICATION_JSON)
                .content(invalidRequest))
        .andExpect(status().isBadRequest());
  }

  // ==================== HELMET HANDLING TESTS ====================

  @Test
  @DisplayName("Should require authentication for GET helmet handling")
  void shouldRequireAuthenticationForGetHelmet() throws Exception {
    mockMvc
        .perform(
            get("/api/v1/configuration/helmet-handling")
                .header("X-Company-ID", testCompanyId.toString()))
        .andExpect(status().isUnauthorized());
  }

  @Test
  @WithMockUser(roles = "ADMIN")
  @DisplayName("Should return helmet handling configuration")
  void shouldReturnHelmetHandling() throws Exception {
    mockMvc
        .perform(
            get("/api/v1/configuration/helmet-handling")
                .header("X-Company-ID", testCompanyId.toString()))
        .andExpect(status().isOk());
  }

  @Test
  @WithMockUser(roles = "ADMIN")
  @DisplayName("Should update helmet handling mode")
  void shouldUpdateHelmetHandling() throws Exception {
    HelmetHandlingRequest request =
        HelmetHandlingRequest.builder().mode("LOCKERS").lockerCount(10).build();

    mockMvc
        .perform(
            patch("/api/v1/configuration/helmet-handling")
                .with(csrf())
                .header("X-Company-ID", testCompanyId.toString())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isOk());
  }

  // ==================== AUTHORIZATION TESTS ====================

  @Test
  @WithMockUser(roles = "OPERADOR")
  @DisplayName("Should deny write access to OPERADOR role")
  void shouldDenyWriteAccessToOperador() throws Exception {
    CapacityRequest request = CapacityRequest.builder().totalCapacity(50).build();

    mockMvc
        .perform(
            patch("/api/v1/configuration/capacity")
                .with(csrf())
                .header("X-Company-ID", testCompanyId.toString())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isForbidden());
  }

  @Test
  @WithMockUser(roles = "OPERADOR")
  @DisplayName("Should allow read access to OPERADOR role")
  void shouldAllowReadAccessToOperador() throws Exception {
    mockMvc
        .perform(
            get("/api/v1/configuration/capacity").header("X-Company-ID", testCompanyId.toString()))
        .andExpect(status().isOk());
  }

  // ==================== 404 TESTS ====================

  @Test
  @WithMockUser(roles = "ADMIN")
  @DisplayName("Should return 404 for non-existent company")
  void shouldReturn404ForNonExistentCompany() throws Exception {
    UUID nonExistentId = UUID.randomUUID();
    TenantContext.setTenantId(nonExistentId);

    mockMvc
        .perform(
            get("/api/v1/configuration/capacity").header("X-Company-ID", nonExistentId.toString()))
        .andExpect(status().isNotFound());
  }
}
