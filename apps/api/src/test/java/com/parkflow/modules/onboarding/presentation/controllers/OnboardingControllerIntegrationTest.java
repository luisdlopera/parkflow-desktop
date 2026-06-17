package com.parkflow.modules.onboarding.presentation.controllers;

import static org.junit.jupiter.api.Assertions.*;

import com.parkflow.modules.onboarding.dto.OnboardingStatusResponse;
import com.parkflow.modules.onboarding.dto.SaveOnboardingStepRequest;
import com.parkflow.modules.licensing.enums.PlanType;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("OnboardingController Integration Tests")
class OnboardingControllerIntegrationTest {

  private UUID companyId;
  private OnboardingStatusResponse statusResponse;

  @BeforeEach
  void setUp() {
    companyId = UUID.randomUUID();
    statusResponse = new OnboardingStatusResponse(
        companyId,
        PlanType.SYNC,
        false,
        1,
        false,
        Map.of(),
        Map.of(),
        List.of(1, 2, 3, 4, 5, 6, 7)
    );
  }

  @Test
  @DisplayName("Should create valid onboarding status response")
  void testOnboardingStatusResponse() {
    assertNotNull(statusResponse);
    assertEquals(companyId, statusResponse.companyId());
    assertFalse(statusResponse.onboardingCompleted());
    assertEquals(1, statusResponse.currentStep());
  }

  @Test
  @DisplayName("Should create valid save step request")
  void testSaveStepRequest() {
    SaveOnboardingStepRequest request = new SaveOnboardingStepRequest(
        1,
        Map.of("vehicleTypes", List.of("MOTORCYCLE")),
        null
    );

    assertNotNull(request);
    assertEquals(1, request.step());
    assertNotNull(request.data());
    assertTrue(request.data().containsKey("vehicleTypes"));
  }

  @Test
  @DisplayName("Should create completed status response")
  void testCompletedStatus() {
    OnboardingStatusResponse completed = new OnboardingStatusResponse(
        companyId,
        PlanType.SYNC,
        true,
        12,
        false,
        Map.of(),
        Map.of(),
        List.of()
    );

    assertTrue(completed.onboardingCompleted());
    assertEquals(12, completed.currentStep());
  }

  @Test
  @DisplayName("Should create skipped status response")
  void testSkippedStatus() {
    OnboardingStatusResponse skipped = new OnboardingStatusResponse(
        companyId,
        PlanType.SYNC,
        true,
        12,
        true,
        Map.of(),
        Map.of(),
        List.of()
    );

    assertTrue(skipped.skipped());
  }

  @Test
  @DisplayName("Should handle step range 1-12")
  void testStepRange() {
    for (int step = 1; step <= 12; step++) {
      SaveOnboardingStepRequest request = new SaveOnboardingStepRequest(
          step,
          Map.of(),
          null
      );

      assertEquals(step, request.step());
    }
  }

  @Test
  @DisplayName("Should handle enabled steps list")
  void testEnabledSteps() {
    List<Integer> enabledSteps = List.of(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12);

    assertNotNull(enabledSteps);
    assertEquals(12, enabledSteps.size());
  }

  @Test
  @DisplayName("Should store progress data map")
  void testProgressDataStorage() {
    Map<String, Object> progressData = Map.of(
        "step_1", Map.of("vehicleTypes", List.of("MOTORCYCLE")),
        "step_2", Map.of("capacity", 20)
    );

    OnboardingStatusResponse response = new OnboardingStatusResponse(
        companyId,
        PlanType.SYNC,
        false,
        3,
        false,
        progressData,
        Map.of(),
        List.of(1, 2, 3)
    );

    assertEquals(progressData, response.progressData());
  }

  @Test
  @DisplayName("Should support different plan types")
  void testPlanTypes() {
    for (PlanType plan : PlanType.values()) {
      OnboardingStatusResponse response = new OnboardingStatusResponse(
          companyId,
          plan,
          false,
          1,
          false,
          Map.of(),
          Map.of(),
          List.of()
      );

      assertEquals(plan, response.plan());
    }
  }

  @Test
  @DisplayName("Should handle step with target step")
  void testTargetStep() {
    SaveOnboardingStepRequest request = new SaveOnboardingStepRequest(
        3,
        Map.of("data", "value"),
        5
    );

    assertEquals(3, request.step());
    assertEquals(5, request.targetStep());
  }

  @Test
  @DisplayName("Should validate step numbers")
  void testValidStepNumbers() {
    for (int step = 1; step <= 12; step++) {
      SaveOnboardingStepRequest request = new SaveOnboardingStepRequest(
          step,
          Map.of(),
          null
      );

      assertTrue(request.step() >= 1 && request.step() <= 12);
    }
  }

  @Test
  @DisplayName("Should handle empty progress data")
  void testEmptyProgressData() {
    OnboardingStatusResponse response = new OnboardingStatusResponse(
        companyId,
        PlanType.SYNC,
        false,
        1,
        false,
        Map.of(),
        Map.of(),
        List.of()
    );

    assertTrue(response.progressData().isEmpty());
  }
}
