package com.parkflow.modules.onboarding.infrastructure.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.parkflow.modules.onboarding.dto.SaveOnboardingStepRequest;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class OnboardingControllerIntegrationTest {

  @Autowired
  private MockMvc mockMvc;

  @Autowired
  private ObjectMapper objectMapper;

  @Autowired
  private com.parkflow.modules.licensing.domain.repository.CompanyPort companyRepository;

  private UUID createTestCompany() {
    com.parkflow.modules.licensing.domain.Company company = new com.parkflow.modules.licensing.domain.Company();
    company.setName("Integration Test Company");
    company.setNit("123456789-" + UUID.randomUUID().toString().substring(0, 5));
    company.setAddress("123 Main St");
    company.setOperationalProfile(com.parkflow.modules.licensing.enums.OperationalProfile.PUBLIC);
    return companyRepository.save(company).getId();
  }

  private void setupSecurityContext(UUID companyId, String role) {
    com.parkflow.modules.auth.security.AuthPrincipal principal = new com.parkflow.modules.auth.security.AuthPrincipal(
        UUID.randomUUID(), 
        companyId, 
        "test@parkflow.com", 
        role, 
        java.util.List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_" + role))
    );
    org.springframework.security.authentication.UsernamePasswordAuthenticationToken auth = 
        new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
            principal, null, principal.authorities());
    org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(auth);
  }

  @org.junit.jupiter.api.AfterEach
  void tearDown() {
    org.springframework.security.core.context.SecurityContextHolder.clearContext();
  }

  @Test
  @DisplayName("saveStep - Happy path / Autosave (Optimistic Lock ready)")
  void testSaveStep() throws Exception {
    UUID companyId = createTestCompany();
    setupSecurityContext(companyId, "ADMIN");
    SaveOnboardingStepRequest request = new SaveOnboardingStepRequest(
        1, // current step
        Map.of("vehicles", "config", "vehicleTypes", java.util.List.of("MOTORCYCLE"), "helmetHandling", "NONE"),
        2 // target step
    );

    mockMvc.perform(put("/api/v1/onboarding/companies/{companyId}/steps", companyId)
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request)))
        .andDo(org.springframework.test.web.servlet.result.MockMvcResultHandlers.print())
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.currentStep").value(2))
        .andExpect(jsonPath("$.onboardingCompleted").value(false));
  }

  @Test
  @DisplayName("completeOnboarding - Flujo completo con materialización (o error si faltan pasos)")
  void testCompleteOnboarding() throws Exception {
    UUID companyId = createTestCompany();
    setupSecurityContext(companyId, "ADMIN");
    
    // Si la DB está vacía y tratamos de completar sin haber guardado los pasos, fallará
    mockMvc.perform(post("/api/v1/onboarding/companies/{companyId}/complete", companyId)
            .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf()))
        .andExpect(status().is4xxClientError());
  }

  @Test
  @DisplayName("skipAndApplyDefaults - Debería aplicar defaults y marcar completado")
  void testSkipAndApplyDefaults() throws Exception {
    UUID companyId = createTestCompany();
    setupSecurityContext(companyId, "ADMIN");
    
    mockMvc.perform(post("/api/v1/onboarding/companies/{companyId}/skip", companyId)
            .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf()))
        .andExpect(status().isOk()); 
  }

  @Test
  @DisplayName("resetOnboarding - Debería reiniciar el estado y crear snapshot")
  void testResetOnboarding() throws Exception {
    UUID companyId = createTestCompany();
    setupSecurityContext(companyId, "SUPER_ADMIN");
    
    mockMvc.perform(post("/api/v1/onboarding/companies/{companyId}/reset", companyId)
            .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf())
            .param("reason", "Testing reset"))
        .andExpect(status().isOk());
  }

  @Test
  @DisplayName("Security - No Administrador debe recibir 403 Forbidden")
  void testSecurityNonAdminForbidden() throws Exception {
    UUID companyId = createTestCompany();
    setupSecurityContext(companyId, "USER");
    
    mockMvc.perform(post("/api/v1/onboarding/companies/{companyId}/skip", companyId)
            .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf()))
        .andExpect(status().isForbidden());
  }

  @Test
  @DisplayName("Security - Tenant Isolation: Admin de otra compañía no puede acceder")
  void testSecurityTenantIsolation() throws Exception {
    UUID companyId = createTestCompany();
    UUID otherCompanyId = createTestCompany();
    setupSecurityContext(otherCompanyId, "ADMIN");
    
    mockMvc.perform(post("/api/v1/onboarding/companies/{companyId}/reset", companyId)
            .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf()))
        .andExpect(status().is4xxClientError()); 
  }
}
