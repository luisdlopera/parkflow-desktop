package com.parkflow.modules.onboarding.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.parkflow.modules.common.exception.OperationException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

/**
 * Unit tests for {@link Step3DataValidator}.
 *
 * <p>Covers audit findings:
 * <ul>
 *   <li>C-01: ratesByType keys must be ⊆ vehicleTypes</li>
 *   <li>C-04: Night rate time range validation and full-day overlap</li>
 *   <li>I-07: Monetary values must be > 0</li>
 *   <li>S-03: Whitelist enforcement (no unknown fields)</li>
 * </ul>
 */
@DisplayName("Step3DataValidator")
class Step3DataValidatorTest {

  private Step3DataValidator validator;

  @BeforeEach
  void setUp() {
    com.parkflow.modules.pricing.validation.PricingValidationEngine engine = 
        new com.parkflow.modules.pricing.validation.PricingValidationEngine(List.of(
            new com.parkflow.modules.pricing.validation.NightTimeRangeRule(),
            new com.parkflow.modules.pricing.validation.FullDayNightOverlapRule(),
            new com.parkflow.modules.pricing.validation.NightPriceRule()
        ));
    validator = new Step3DataValidator(engine);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // C-01: ratesByType cross-step consistency
  // ─────────────────────────────────────────────────────────────────────────

  @Nested
  @DisplayName("validateWithVehicleTypes - C-01 cross-step consistency")
  class RatesByTypeCrossStepTest {

    @Test
    @DisplayName("should pass when ratesByType keys are subset of vehicleTypes")
    void shouldPassForValidRatesByType() {
      Map<String, Object> data = new HashMap<>();
      data.put("billingModel", "HOURLY");
      data.put("baseValue", 2000);
      data.put("ratesByType", Map.of("CAR", 2000, "MOTORCYCLE", 1000));

      var result = validator.validateWithVehicleTypes(data, List.of("CAR", "MOTORCYCLE"));

      assertThat(result.isValid).isTrue();
      assertThat(result.errors).isEmpty();
    }

    @Test
    @DisplayName("should fail when TRUCK not in vehicleTypes (C-01 attack scenario)")
    void shouldFailForOrphanedVehicleTypeInRates() {
      // C-01 attack: step1=[CAR], step3.ratesByType={CAR:2000, TRUCK:3000}
      Map<String, Object> data = new HashMap<>();
      data.put("billingModel", "HOURLY");
      data.put("baseValue", 2000);
      data.put("ratesByType", Map.of("CAR", 2000, "TRUCK", 3000));

      var result = validator.validateWithVehicleTypes(data, List.of("CAR"));

      assertThat(result.isValid).isFalse();
      assertThat(result.errors).containsKey("ratesByType");
      assertThat(result.errors.get("ratesByType")).contains("TRUCK");
    }

    @Test
    @DisplayName("should skip cross-step check when vehicleTypes list is empty")
    void shouldSkipCheckWhenVehicleTypesEmpty() {
      Map<String, Object> data = new HashMap<>();
      data.put("billingModel", "HOURLY");
      data.put("baseValue", 2000);
      data.put("ratesByType", Map.of("TRUCK", 3000));

      // No vehicleTypes context → skip C-01 check
      var result = validator.validateWithVehicleTypes(data, List.of());

      assertThat(result.isValid).isTrue();
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // C-04: Night rate time range validation
  // ─────────────────────────────────────────────────────────────────────────

  @Nested
  @DisplayName("Night rate time range validation - C-04")
  class NightRateTimeRangeTest {

    @Test
    @DisplayName("should pass for valid cross-midnight range")
    void shouldPassForCrossMidnightRange() {
      Map<String, Object> data = new HashMap<>();
      data.put("billingModel", "HOURLY");
      data.put("baseValue", 2000);
      data.put("hasNightRate", true);
      data.put("nightRate", 1500);
      data.put("nightStartTime", "22:00");
      data.put("nightEndTime", "06:00");

      var result = validator.validate(data);

      assertThat(result.isValid).isTrue();
    }

    @Test
    @DisplayName("should fail when nightStartTime equals nightEndTime (C-04)")
    void shouldFailWhenStartEqualsEnd() {
      Map<String, Object> data = new HashMap<>();
      data.put("billingModel", "HOURLY");
      data.put("baseValue", 2000);
      data.put("hasNightRate", true);
      data.put("nightRate", 1500);
      data.put("nightStartTime", "22:00");
      data.put("nightEndTime", "22:00");

      var result = validator.validate(data);

      assertThat(result.isValid).isFalse();
      assertThat(result.errors).containsKey("nightStartTime");
    }

    @Test
    @DisplayName("should fail for missing nightStartTime when hasNightRate=true")
    void shouldFailForMissingStartTime() {
      Map<String, Object> data = new HashMap<>();
      data.put("billingModel", "HOURLY");
      data.put("baseValue", 2000);
      data.put("hasNightRate", true);
      data.put("nightRate", 1500);
      data.put("nightEndTime", "06:00");
      // nightStartTime missing

      var result = validator.validate(data);

      assertThat(result.isValid).isFalse();
      assertThat(result.errors).containsKey("nightStartTime");
    }

    @Test
    @DisplayName("should fail for FULL_DAY billing model with night rate (C-04 overlap)")
    void shouldFailForFullDayModelWithNightRate() {
      Map<String, Object> data = new HashMap<>();
      data.put("billingModel", "FULL_DAY");
      data.put("flatRate", 15000);
      data.put("hasNightRate", true);
      data.put("nightRate", 1500);
      data.put("nightStartTime", "22:00");
      data.put("nightEndTime", "06:00");

      var result = validator.validate(data);

      assertThat(result.isValid).isFalse();
      assertThat(result.errors).containsKey("hasNightRate");
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // I-07: Monetary values must be > 0
  // ─────────────────────────────────────────────────────────────────────────

  @Nested
  @DisplayName("Monetary value validation - I-07")
  class MonetaryValueTest {

    @Test
    @DisplayName("should fail for zero baseValue (I-07)")
    void shouldFailForZeroBaseValue() {
      Map<String, Object> data = new HashMap<>();
      data.put("billingModel", "HOURLY");
      data.put("baseValue", 0);

      var result = validator.validate(data);

      assertThat(result.isValid).isFalse();
      assertThat(result.errors).containsKey("baseValue");
    }

    @Test
    @DisplayName("should fail for negative rate value")
    void shouldFailForNegativeRate() {
      Map<String, Object> data = new HashMap<>();
      data.put("billingModel", "HOURLY");
      data.put("baseValue", -500);

      var result = validator.validate(data);

      assertThat(result.isValid).isFalse();
      assertThat(result.errors).containsKey("baseValue");
    }

    @Test
    @DisplayName("should fail when rate exceeds MAX_RATE_VALUE")
    void shouldFailForRateExceedingMax() {
      Map<String, Object> data = new HashMap<>();
      data.put("billingModel", "HOURLY");
      data.put("baseValue", 10_000_000);

      var result = validator.validate(data);

      assertThat(result.isValid).isFalse();
      assertThat(result.errors).containsKey("baseValue");
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // S-03: Whitelist enforcement
  // ─────────────────────────────────────────────────────────────────────────

  @Nested
  @DisplayName("Whitelist enforcement - S-03")
  class WhitelistTest {

    @Test
    @DisplayName("should strip unknown fields not in whitelist")
    void shouldStripUnknownFields() {
      Map<String, Object> data = new HashMap<>();
      data.put("billingModel", "HOURLY");
      data.put("baseValue", 2000);
      data.put("hackerField", "maliciousData");    // Should be stripped
      data.put("adminSecret", "bypass");           // Should be stripped

      var result = validator.validate(data);

      assertThat(result.isValid).isTrue();
      assertThat(result.sanitizedData).doesNotContainKey("hackerField");
      assertThat(result.sanitizedData).doesNotContainKey("adminSecret");
      assertThat(result.sanitizedData).containsKey("billingModel");
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Edge cases
  // ─────────────────────────────────────────────────────────────────────────

  @Nested
  @DisplayName("Edge cases")
  class EdgeCaseTest {

    @Test
    @DisplayName("should pass for empty data")
    void shouldPassForEmptyData() {
      var result = validator.validate(Map.of());

      assertThat(result.isValid).isTrue();
    }

    @Test
    @DisplayName("should pass for null data")
    void shouldPassForNullData() {
      var result = validator.validate(null);

      assertThat(result.isValid).isTrue();
    }

    @Test
    @DisplayName("should pass for valid MIXED billing model")
    void shouldPassForMixedBillingModel() {
      Map<String, Object> data = new HashMap<>();
      data.put("billingModel", "MIXED");
      data.put("baseValue", 1500);

      var result = validator.validate(data);

      assertThat(result.isValid).isTrue();
    }
  }
}
