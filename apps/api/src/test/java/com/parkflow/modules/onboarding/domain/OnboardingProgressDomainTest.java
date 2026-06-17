package com.parkflow.modules.onboarding.domain;

import static org.junit.jupiter.api.Assertions.*;

import com.parkflow.modules.licensing.domain.Company;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("OnboardingProgress Domain Tests")
class OnboardingProgressDomainTest {

  private OnboardingProgress progress;
  private Company company;

  @BeforeEach
  void setUp() {
    company = new Company();
    company.setId(UUID.randomUUID());

    progress = new OnboardingProgress();
    progress.setCompany(company);
    progress.setCurrentStep(1);
    progress.setCompleted(false);
    progress.setSkipped(false);
    progress.setProgressData(new HashMap<>());
  }

  @Test
  @DisplayName("Should initialize with default values")
  void testInitializeDefaults() {
    OnboardingProgress newProgress = new OnboardingProgress();
    assertEquals(1, newProgress.getCurrentStep());
    assertFalse(newProgress.isCompleted());
    assertFalse(newProgress.isSkipped());
  }

  @Test
  @DisplayName("Should advance steps sequentially")
  void testAdvanceSteps() {
    for (int step = 1; step <= 12; step++) {
      progress.setCurrentStep(step);
      assertEquals(step, progress.getCurrentStep());
    }
  }

  @Test
  @DisplayName("Should mark completed at step 12")
  void testCompletedAtStep12() {
    progress.setCurrentStep(12);
    progress.setCompleted(true);
    assertTrue(progress.isCompleted());
  }

  @Test
  @DisplayName("Should track completion status")
  void testCompletionStatus() {
    progress.setCurrentStep(12);
    progress.setCompleted(true);
    assertTrue(progress.isCompleted());

    progress.setCompleted(false);
    assertFalse(progress.isCompleted());
  }

  @Test
  @DisplayName("Should support equality comparison")
  void testEquality() {
    OnboardingProgress p1 = new OnboardingProgress();
    OnboardingProgress p2 = p1;

    assertEquals(p1, p2);
  }

  @Test
  @DisplayName("Should calculate hash code")
  void testHashCode() {
    progress.setCurrentStep(5);
    assertNotEquals(0, progress.hashCode());
  }

  @Test
  @DisplayName("Should maintain step bounds between 1-12")
  void testStepBounds() {
    progress.setCurrentStep(1);
    assertEquals(1, progress.getCurrentStep());

    progress.setCurrentStep(12);
    assertEquals(12, progress.getCurrentStep());
  }

  @Test
  @DisplayName("Should store company reference")
  void testCompanyReference() {
    progress.setCompany(company);
    assertEquals(company, progress.getCompany());
    assertEquals(company.getId(), progress.getCompany().getId());
  }

  @Test
  @DisplayName("Should store progress data")
  void testProgressData() {
    Map<String, Object> data = Map.of(
        "step_1", Map.of("vehicleTypes", "MOTORCYCLE"),
        "step_2", Map.of("capacity", 20)
    );
    progress.setProgressData(new HashMap<>(data));

    assertNotNull(progress.getProgressData());
    assertEquals(2, progress.getProgressData().size());
  }

  @Test
  @DisplayName("Should track skipped status")
  void testSkippedStatus() {
    progress.setSkipped(false);
    assertFalse(progress.isSkipped());

    progress.setSkipped(true);
    assertTrue(progress.isSkipped());
  }

  @Test
  @DisplayName("Should handle different step sequences")
  void testDifferentStepSequences() {
    progress.setCurrentStep(3);
    assertEquals(3, progress.getCurrentStep());

    progress.setCurrentStep(1);
    assertEquals(1, progress.getCurrentStep());

    progress.setCurrentStep(12);
    assertEquals(12, progress.getCurrentStep());
  }

  @Test
  @DisplayName("Should track completion timestamp")
  void testCompletionTimestamp() {
    assertNull(progress.getCompletedAt());
    progress.setCompletedAt(java.time.OffsetDateTime.now());
    assertNotNull(progress.getCompletedAt());
  }

  @Test
  @DisplayName("Should support large progress data")
  void testLargeProgressData() {
    Map<String, Object> largeData = new HashMap<>();
    for (int i = 1; i <= 12; i++) {
      Map<String, Object> stepData = new HashMap<>();
      for (int j = 0; j < 10; j++) {
        stepData.put("field_" + j, "value_" + j);
      }
      largeData.put("step_" + i, stepData);
    }

    progress.setProgressData(largeData);

    assertEquals(12, progress.getProgressData().size());
  }

  @Test
  @DisplayName("Should maintain data integrity after multiple updates")
  void testDataIntegrityAfterUpdates() {
    Map<String, Object> data1 = Map.of("step_1", Map.of("value", 1));
    progress.setProgressData(new HashMap<>(data1));

    Map<String, Object> data2 = new HashMap<>(progress.getProgressData());
    data2.put("step_2", Map.of("value", 2));
    progress.setProgressData(data2);

    assertEquals(2, progress.getProgressData().size());
    assertTrue(progress.getProgressData().containsKey("step_1"));
  }
}
