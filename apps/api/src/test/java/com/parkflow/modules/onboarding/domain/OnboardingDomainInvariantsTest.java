package com.parkflow.modules.onboarding.domain;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.parkflow.modules.common.exception.OperationException;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

/**
 * Unit tests for {@link OnboardingDomainInvariants}.
 *
 * <p>Covers audit findings:
 * <ul>
 *   <li>C-01: ratesByType cross-step consistency</li>
 *   <li>C-04: Night rate time range validation</li>
 *   <li>I-01: capacityByType cross-step consistency</li>
 *   <li>I-07: Monetary bounds</li>
 *   <li>E-05: Completed state guard</li>
 * </ul>
 */
@DisplayName("OnboardingDomainInvariants")
class OnboardingDomainInvariantsTest {

  // ─────────────────────────────────────────────────────────────────────────
  // INV-3: Completed state guard (E-05)
  // ─────────────────────────────────────────────────────────────────────────

  @Nested
  @DisplayName("assertNotCompleted")
  class AssertNotCompletedTest {

    @Test
    @DisplayName("should pass when onboarding is not completed")
    void shouldPassWhenNotCompleted() {
      assertThatCode(() -> OnboardingDomainInvariants.assertNotCompleted(false))
          .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("should throw CONFLICT when onboarding is already completed (E-05)")
    void shouldThrowWhenCompleted() {
      assertThatThrownBy(() -> OnboardingDomainInvariants.assertNotCompleted(true))
          .isInstanceOf(OperationException.class)
          .extracting("status")
          .isEqualTo(HttpStatus.CONFLICT);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // INV-1: Cross-step referential integrity for rates (C-01)
  // ─────────────────────────────────────────────────────────────────────────

  @Nested
  @DisplayName("assertRatesByTypeConsistentWithVehicleTypes (C-01)")
  class RatesByTypeConsistencyTest {

    @Test
    @DisplayName("should pass when ratesByType keys are subset of vehicleTypes")
    void shouldPassWhenKeysAreSubset() {
      Map<String, Object> ratesByType = Map.of("CAR", 2000, "MOTORCYCLE", 1000);
      List<String> vehicleTypes = List.of("CAR", "MOTORCYCLE", "BICYCLE");

      assertThatCode(() ->
          OnboardingDomainInvariants.assertRatesByTypeConsistentWithVehicleTypes(ratesByType, vehicleTypes))
          .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("should pass when ratesByType is null")
    void shouldPassWhenRatesByTypeIsNull() {
      assertThatCode(() ->
          OnboardingDomainInvariants.assertRatesByTypeConsistentWithVehicleTypes(null, List.of("CAR")))
          .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("should pass when ratesByType is empty")
    void shouldPassWhenRatesByTypeIsEmpty() {
      assertThatCode(() ->
          OnboardingDomainInvariants.assertRatesByTypeConsistentWithVehicleTypes(Map.of(), List.of("CAR")))
          .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("should throw BAD_REQUEST when TRUCK not in vehicleTypes (C-01 attack scenario)")
    void shouldThrowWhenOrphanedVehicleType() {
      // Attack scenario from audit: step1=[CAR], step3.ratesByType={CAR:2000, TRUCK:3000}
      Map<String, Object> ratesByType = Map.of("CAR", 2000, "TRUCK", 3000);
      List<String> vehicleTypes = List.of("CAR");

      assertThatThrownBy(() ->
          OnboardingDomainInvariants.assertRatesByTypeConsistentWithVehicleTypes(ratesByType, vehicleTypes))
          .isInstanceOf(OperationException.class)
          .extracting("status")
          .isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    @DisplayName("should throw when all ratesByType keys are orphaned")
    void shouldThrowWhenAllKeysOrphaned() {
      Map<String, Object> ratesByType = Map.of("TRUCK", 3000, "BUS", 5000);
      List<String> vehicleTypes = List.of("CAR", "MOTORCYCLE");

      assertThatThrownBy(() ->
          OnboardingDomainInvariants.assertRatesByTypeConsistentWithVehicleTypes(ratesByType, vehicleTypes))
          .isInstanceOf(OperationException.class)
          .extracting("status")
          .isEqualTo(HttpStatus.BAD_REQUEST);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // INV-1: Cross-step referential integrity for capacity (I-01)
  // ─────────────────────────────────────────────────────────────────────────

  @Nested
  @DisplayName("assertCapacityByTypeConsistentWithVehicleTypes (I-01)")
  class CapacityByTypeConsistencyTest {

    @Test
    @DisplayName("should pass when capacityByType keys are subset of vehicleTypes")
    void shouldPassWhenKeysAreSubset() {
      Map<String, Object> capacityByType = Map.of("CAR", 60, "MOTORCYCLE", 30);
      List<String> vehicleTypes = List.of("CAR", "MOTORCYCLE");

      assertThatCode(() ->
          OnboardingDomainInvariants.assertCapacityByTypeConsistentWithVehicleTypes(capacityByType, vehicleTypes))
          .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("should throw BAD_REQUEST for orphaned capacity type (I-01)")
    void shouldThrowForOrphanedCapacityType() {
      Map<String, Object> capacityByType = Map.of("CAR", 60, "TRUCK", 20);
      List<String> vehicleTypes = List.of("CAR", "MOTORCYCLE");

      assertThatThrownBy(() ->
          OnboardingDomainInvariants.assertCapacityByTypeConsistentWithVehicleTypes(capacityByType, vehicleTypes))
          .isInstanceOf(OperationException.class)
          .extracting("status")
          .isEqualTo(HttpStatus.BAD_REQUEST);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // INV-4: Night rate time range validation (C-04)
  // ─────────────────────────────────────────────────────────────────────────

  @Nested
  @DisplayName("assertNightTimeRangeValid (C-04)")
  class NightTimeRangeTest {

    @Test
    @DisplayName("should pass for valid cross-midnight range (22:00 → 06:00)")
    void shouldPassForCrossMidnightRange() {
      assertThatCode(() ->
          OnboardingDomainInvariants.assertNightTimeRangeValid("22:00", "06:00"))
          .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("should pass for valid same-day range (20:00 → 23:00)")
    void shouldPassForSameDayRange() {
      assertThatCode(() ->
          OnboardingDomainInvariants.assertNightTimeRangeValid("20:00", "23:00"))
          .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("should throw BAD_REQUEST when start equals end (C-04)")
    void shouldThrowWhenStartEqualsEnd() {
      assertThatThrownBy(() ->
          OnboardingDomainInvariants.assertNightTimeRangeValid("22:00", "22:00"))
          .isInstanceOf(OperationException.class)
          .extracting("status")
          .isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    @DisplayName("should throw BAD_REQUEST for invalid time format")
    void shouldThrowForInvalidFormat() {
      assertThatThrownBy(() ->
          OnboardingDomainInvariants.assertNightTimeRangeValid("25:00", "06:00"))
          .isInstanceOf(OperationException.class)
          .extracting("status")
          .isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    @DisplayName("should throw BAD_REQUEST for null start time")
    void shouldThrowForNullStartTime() {
      assertThatThrownBy(() ->
          OnboardingDomainInvariants.assertNightTimeRangeValid(null, "06:00"))
          .isInstanceOf(OperationException.class)
          .extracting("status")
          .isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    @DisplayName("isValidTimeFormat: should validate HH:MM pattern correctly")
    void shouldValidateTimeFormat() {
      // Valid times
      assert OnboardingDomainInvariants.isValidTimeFormat("00:00");
      assert OnboardingDomainInvariants.isValidTimeFormat("23:59");
      assert OnboardingDomainInvariants.isValidTimeFormat("06:00");
      assert OnboardingDomainInvariants.isValidTimeFormat("9:30");

      // Invalid times
      assert !OnboardingDomainInvariants.isValidTimeFormat("24:00");
      assert !OnboardingDomainInvariants.isValidTimeFormat("23:60");
      assert !OnboardingDomainInvariants.isValidTimeFormat("abc");
      assert !OnboardingDomainInvariants.isValidTimeFormat(null);
      assert !OnboardingDomainInvariants.isValidTimeFormat("");
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // INV-4: Full-day + night overlap (C-04)
  // ─────────────────────────────────────────────────────────────────────────

  @Nested
  @DisplayName("assertNoFullDayNightRateOverlap (C-04)")
  class FullDayNightOverlapTest {

    @Test
    @DisplayName("should throw BAD_REQUEST when FULL_DAY model has night rate")
    void shouldThrowForFullDayWithNightRate() {
      assertThatThrownBy(() ->
          OnboardingDomainInvariants.assertNoFullDayNightRateOverlap(true, true, "FULL_DAY"))
          .isInstanceOf(OperationException.class)
          .extracting("status")
          .isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    @DisplayName("should pass for HOURLY model with night rate")
    void shouldPassForHourlyWithNightRate() {
      assertThatCode(() ->
          OnboardingDomainInvariants.assertNoFullDayNightRateOverlap(false, true, "HOURLY"))
          .doesNotThrowAnyException();
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // INV-5: Monetary bounds (I-07)
  // ─────────────────────────────────────────────────────────────────────────

  @Nested
  @DisplayName("assertMonetaryBound (I-07)")
  class MonetaryBoundTest {

    @Test
    @DisplayName("should pass for valid rate value")
    void shouldPassForValidRate() {
      assertThatCode(() ->
          OnboardingDomainInvariants.assertMonetaryBound(2000, "baseValue", true))
          .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("should throw BAD_REQUEST for zero rate when required")
    void shouldThrowForZeroRateWhenRequired() {
      assertThatThrownBy(() ->
          OnboardingDomainInvariants.assertMonetaryBound(0, "baseValue", true))
          .isInstanceOf(OperationException.class)
          .extracting("status")
          .isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    @DisplayName("should throw BAD_REQUEST for negative rate")
    void shouldThrowForNegativeRate() {
      assertThatThrownBy(() ->
          OnboardingDomainInvariants.assertMonetaryBound(-100, "baseValue", false))
          .isInstanceOf(OperationException.class)
          .extracting("status")
          .isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    @DisplayName("should throw BAD_REQUEST when rate exceeds MAX_RATE_VALUE")
    void shouldThrowForExceedingMaxRate() {
      assertThatThrownBy(() ->
          OnboardingDomainInvariants.assertMonetaryBound(10_000_000, "baseValue", true))
          .isInstanceOf(OperationException.class)
          .extracting("status")
          .isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    @DisplayName("should pass for null value when not required")
    void shouldPassForNullValueWhenNotRequired() {
      assertThatCode(() ->
          OnboardingDomainInvariants.assertMonetaryBound(null, "nightRate", false))
          .doesNotThrowAnyException();
    }
  }
}
