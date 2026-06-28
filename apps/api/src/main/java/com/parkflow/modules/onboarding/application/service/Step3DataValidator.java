package com.parkflow.modules.onboarding.application.service;

import com.parkflow.modules.onboarding.domain.OnboardingDomainInvariants;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * Server-side validator for Onboarding Step 3 (Tarifas).
 *
 * <p>Validation rules enforced:
 * <ul>
 *   <li>S-01/S-03: Whitelist enforcement — only known fields are passed through</li>
 *   <li>S-04/I-07: Monetary values must be &gt; 0 and ≤ MAX_RATE_VALUE</li>
 *   <li>C-01: ratesByType keys must be ⊆ vehicleTypes (cross-step consistency)</li>
 *   <li>C-04: Night rate time ranges must be valid HH:MM and non-overlapping</li>
 * </ul>
 */
@Slf4j
@Component
public class Step3DataValidator {

  // S-03: Whitelist of permitted fields for Step 3
  private static final Set<String> PERMITTED_FIELDS = Set.of(
      "billingModel", "baseValue", "flatRate", "fullDayRate", "nightRate",
      "hasNightRate", "nightStartTime", "nightEndTime",
      "hasFullDayRate", "hasWeekendRate", "weekendRate",
      "hasFractions", "minFractionMinutes", "fractionValue",
      "hasCourtesy", "graceMinutes",
      "rounding",
      "enableRateByType", "ratesByType"
  );

  private static final int MAX_RATE_VALUE = OnboardingDomainInvariants.MAX_RATE_VALUE;

  /**
   * Validates step 3 data and returns a sanitized map with only whitelisted fields.
   * Returns validation errors if any field fails validation.
   *
   * <p>This overload does NOT perform cross-step vehicleType consistency checks.
   * Use {@link #validateWithVehicleTypes(Map, List)} when vehicleTypes are available.
   *
   * @param rawData unsanitized input from client
   * @return validation result with errors (if any) and sanitized data
   */
  public Step3ValidationResult validate(Map<String, Object> rawData) {
    return validateWithVehicleTypes(rawData, List.of());
  }

  /**
   * Validates step 3 data with cross-step vehicleType consistency (C-01).
   *
   * @param rawData      unsanitized input from client
   * @param vehicleTypes vehicle type codes from step 1 (empty list skips cross-step check)
   * @return validation result with errors (if any) and sanitized data
   */
  public Step3ValidationResult validateWithVehicleTypes(
      Map<String, Object> rawData, List<String> vehicleTypes) {
    Map<String, String> errors = new HashMap<>();
    Map<String, Object> sanitized = new HashMap<>();

    if (rawData == null || rawData.isEmpty()) {
      return new Step3ValidationResult(true, errors, sanitized);
    }

    // Filter to whitelisted fields only (S-03: prevents mass assignment)
    for (Map.Entry<String, Object> entry : rawData.entrySet()) {
      if (!PERMITTED_FIELDS.contains(entry.getKey())) {
        log.warn("Step3DataValidator: Ignoring non-whitelisted field '{}'", entry.getKey());
        continue;
      }

      String field = entry.getKey();
      Object value = entry.getValue();

      // Field-specific validation
      switch (field) {
        case "billingModel" -> {
          if (validateBillingModel(value)) {
            sanitized.put(field, value);
          } else {
            errors.put(field, "Invalid billing model.");
          }
        }
        case "baseValue", "flatRate", "fullDayRate", "nightRate", "weekendRate", "fractionValue" -> {
          if (validateMonetaryValue(value, field)) {
            sanitized.put(field, value);
          } else {
            errors.put(field, "Invalid monetary value (must be positive, max " + MAX_RATE_VALUE + ").");
          }
        }
        case "minFractionMinutes", "graceMinutes" -> {
          if (validatePositiveInteger(value)) {
            sanitized.put(field, value);
          } else {
            errors.put(field, "Must be a positive integer.");
          }
        }
        case "nightStartTime", "nightEndTime" -> {
          if (validateTimeFormat(value)) {
            sanitized.put(field, value);
          } else {
            errors.put(field, "Invalid time format (expected HH:MM).");
          }
        }
        case "hasNightRate", "hasFullDayRate", "hasWeekendRate", "hasFractions", "hasCourtesy", "enableRateByType" -> {
          if (value instanceof Boolean) {
            sanitized.put(field, value);
          } else {
            errors.put(field, "Must be a boolean.");
          }
        }
        case "rounding" -> {
          if (validateRounding(value)) {
            sanitized.put(field, value);
          } else {
            errors.put(field, "Invalid rounding mode.");
          }
        }
        case "ratesByType" -> {
          if (value instanceof Map<?, ?> ratesMap) {
            // C-01: Validate ratesByType keys ⊆ vehicleTypes
            if (!vehicleTypes.isEmpty()) {
              Map<String, Object> typedRates = new HashMap<>();
              ratesMap.forEach((k, v) -> typedRates.put(String.valueOf(k), v));
              Set<String> orphaned = new java.util.HashSet<>(typedRates.keySet());
              orphaned.removeAll(Set.copyOf(vehicleTypes));
              if (!orphaned.isEmpty()) {
                errors.put(field,
                    "Las tarifas contienen tipos de vehículo no configurados en el paso 1: "
                        + orphaned);
              } else {
                sanitized.put(field, value);
              }
            } else {
              sanitized.put(field, value);
            }
          } else {
            errors.put(field, "Must be a map of vehicle types to rates.");
          }
        }
        default -> sanitized.put(field, value); // Pass through if already whitelisted
      }
    }

    // C-04: Cross-field time range validation for night rates
    validateNightRateTimeRange(sanitized, errors);

    // C-04: Full-day + night rate overlap check
    validateFullDayNightOverlap(sanitized, errors);

    boolean isValid = errors.isEmpty();
    return new Step3ValidationResult(isValid, errors, sanitized);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // C-04: Cross-field time range validation helpers
  // ─────────────────────────────────────────────────────────────────────────

  private void validateNightRateTimeRange(
      Map<String, Object> sanitized, Map<String, String> errors) {
    boolean hasNightRate = Boolean.TRUE.equals(sanitized.get("hasNightRate"));
    if (!hasNightRate) return;

    String start = sanitized.get("nightStartTime") instanceof String s ? s : null;
    String end = sanitized.get("nightEndTime") instanceof String e ? e : null;

    if (start == null || start.isBlank()) {
      errors.put("nightStartTime", "Ingresa la hora de inicio de la tarifa nocturna.");
    } else if (!OnboardingDomainInvariants.isValidTimeFormat(start)) {
      errors.put("nightStartTime", "Formato de hora inválido. Se esperaba HH:MM.");
    }

    if (end == null || end.isBlank()) {
      errors.put("nightEndTime", "Ingresa la hora de fin de la tarifa nocturna.");
    } else if (!OnboardingDomainInvariants.isValidTimeFormat(end)) {
      errors.put("nightEndTime", "Formato de hora inválido. Se esperaba HH:MM.");
    }

    if (start != null && end != null
        && OnboardingDomainInvariants.isValidTimeFormat(start)
        && OnboardingDomainInvariants.isValidTimeFormat(end)
        && start.equals(end)) {
      errors.put("nightStartTime", "La hora de inicio y fin de la tarifa nocturna no pueden ser iguales.");
    }
  }

  private void validateFullDayNightOverlap(
      Map<String, Object> sanitized, Map<String, String> errors) {
    String billingModel =
        sanitized.get("billingModel") instanceof String s ? s : null;
    boolean hasNightRate = Boolean.TRUE.equals(sanitized.get("hasNightRate"));
    if ("FULL_DAY".equals(billingModel) && hasNightRate) {
      errors.put(
          "hasNightRate",
          "Un modelo de cobro 'Día Completo' no puede tener tarifa nocturna simultánea.");
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Field-level validators
  // ─────────────────────────────────────────────────────────────────────────

  private boolean validateBillingModel(Object value) {
    if (!(value instanceof String s)) return false;
    return Set.of("HOURLY", "FRACTION", "FLAT", "FULL_DAY", "MIXED").contains(s);
  }

  /**
   * I-07: Monetary values must be strictly > 0 and ≤ MAX_RATE_VALUE.
   * Null values are acceptable (field not provided / optional).
   */
  private boolean validateMonetaryValue(Object value, String fieldName) {
    if (value == null) return true; // Null is acceptable (field not provided)
    if (value instanceof Number n) {
      double d = n.doubleValue();
      // I-07: Changed from >= 0 to > 0 to prevent $0 rates
      return d > 0 && d <= MAX_RATE_VALUE;
    }
    if (value instanceof String s) {
      try {
        double d = Double.parseDouble(s);
        return d > 0 && d <= MAX_RATE_VALUE;
      } catch (NumberFormatException e) {
        return false;
      }
    }
    return false;
  }

  private boolean validatePositiveInteger(Object value) {
    if (value == null) return true;
    if (value instanceof Number n) {
      return n.intValue() > 0;
    }
    if (value instanceof String s) {
      try {
        return Integer.parseInt(s) > 0;
      } catch (NumberFormatException e) {
        return false;
      }
    }
    return false;
  }

  private boolean validateTimeFormat(Object value) {
    if (value == null) return true;
    if (!(value instanceof String s)) return false;
    // HH:MM format validation
    return s.matches("^([01]?[0-9]|2[0-3]):[0-5][0-9]$");
  }

  private boolean validateRounding(Object value) {
    if (!(value instanceof String s)) return false;
    return Set.of("EXACT", "15_MIN", "30_MIN", "1_HOUR").contains(s);
  }

  /**
   * Result of Step 3 validation containing errors (if any) and sanitized data.
   */
  public static class Step3ValidationResult {
    public final boolean isValid;
    public final Map<String, String> errors;
    public final Map<String, Object> sanitizedData;

    public Step3ValidationResult(boolean isValid, Map<String, String> errors, Map<String, Object> sanitizedData) {
      this.isValid = isValid;
      this.errors = errors;
      this.sanitizedData = sanitizedData;
    }
  }
}
