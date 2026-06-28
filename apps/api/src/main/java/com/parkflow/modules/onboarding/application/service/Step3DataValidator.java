package com.parkflow.modules.onboarding.application.service;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * Server-side validator for Onboarding Step 3 (Tarifas).
 * Provides field-level validation and whitelist enforcement to prevent:
 * - S-01: Arbitrary fields from being stored in the settings blob
 * - S-03: Mass assignment of unexpected keys
 * - S-04: Negative or extreme monetary values
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

  private static final int MAX_RATE_VALUE = 9_999_999; // COP equivalent; adjust per currency

  /**
   * Validates step 3 data and returns a sanitized map with only whitelisted fields.
   * Returns validation errors if any field fails validation.
   *
   * @param rawData unsanitized input from client
   * @return validation result with errors (if any) and sanitized data
   */
  public Step3ValidationResult validate(Map<String, Object> rawData) {
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
          if (value instanceof Map<?, ?>) {
            sanitized.put(field, value);
          } else {
            errors.put(field, "Must be a map of vehicle types to rates.");
          }
        }
        default -> sanitized.put(field, value); // Pass through if already whitelisted
      }
    }

    boolean isValid = errors.isEmpty();
    return new Step3ValidationResult(isValid, errors, sanitized);
  }

  private boolean validateBillingModel(Object value) {
    if (!(value instanceof String s)) return false;
    return Set.of("HOURLY", "FRACTION", "FLAT", "FULL_DAY", "MIXED").contains(s);
  }

  private boolean validateMonetaryValue(Object value, String fieldName) {
    if (value == null) return true; // Null is acceptable (field not provided)
    if (value instanceof Number n) {
      double d = n.doubleValue();
      return d >= 0 && d <= MAX_RATE_VALUE;
    }
    if (value instanceof String s) {
      try {
        double d = Double.parseDouble(s);
        return d >= 0 && d <= MAX_RATE_VALUE;
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
