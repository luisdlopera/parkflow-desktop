package com.parkflow.modules.onboarding.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.parkflow.modules.common.exception.OperationException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.http.HttpStatus;

/**
 * Unit tests for {@link Step2DataValidator}.
 *
 * <p>Covers audit findings:
 * <ul>
 *   <li>I-01: capacityByType keys must be ⊆ vehicleTypes</li>
 *   <li>E-06: If controlSlots=false, capacityByType must be stripped</li>
 * </ul>
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("Step2DataValidator")
class Step2DataValidatorTest {

  @Mock
  private OnboardingSettingsMapper settingsMapper;

  @InjectMocks
  private Step2DataValidator validator;

  @BeforeEach
  void setUp() {
    // Lenient stubs for extractNumber — used in various test cases
    lenient().when(settingsMapper.extractNumber(any(), anyInt())).thenAnswer(inv -> {
      Object raw = inv.getArgument(0);
      if (raw instanceof Number n) return n.intValue();
      return (int) inv.getArgument(1); // fallback
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // I-01: capacityByType cross-step consistency
  // ─────────────────────────────────────────────────────────────────────────

  @Nested
  @DisplayName("capacityByType cross-step consistency - I-01")
  class CapacityByTypeConsistencyTest {

    @Test
    @DisplayName("should pass when capacityByType keys are subset of vehicleTypes")
    void shouldPassForValidCapacityByType() {
      Map<String, Object> data = new LinkedHashMap<>();
      data.put("totalCapacity", 100);
      data.put("controlSlots", true);
      data.put("capacityByType", Map.of("CAR", 60, "MOTORCYCLE", 30));

      var result = validator.validateAndSanitize(data, List.of("CAR", "MOTORCYCLE", "BICYCLE"));

      assertThat(result).containsKey("capacityByType");
    }

    @Test
    @DisplayName("should throw BAD_REQUEST when TRUCK not in vehicleTypes (I-01)")
    void shouldThrowForOrphanedCapacityType() {
      Map<String, Object> data = new LinkedHashMap<>();
      data.put("totalCapacity", 100);
      data.put("controlSlots", true);
      data.put("capacityByType", Map.of("CAR", 60, "TRUCK", 20));

      assertThatThrownBy(() ->
          validator.validateAndSanitize(data, List.of("CAR", "MOTORCYCLE")))
          .isInstanceOf(OperationException.class)
          .extracting("status")
          .isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    @DisplayName("should skip cross-step check when vehicleTypes is empty")
    void shouldSkipCheckWhenVehicleTypesEmpty() {
      Map<String, Object> data = new LinkedHashMap<>();
      data.put("totalCapacity", 100);
      data.put("controlSlots", true);
      data.put("capacityByType", Map.of("TRUCK", 60));

      // Empty vehicleTypes → skip I-01 check
      var result = validator.validateAndSanitize(data, List.of());

      assertThat(result).isNotNull();
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // E-06: controlSlots=false → strip capacityByType
  // ─────────────────────────────────────────────────────────────────────────

  @Nested
  @DisplayName("controlSlots=false strips capacityByType - E-06")
  class ControlSlotsFalseTest {

    @Test
    @DisplayName("should strip capacityByType when controlSlots=false (E-06)")
    void shouldStripCapacityByTypeWhenControlSlotsFalse() {
      Map<String, Object> data = new LinkedHashMap<>();
      data.put("totalCapacity", 100);
      data.put("controlSlots", false);
      // User erroneously provided capacityByType — should be stripped
      data.put("capacityByType", Map.of("CAR", 60, "MOTORCYCLE", 30));

      var result = validator.validateAndSanitize(data, List.of("CAR", "MOTORCYCLE"));

      assertThat(result).doesNotContainKey("capacityByType");
    }

    @Test
    @DisplayName("should not perform cross-step checks when controlSlots=false")
    void shouldNotValidateWhenControlSlotsFalse() {
      Map<String, Object> data = new LinkedHashMap<>();
      data.put("totalCapacity", 100);
      data.put("controlSlots", false);
      // Orphaned type — but controlSlots=false means it's irrelevant
      data.put("capacityByType", Map.of("TRUCK", 999));

      // Should NOT throw even though TRUCK is not in vehicleTypes
      var result = validator.validateAndSanitize(data, List.of("CAR"));

      assertThat(result).doesNotContainKey("capacityByType");
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Basic capacity validation
  // ─────────────────────────────────────────────────────────────────────────

  @Nested
  @DisplayName("Basic capacity validation")
  class BasicValidationTest {

    @Test
    @DisplayName("should throw BAD_REQUEST for zero totalCapacity")
    void shouldThrowForZeroCapacity() {
      Map<String, Object> data = new LinkedHashMap<>();
      data.put("totalCapacity", 0);
      data.put("controlSlots", false);

      assertThatThrownBy(() ->
          validator.validateAndSanitize(data, List.of("CAR")))
          .isInstanceOf(OperationException.class)
          .extracting("status")
          .isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    @DisplayName("should throw BAD_REQUEST for null data")
    void shouldThrowForNullData() {
      assertThatThrownBy(() ->
          validator.validateAndSanitize(null, List.of("CAR")))
          .isInstanceOf(OperationException.class)
          .extracting("status")
          .isEqualTo(HttpStatus.BAD_REQUEST);
    }
  }
}
