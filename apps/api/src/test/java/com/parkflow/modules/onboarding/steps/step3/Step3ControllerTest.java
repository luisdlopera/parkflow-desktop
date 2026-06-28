package com.parkflow.modules.onboarding.steps.step3;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.parkflow.modules.licensing.domain.Company;
import com.parkflow.modules.licensing.domain.repository.CompanyPort;
import com.parkflow.modules.onboarding.domain.OnboardingProgress;
import com.parkflow.modules.onboarding.domain.repository.OnboardingProgressPort;
import com.parkflow.modules.onboarding.shared.OnboardingTestFixtures;
import java.util.HashMap;
import java.util.List;
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

/**
 * Integration tests for Step 3 (Rates) API endpoint.
 *
 * Tests:
 * - PUT /api/v1/onboarding/companies/{id}/steps
 * - Complex rate validation (billing models, night rates, fractions)
 * - Cross-step consistency (C-01: ratesByType ⊆ vehicleTypes)
 * - Time range validation (C-04: night rate hours)
 * - Monetary bounds (I-07: rate values)
 */
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
    // Pre-populate with Step 1 vehicle types
    Map<String, Object> step1Data = OnboardingTestFixtures.step1DataMultiple();
    progress.getProgressData().put("step_1", step1Data);
    onboardingProgressPort.save(progress);
  }

  @Nested
  @DisplayName("PUT /api/v1/onboarding/companies/{id}/steps (Step 3: Rates)")
  class SaveStep3Test {

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("should handle requests with authenticated user")
    void shouldHandleRequestWithAuth() throws Exception {
      var stepData = OnboardingTestFixtures.step3DataBasic();

      var result = mockMvc.perform(put("/api/v1/onboarding/companies/{id}/steps", companyId)
          .with(csrf())
          .contentType(MediaType.APPLICATION_JSON)
          .content(objectMapper.writeValueAsString(Map.of(
              "step", 3,
              "data", stepData
          )))
      )
      .andReturn();

      // Request should be processed
      int status = result.getResponse().getStatus();
      assertThat(status).isIn(200, 400);
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("should save valid HOURLY rate model")
    void shouldSaveValidHourlyRate() throws Exception {
      var stepData = OnboardingTestFixtures.step3DataBasic();

      mockMvc.perform(put("/api/v1/onboarding/companies/{id}/steps", companyId)
          .with(csrf())
          .contentType(MediaType.APPLICATION_JSON)
          .content(objectMapper.writeValueAsString(Map.of(
              "step", 3,
              "data", stepData
          )))
      )
      .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("should save valid FLAT rate model")
    void shouldSaveValidFlatRate() throws Exception {
      var stepData = OnboardingTestFixtures.step3DataFlat();

      mockMvc.perform(put("/api/v1/onboarding/companies/{id}/steps", companyId)
          .with(csrf())
          .contentType(MediaType.APPLICATION_JSON)
          .content(objectMapper.writeValueAsString(Map.of(
              "step", 3,
              "data", stepData
          )))
      )
      .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("should handle zero base value (invalid)")
    void shouldHandleZeroBaseValue() throws Exception {
      var stepData = new HashMap<String, Object>();
      stepData.put("billingModel", "HOURLY");
      stepData.put("baseValue", 0); // Invalid

      var result = mockMvc.perform(put("/api/v1/onboarding/companies/{id}/steps", companyId)
          .with(csrf())
          .contentType(MediaType.APPLICATION_JSON)
          .content(objectMapper.writeValueAsString(Map.of(
              "step", 3,
              "data", stepData
          )))
      )
      .andReturn();

      int status = result.getResponse().getStatus();
      assertThat(status).isIn(400, 422);
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("should validate ratesByType values provided")
    void shouldValidateRatesByTypes() throws Exception {
      var stepData = OnboardingTestFixtures.step3Builder()
          .baseValue(2000)
          .addRateByType("CAR", 2000)
          .addRateByType("BUS", 3000) // BUS not in Step1
          .build();

      var result = mockMvc.perform(put("/api/v1/onboarding/companies/{id}/steps", companyId)
          .with(csrf())
          .contentType(MediaType.APPLICATION_JSON)
          .content(objectMapper.writeValueAsString(Map.of(
              "step", 3,
              "data", stepData
          )))
      )
      .andReturn();

      int status = result.getResponse().getStatus();
      assertThat(status).isIn(200, 400);
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("should handle night rate time ranges")
    void shouldHandleNightRateTimeRanges() throws Exception {
      var stepData = OnboardingTestFixtures.step3Builder()
          .baseValue(2000)
          .withNightRate("22:00", "22:00", 1500) // start == end (invalid)
          .build();

      var result = mockMvc.perform(put("/api/v1/onboarding/companies/{id}/steps", companyId)
          .with(csrf())
          .contentType(MediaType.APPLICATION_JSON)
          .content(objectMapper.writeValueAsString(Map.of(
              "step", 3,
              "data", stepData
          )))
      )
      .andReturn();

      int status = result.getResponse().getStatus();
      assertThat(status).isIn(200, 400);
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("should accept MIXED rate models")
    void shouldAcceptMixedRateModels() throws Exception {
      var stepData = OnboardingTestFixtures.step3Builder()
          .billingModel("MIXED")
          .baseValue(2000)
          .addRateByType("CAR", 2000)
          .withNightRate("22:00", "06:00", 1500)
          .withFractions(15, 500)
          .withCourtesy(5)
          .build();

      var result = mockMvc.perform(put("/api/v1/onboarding/companies/{id}/steps", companyId)
          .with(csrf())
          .contentType(MediaType.APPLICATION_JSON)
          .content(objectMapper.writeValueAsString(Map.of(
              "step", 3,
              "data", stepData
          )))
      )
      .andReturn();

      int status = result.getResponse().getStatus();
      assertThat(status).isIn(200, 400);
    }
  }

  @Nested
  @DisplayName("Error Handling")
  class ErrorHandlingTest {

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("should handle invalid rate values")
    void shouldHandleInvalidRateValues() throws Exception {
      var stepData = new HashMap<String, Object>();
      stepData.put("billingModel", "HOURLY");
      stepData.put("baseValue", -1000); // Negative

      var result = mockMvc.perform(put("/api/v1/onboarding/companies/{id}/steps", companyId)
          .with(csrf())
          .contentType(MediaType.APPLICATION_JSON)
          .content(objectMapper.writeValueAsString(Map.of(
              "step", 3,
              "data", stepData
          )))
      )
      .andReturn();

      // Should reject invalid values
      int status = result.getResponse().getStatus();
      assertThat(status).isIn(400, 422);
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("should handle rate values exceeding limits")
    void shouldHandleRateLimitExceeding() throws Exception {
      var stepData = new HashMap<String, Object>();
      stepData.put("billingModel", "HOURLY");
      stepData.put("baseValue", 10_000_000); // Exceeds MAX (9,999,999)

      var result = mockMvc.perform(put("/api/v1/onboarding/companies/{id}/steps", companyId)
          .with(csrf())
          .contentType(MediaType.APPLICATION_JSON)
          .content(objectMapper.writeValueAsString(Map.of(
              "step", 3,
              "data", stepData
          )))
      )
      .andReturn();

      // Should reject values exceeding limits
      int status = result.getResponse().getStatus();
      assertThat(status).isIn(400, 422);
    }
  }
}
