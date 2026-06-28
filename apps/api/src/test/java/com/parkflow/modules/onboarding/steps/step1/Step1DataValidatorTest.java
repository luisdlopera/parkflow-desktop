package com.parkflow.modules.onboarding.steps.step1;

import static org.assertj.core.api.Assertions.*;

import com.parkflow.modules.onboarding.application.service.Step1DataValidator;
import com.parkflow.modules.onboarding.shared.OnboardingTestFixtures;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

/**
 * Unit tests for Step 1 (Vehicle Types) validation.
 *
 * Covers:
 * - Vehicle type selection (required, ≥1)
 * - Helmet handling (required if MOTORCYCLE selected)
 * - Helmet token count bounds [1, 9999]
 */
@DisplayName("Step 1: Vehicle Types Validator")
class Step1DataValidatorTest {

  private Step1DataValidator validator;

  @BeforeEach
  void setUp() {
    validator = new Step1DataValidator();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Vehicle Type Selection Tests
  // ─────────────────────────────────────────────────────────────────────────

  @Nested
  @DisplayName("Vehicle Type Selection")
  class VehicleTypeSelectionTests {

    @Test
    @DisplayName("should accept single vehicle type (CAR)")
    void shouldAcceptSingleVehicleType() {
      var data = OnboardingTestFixtures.step1DataValid();
      var result = validator.validate(data);

      assertThat(result.isValid()).isTrue();
      assertThat(result.getErrors()).isEmpty();
    }

    @Test
    @DisplayName("should accept multiple vehicle types")
    void shouldAcceptMultipleVehicleTypes() {
      var data = OnboardingTestFixtures.step1DataMultiple();
      var result = validator.validate(data);

      assertThat(result.isValid()).isTrue();
      assertThat(result.getErrors()).isEmpty();
    }

    @Test
    @DisplayName("should reject empty vehicle types list")
    void shouldRejectEmpty() {
      var data = OnboardingTestFixtures.step1DataEmpty();
      var result = validator.validate(data);

      assertThat(result.isValid()).isFalse();
      assertThat(result.getErrors()).containsKey("vehicleTypes");
    }

    @Test
    @DisplayName("should accept null data")
    void shouldAcceptNull() {
      var result = validator.validate(null);

      assertThat(result.isValid()).isTrue();
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Helmet Handling Tests (Motorcycle-specific)
  // ─────────────────────────────────────────────────────────────────────────

  @Nested
  @DisplayName("Helmet Handling (Motorcycle-specific)")
  class HelmetHandlingTests {

    @Test
    @DisplayName("should require helmet handling when MOTORCYCLE selected")
    void shouldRequireHelmetHandlingForMotorcycle() {
      Map<String, Object> data = new HashMap<>();
      data.put("vehicleTypes", List.of("MOTORCYCLE"));
      var result = validator.validate(data);

      assertThat(result.isValid()).isFalse();
      assertThat(result.getErrors()).containsKey("helmetHandling");
    }

    @Test
    @DisplayName("should accept LOCKERS helmet handling")
    void shouldAcceptLockers() {
      Map<String, Object> data = new HashMap<>();
      data.put("vehicleTypes", List.of("MOTORCYCLE"));
      data.put("helmetHandling", "LOCKERS");
      data.put("helmetTokenCount", 50);
      var result = validator.validate(data);

      assertThat(result.isValid()).isTrue();
      assertThat(result.getErrors()).isEmpty();
    }

    @Test
    @DisplayName("should accept NONE helmet handling")
    void shouldAcceptNone() {
      Map<String, Object> data = new HashMap<>();
      data.put("vehicleTypes", List.of("MOTORCYCLE"));
      data.put("helmetHandling", "NONE");
      var result = validator.validate(data);

      assertThat(result.isValid()).isTrue();
      assertThat(result.getErrors()).isEmpty();
    }

    @Test
    @DisplayName("should not require helmet handling for CAR")
    void shouldNotRequireHelmetForCar() {
      Map<String, Object> data = new HashMap<>();
      data.put("vehicleTypes", List.of("CAR"));
      var result = validator.validate(data);

      assertThat(result.isValid()).isTrue();
      assertThat(result.getErrors()).isEmpty();
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Helmet Token Count Tests
  // ─────────────────────────────────────────────────────────────────────────

  @Nested
  @DisplayName("Helmet Token Count [1, 9999]")
  class HelmetTokenCountTests {

    @Test
    @DisplayName("should accept valid locker count (50)")
    void shouldAcceptValidCount() {
      var data = OnboardingTestFixtures.step1DataMotorcycle();
      var result = validator.validate(data);

      assertThat(result.isValid()).isTrue();
      assertThat(result.getErrors()).isEmpty();
    }

    @Test
    @DisplayName("should reject zero token count")
    void shouldRejectZero() {
      Map<String, Object> data = new HashMap<>();
      data.put("vehicleTypes", List.of("MOTORCYCLE"));
      data.put("helmetHandling", "LOCKERS");
      data.put("helmetTokenCount", 0);
      var result = validator.validate(data);

      assertThat(result.isValid()).isFalse();
      assertThat(result.getErrors()).containsKey("helmetTokenCount");
    }

    @Test
    @DisplayName("should reject negative token count")
    void shouldRejectNegative() {
      Map<String, Object> data = new HashMap<>();
      data.put("vehicleTypes", List.of("MOTORCYCLE"));
      data.put("helmetHandling", "LOCKERS");
      data.put("helmetTokenCount", -1);
      var result = validator.validate(data);

      assertThat(result.isValid()).isFalse();
      assertThat(result.getErrors()).containsKey("helmetTokenCount");
    }

    @Test
    @DisplayName("should reject token count exceeding 9999")
    void shouldRejectExceedingMax() {
      Map<String, Object> data = new HashMap<>();
      data.put("vehicleTypes", List.of("MOTORCYCLE"));
      data.put("helmetHandling", "LOCKERS");
      data.put("helmetTokenCount", 10000);
      var result = validator.validate(data);

      assertThat(result.isValid()).isFalse();
      assertThat(result.getErrors()).containsKey("helmetTokenCount");
    }

    @Test
    @DisplayName("should accept boundary values (1 and 9999)")
    void shouldAcceptBoundaries() {
      Map<String, Object> data1 = new HashMap<>();
      data1.put("vehicleTypes", List.of("MOTORCYCLE"));
      data1.put("helmetHandling", "LOCKERS");
      data1.put("helmetTokenCount", 1);

      Map<String, Object> data9999 = new HashMap<>();
      data9999.put("vehicleTypes", List.of("MOTORCYCLE"));
      data9999.put("helmetHandling", "LOCKERS");
      data9999.put("helmetTokenCount", 9999);

      assertThat(validator.validate(data1).isValid()).isTrue();
      assertThat(validator.validate(data9999).isValid()).isTrue();
    }
  }
}
