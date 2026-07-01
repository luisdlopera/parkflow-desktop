package com.parkflow.modules.onboarding.application.service;

import com.parkflow.modules.onboarding.domain.OnboardingDomainInvariants;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.math.BigDecimal;
import com.parkflow.modules.pricing.validation.PricingValidationEngine;
import com.parkflow.modules.pricing.validation.PricingValidationContext;
import com.parkflow.modules.pricing.validation.ValidationError;
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

  private final PricingValidationEngine validationEngine;

  public Step3DataValidator(PricingValidationEngine validationEngine) {
      this.validationEngine = validationEngine;
  }

  // S-03: Whitelist of permitted fields for Step 3
  private static final Set<String> PERMITTED_FIELDS = Set.of(
      "billingModel", "baseValue", "flatRate", "fullDayRate", "nightRate",
      "hasNightRate", "nightStartTime", "nightEndTime",
      "hasFullDayRate", "hasWeekendRate", "weekendRate",
      "hasFractions", "minFractionMinutes", "fractionValue",
      "hasCourtesy", "graceMinutes",
      "rounding",
      "enableRateByType", "ratesByType",
      "pricingConfiguration"
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
    boolean canonicalPricing = rawData.get("pricingConfiguration") instanceof Map<?, ?>;

    // Filter to whitelisted fields only (S-03: prevents mass assignment)
    for (Map.Entry<String, Object> entry : rawData.entrySet()) {
      if (!PERMITTED_FIELDS.contains(entry.getKey())) {
        log.warn("Step3DataValidator: Ignoring non-whitelisted field '{}'", entry.getKey());
        continue;
      }

      String field = entry.getKey();
      Object value = entry.getValue();

      if (canonicalPricing && !"pricingConfiguration".equals(field)) {
        continue;
      }

      // Field-specific validation
      switch (field) {
        case "billingModel" -> {
          if (validateBillingModel(value)) {
            sanitized.put(field, value);
          } else {
            errors.put(field, "Selecciona un modelo de cobro válido.");
          }
        }
        case "baseValue", "flatRate", "fullDayRate", "nightRate", "weekendRate", "fractionValue" -> {
          if (validateMonetaryValue(value, field)) {
            sanitized.put(field, value);
          } else {
            errors.put(field, "Ingresa un valor monetario mayor a 0 y menor o igual a " + MAX_RATE_VALUE + ".");
          }
        }
        case "minFractionMinutes", "graceMinutes" -> {
          if (validatePositiveInteger(value)) {
            sanitized.put(field, value);
          } else {
            errors.put(field, "Ingresa un número entero mayor a 0.");
          }
        }
        case "nightStartTime", "nightEndTime" -> {
          if (validateTimeFormat(value)) {
            sanitized.put(field, value);
          } else {
            errors.put(field, "Usa formato de 24 horas HH:MM, por ejemplo 20:00.");
          }
        }
        case "hasNightRate", "hasFullDayRate", "hasWeekendRate", "hasFractions", "hasCourtesy", "enableRateByType" -> {
          if (value instanceof Boolean) {
            sanitized.put(field, value);
          } else {
            errors.put(field, "Elige sí o no para continuar.");
          }
        }
        case "rounding" -> {
          if (validateRounding(value)) {
            sanitized.put(field, value);
          } else {
            errors.put(field, "Selecciona una opción de redondeo válida.");
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
            errors.put(field, "Las tarifas por tipo de vehículo deben tener un formato válido.");
          }
        }
        case "pricingConfiguration" -> {
          if (value instanceof Map<?, ?>) {
            sanitized.put(field, value);
          } else {
            errors.put(field, "La configuración de tarifas debe tener un formato válido.");
          }
        }
        default -> sanitized.put(field, value); // Pass through if already whitelisted
      }
    }

    PricingValidationContext context = new PricingValidationContext(
        sanitized.get("billingModel") instanceof String s ? s : "HOURLY",
        Boolean.TRUE.equals(sanitized.get("hasNightRate")),
        sanitized.get("nightStartTime") instanceof String s ? s : null,
        sanitized.get("nightEndTime") instanceof String e ? e : null,
        toBigDecimal(sanitized.get("nightRate")),
        toBigDecimal(sanitized.get("baseValue"))
    );

    List<ValidationError> engineErrors = validationEngine.validate(context);
    for (ValidationError error : engineErrors) {
        errors.put(error.field(), error.message());
    }

    boolean isValid = errors.isEmpty();
    return new Step3ValidationResult(isValid, errors, sanitized);
  }

  private BigDecimal toBigDecimal(Object value) {
      if (value == null) return null;
      if (value instanceof Number n) return BigDecimal.valueOf(n.doubleValue());
      if (value instanceof String s) {
          try { return new BigDecimal(s); } catch (Exception e) { return null; }
      }
      return null;
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
