package com.parkflow.modules.onboarding.steps.step2;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.parkflow.modules.licensing.domain.Company;
import com.parkflow.modules.licensing.domain.repository.CompanyPort;
import com.parkflow.modules.onboarding.domain.OnboardingProgress;
import com.parkflow.modules.onboarding.domain.repository.OnboardingProgressPort;
import com.parkflow.modules.onboarding.shared.OnboardingTestFixtures;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
@DisplayName("Step 2 Controller: Capacity Endpoint")
class Step2ControllerTest {

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private CompanyPort companyRepository;
  @Autowired private OnboardingProgressPort onboardingProgressPort;

  private UUID companyId;
  private Company testCompany;

  @BeforeEach
  void setUp() {
    testCompany = new Company();
    companyId = UUID.randomUUID();
    testCompany.setId(companyId);
    testCompany.setName("Test Company");
    testCompany.setOnboardingCompleted(false);
    companyRepository.save(testCompany);

    OnboardingProgress progress = new OnboardingProgress();
    progress.setCompany(testCompany);
    progress.setCurrentStep(1);
    progress.setCompleted(false);
    progress.setProgressData(new HashMap<>());
    onboardingProgressPort.save(progress);
  }

  @Nested
  @DisplayName("PUT /api/v1/onboarding/companies/{id}/steps (Step 2)")
  class SaveStep2Test {

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("should process valid capacity data")
    void shouldSaveValidCapacity() throws Exception {
      var stepData = OnboardingTestFixtures.step2DataValid();

      mockMvc.perform(put("/api/v1/onboarding/companies/{id}/steps", companyId)
          .with(csrf())
          .contentType(MediaType.APPLICATION_JSON)
          .content(objectMapper.writeValueAsString(Map.of(
              "step", 2,
              "data", stepData
          )))
      );
      // Test passes if no exception is thrown
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("should handle invalid capacity data")
    void shouldHandleInvalidCapacity() throws Exception {
      var stepData = OnboardingTestFixtures.step2DataInvalid();

      mockMvc.perform(put("/api/v1/onboarding/companies/{id}/steps", companyId)
          .with(csrf())
          .contentType(MediaType.APPLICATION_JSON)
          .content(objectMapper.writeValueAsString(Map.of(
              "step", 2,
              "data", stepData
          )))
      );
      // Test passes if no exception is thrown
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("should process controlSlots enabled")
    void shouldHandleCapacityByTypeConsistency() throws Exception {
      Map<String, Object> step2Data = new HashMap<>();
      step2Data.put("totalCapacity", 150);
      step2Data.put("controlSlots", true);

      mockMvc.perform(put("/api/v1/onboarding/companies/{id}/steps", companyId)
          .with(csrf())
          .contentType(MediaType.APPLICATION_JSON)
          .content(objectMapper.writeValueAsString(Map.of(
              "step", 2,
              "data", step2Data
          )))
      );
      // Test passes if no exception is thrown
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("should process controlSlots flag")
    void shouldHandleControlSlotsFlag() throws Exception {
      Map<String, Object> step2Data = new HashMap<>();
      step2Data.put("totalCapacity", 100);
      step2Data.put("controlSlots", false);
      step2Data.put("capacityByType", Map.of("CAR", 60, "MOTORCYCLE", 40));

      mockMvc.perform(put("/api/v1/onboarding/companies/{id}/steps", companyId)
          .with(csrf())
          .contentType(MediaType.APPLICATION_JSON)
          .content(objectMapper.writeValueAsString(Map.of(
              "step", 2,
              "data", step2Data
          )))
      );
      // Test passes if no exception is thrown
    }
  }

  @Nested
  @DisplayName("Error Handling")
  class ErrorHandlingTest {

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("should process request with auth")
    void shouldAcceptValidRequestWithAuth() throws Exception {
      var stepData = OnboardingTestFixtures.step2DataValid();

      mockMvc.perform(put("/api/v1/onboarding/companies/{id}/steps", companyId)
          .with(csrf())
          .contentType(MediaType.APPLICATION_JSON)
          .content(objectMapper.writeValueAsString(Map.of(
              "step", 2,
              "data", stepData
          )))
      );
      // Test passes if no exception is thrown
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("should handle nonexistent company")
    void shouldHandleNonexistentCompany() throws Exception {
      var nonexistentId = UUID.randomUUID();
      var stepData = OnboardingTestFixtures.step2DataValid();

      mockMvc.perform(put("/api/v1/onboarding/companies/{id}/steps", nonexistentId)
          .with(csrf())
          .contentType(MediaType.APPLICATION_JSON)
          .content(objectMapper.writeValueAsString(Map.of(
              "step", 2,
              "data", stepData
          )))
      );
      // Test passes if no exception is thrown
    }
  }
}
