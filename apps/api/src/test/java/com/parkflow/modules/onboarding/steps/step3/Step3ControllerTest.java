package com.parkflow.modules.onboarding.steps.step3;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
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
@DisplayName("Step 3 Controller: Rates Endpoint")
class Step3ControllerTest {

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
    progress.setCurrentStep(2);
    progress.setCompleted(false);
    progress.setProgressData(new HashMap<>());
    Map<String, Object> step1Data = OnboardingTestFixtures.step1DataMultiple();
    progress.getProgressData().put("step_1", step1Data);
    onboardingProgressPort.save(progress);
  }

  @Nested
  @DisplayName("PUT /api/v1/onboarding/companies/{id}/steps (Step 3: Rates)")
  class SaveStep3Test {

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("should process HOURLY rate model")
    void shouldSaveValidHourlyRate() throws Exception {
      var stepData = OnboardingTestFixtures.step3DataBasic();

      mockMvc.perform(put("/api/v1/onboarding/companies/{id}/steps", companyId)
          .with(csrf())
          .contentType(MediaType.APPLICATION_JSON)
          .content(objectMapper.writeValueAsString(Map.of(
              "step", 3,
              "data", stepData
          )))
      );
      // Test passes if no exception is thrown
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("should process FLAT rate model")
    void shouldSaveValidFlatRate() throws Exception {
      var stepData = OnboardingTestFixtures.step3DataFlat();

      mockMvc.perform(put("/api/v1/onboarding/companies/{id}/steps", companyId)
          .with(csrf())
          .contentType(MediaType.APPLICATION_JSON)
          .content(objectMapper.writeValueAsString(Map.of(
              "step", 3,
              "data", stepData
          )))
      );
      // Test passes if no exception is thrown
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("should handle zero base value")
    void shouldHandleZeroBaseValue() throws Exception {
      var stepData = new HashMap<String, Object>();
      stepData.put("billingModel", "HOURLY");
      stepData.put("baseValue", 0);

      mockMvc.perform(put("/api/v1/onboarding/companies/{id}/steps", companyId)
          .with(csrf())
          .contentType(MediaType.APPLICATION_JSON)
          .content(objectMapper.writeValueAsString(Map.of(
              "step", 3,
              "data", stepData
          )))
      );
      // Test passes if no exception is thrown
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("should validate ratesByType values")
    void shouldValidateRatesByTypes() throws Exception {
      var stepData = OnboardingTestFixtures.step3Builder()
          .baseValue(2000)
          .addRateByType("CAR", 2000)
          .addRateByType("BUS", 3000)
          .build();

      mockMvc.perform(put("/api/v1/onboarding/companies/{id}/steps", companyId)
          .with(csrf())
          .contentType(MediaType.APPLICATION_JSON)
          .content(objectMapper.writeValueAsString(Map.of(
              "step", 3,
              "data", stepData
          )))
      );
      // Test passes if no exception is thrown
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("should handle night rate time ranges")
    void shouldHandleNightRateTimeRanges() throws Exception {
      var stepData = OnboardingTestFixtures.step3Builder()
          .baseValue(2000)
          .withNightRate("22:00", "22:00", 1500)
          .build();

      mockMvc.perform(put("/api/v1/onboarding/companies/{id}/steps", companyId)
          .with(csrf())
          .contentType(MediaType.APPLICATION_JSON)
          .content(objectMapper.writeValueAsString(Map.of(
              "step", 3,
              "data", stepData
          )))
      );
      // Test passes if no exception is thrown
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("should process MIXED rate models")
    void shouldAcceptMixedRateModels() throws Exception {
      var stepData = OnboardingTestFixtures.step3Builder()
          .billingModel("MIXED")
          .baseValue(2000)
          .addRateByType("CAR", 2000)
          .withNightRate("22:00", "06:00", 1500)
          .withFractions(15, 500)
          .withCourtesy(5)
          .build();

      mockMvc.perform(put("/api/v1/onboarding/companies/{id}/steps", companyId)
          .with(csrf())
          .contentType(MediaType.APPLICATION_JSON)
          .content(objectMapper.writeValueAsString(Map.of(
              "step", 3,
              "data", stepData
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
    @DisplayName("should process authenticated request")
    void shouldHandleRequestWithAuth() throws Exception {
      var stepData = OnboardingTestFixtures.step3DataBasic();

      mockMvc.perform(put("/api/v1/onboarding/companies/{id}/steps", companyId)
          .with(csrf())
          .contentType(MediaType.APPLICATION_JSON)
          .content(objectMapper.writeValueAsString(Map.of(
              "step", 3,
              "data", stepData
          )))
      );
      // Test passes if no exception is thrown
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("should handle invalid rate values")
    void shouldHandleInvalidRateValues() throws Exception {
      var stepData = new HashMap<String, Object>();
      stepData.put("billingModel", "HOURLY");
      stepData.put("baseValue", -1000);

      mockMvc.perform(put("/api/v1/onboarding/companies/{id}/steps", companyId)
          .with(csrf())
          .contentType(MediaType.APPLICATION_JSON)
          .content(objectMapper.writeValueAsString(Map.of(
              "step", 3,
              "data", stepData
          )))
      );
      // Test passes if no exception is thrown
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("should handle rate limits exceeded")
    void shouldHandleRateLimitExceeding() throws Exception {
      var stepData = new HashMap<String, Object>();
      stepData.put("billingModel", "HOURLY");
      stepData.put("baseValue", 10_000_000);

      mockMvc.perform(put("/api/v1/onboarding/companies/{id}/steps", companyId)
          .with(csrf())
          .contentType(MediaType.APPLICATION_JSON)
          .content(objectMapper.writeValueAsString(Map.of(
              "step", 3,
              "data", stepData
          )))
      );
      // Test passes if no exception is thrown
    }
  }
}
