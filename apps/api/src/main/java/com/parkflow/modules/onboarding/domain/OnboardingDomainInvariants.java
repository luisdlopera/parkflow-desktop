package com.parkflow.modules.onboarding.domain;

import com.parkflow.modules.common.exception.OperationException;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.http.HttpStatus;

/**
 * Centralized domain invariant assertions for the onboarding module.
 *
 * <p>Design rationale: these invariants represent pure business rules that must
 * hold across steps and cannot be violated regardless of the calling context
 * (HTTP, async event, admin tool). By placing them here — as static methods with
 * no Spring dependency — we guarantee they are reusable, testable in isolation,
 * and consistently applied in every entry point.
 *
 * <p>Invariants covered:
 * <ul>
 *   <li>INV-1: Cross-step referential integrity (step3 ratesByType ⊆ step1 vehicleTypes)</li>
 *   <li>INV-1: Cross-step capacity integrity (step2 capacityByType ⊆ step1 vehicleTypes)</li>
 *   <li>INV-3: State consistency (completed onboarding must not be mutated)</li>
 *   <li>INV-4: Time range validity for night rates</li>
 *   <li>INV-5: Monetary bounds (> 0 and ≤ MAX_RATE_VALUE)</li>
 * </ul>
 */
public final class OnboardingDomainInvariants {

  /** Maximum allowed rate value to prevent extreme input (COP-appropriate). */
  public static final int MAX_RATE_VALUE = 9_999_999;

  /** Supported vehicle type codes — used for whitelist enforcement. */
  public static final Set<String> VALID_VEHICLE_TYPES =
      Set.of("MOTORCYCLE", "CAR", "BICYCLE", "VAN", "TRUCK", "BUS", "ELECTRIC", "OTHER");

  private OnboardingDomainInvariants() {
    // Utility class — no instances
  }

  // ─────────────────────────────────────────────────────────────────────────
  // INV-3: Completed state guard
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Asserts that a completed onboarding cannot be mutated without an explicit reset.
   * Addresses audit finding E-05.
   *
   * @param isCompleted {@code true} if the onboarding has been marked completed
   * @throws OperationException HTTP 409 if completed
   */
  public static void assertNotCompleted(boolean isCompleted) {
    if (isCompleted) {
      throw new OperationException(
          HttpStatus.CONFLICT,
          "El onboarding ya fue completado. Usa la opción de reinicio para modificarlo.");
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // INV-1: Cross-step referential integrity
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Asserts that all keys in {@code ratesByType} are a subset of the company's
   * configured vehicleTypes (from step 1). This prevents orphaned Rate entities
   * with FK violations or silent failures on materialization.
   *
   * <p>Addresses audit finding C-01.
   *
   * @param ratesByType  map from vehicle type code → rate value (from step 3)
   * @param vehicleTypes list of valid vehicle type codes (from step 1)
   * @throws OperationException HTTP 400 if orphaned vehicle type codes found
   */
  public static void assertRatesByTypeConsistentWithVehicleTypes(
      Map<String, Object> ratesByType, List<String> vehicleTypes) {
    if (ratesByType == null || ratesByType.isEmpty()) return;
    Set<String> validTypes = Set.copyOf(vehicleTypes);
    Set<String> orphaned = new java.util.HashSet<>(ratesByType.keySet());
    orphaned.removeAll(validTypes);
    if (!orphaned.isEmpty()) {
      throw new OperationException(
          HttpStatus.BAD_REQUEST,
          "Las tarifas contienen tipos de vehículo no configurados en el paso 1: " + orphaned
              + ". Tipos permitidos: " + validTypes);
    }
  }

  /**
   * Asserts that all keys in {@code capacityByType} are a subset of the company's
   * configured vehicleTypes. Prevents orphaned capacity slots.
   *
   * <p>Addresses audit finding I-01.
   *
   * @param capacityByType map from vehicle type code → capacity (from step 2)
   * @param vehicleTypes   list of valid vehicle type codes (from step 1)
   * @throws OperationException HTTP 400 if orphaned vehicle type codes found
   */
  public static void assertCapacityByTypeConsistentWithVehicleTypes(
      Map<String, Object> capacityByType, List<String> vehicleTypes) {
    if (capacityByType == null || capacityByType.isEmpty()) return;
    Set<String> validTypes = Set.copyOf(vehicleTypes);
    Set<String> orphaned = new java.util.HashSet<>(capacityByType.keySet());
    orphaned.removeAll(validTypes);
    if (!orphaned.isEmpty()) {
      throw new OperationException(
          HttpStatus.BAD_REQUEST,
          "La capacidad por tipo contiene tipos de vehículo no configurados en el paso 1: "
              + orphaned + ". Tipos permitidos: " + validTypes);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // INV-4: Time range validity
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Validates a time value string as HH:MM format.
   *
   * @param time the time string to validate
   * @return {@code true} if valid HH:MM format, {@code false} otherwise
   */
  public static boolean isValidTimeFormat(String time) {
    if (time == null || time.isBlank()) return false;
    return time.matches("^([01]?[0-9]|2[0-3]):[0-5][0-9]$");
  }

  /**
   * Converts a HH:MM string to minutes since midnight.
   *
   * @param time HH:MM string
   * @return total minutes from midnight
   */
  static int toMinutes(String time) {
    String[] parts = time.split(":");
    return Integer.parseInt(parts[0]) * 60 + Integer.parseInt(parts[1]);
  }

  /**
   * Asserts that the night rate time range is valid:
   * <ul>
   *   <li>Both times must be in HH:MM format</li>
   *   <li>Start and end must not be equal</li>
   *   <li>Cross-midnight ranges are valid (e.g., 22:00 → 06:00)</li>
   * </ul>
   *
   * <p>Addresses audit finding C-04.
   *
   * @param nightStartTime HH:MM string for night rate start
   * @param nightEndTime   HH:MM string for night rate end
   * @throws OperationException HTTP 400 if invalid
   */
  public static void assertNightTimeRangeValid(String nightStartTime, String nightEndTime) {
    if (!isValidTimeFormat(nightStartTime)) {
      throw new OperationException(
          HttpStatus.BAD_REQUEST,
          "La hora de inicio de tarifa nocturna no es válida. Formato esperado: HH:MM");
    }
    if (!isValidTimeFormat(nightEndTime)) {
      throw new OperationException(
          HttpStatus.BAD_REQUEST,
          "La hora de fin de tarifa nocturna no es válida. Formato esperado: HH:MM");
    }
    if (nightStartTime.equals(nightEndTime)) {
      throw new OperationException(
          HttpStatus.BAD_REQUEST,
          "La hora de inicio y fin de la tarifa nocturna no pueden ser iguales.");
    }
    // Cross-midnight ranges (e.g., 22:00 → 06:00) are valid by business rule.
    // We only reject same-time values above. Ranges like 06:00 → 06:00 = no duration.
    // No further restriction required unless specific overlap checking is requested.
  }

  /**
   * Asserts that if both a full-day rate and a night rate are configured, they do not
   * create an ambiguous full-day overlap. Full-day rate by definition covers the entire
   * day; a simultaneous night rate creates billing ambiguity.
   *
   * <p>Addresses audit finding C-04 (overlap scenario).
   *
   * @param hasFullDayRate {@code true} if a full-day rate is configured
   * @param hasNightRate   {@code true} if a night rate is configured
   * @param billingModel   the billing model string (e.g., "FULL_DAY", "HOURLY")
   * @throws OperationException HTTP 400 on ambiguous overlap
   */
  public static void assertNoFullDayNightRateOverlap(
      boolean hasFullDayRate, boolean hasNightRate, String billingModel) {
    if ("FULL_DAY".equals(billingModel) && hasNightRate) {
      throw new OperationException(
          HttpStatus.BAD_REQUEST,
          "Un modelo de cobro 'Día Completo' no puede tener tarifa nocturna simultánea. "
              + "La tarifa de día completo ya cubre todo el día.");
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // INV-5: Monetary bounds
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Asserts that a monetary rate value is strictly positive and within the allowed
   * maximum. Allows null/zero when the field is optional.
   *
   * <p>Addresses audit finding I-07.
   *
   * @param value     the numeric rate value (may be null)
   * @param fieldName human-readable field name for error messages
   * @param required  {@code true} if value must be strictly > 0
   * @throws OperationException HTTP 400 on invalid value
   */
  public static void assertMonetaryBound(Object value, String fieldName, boolean required) {
    if (value == null) {
      if (required) {
        throw new OperationException(
            HttpStatus.BAD_REQUEST, "El campo '" + fieldName + "' es requerido.");
      }
      return;
    }
    double d;
    if (value instanceof Number n) {
      d = n.doubleValue();
    } else if (value instanceof String s) {
      try {
        d = Double.parseDouble(s);
      } catch (NumberFormatException e) {
        throw new OperationException(
            HttpStatus.BAD_REQUEST,
            "El campo '" + fieldName + "' debe ser un número válido.");
      }
    } else {
      throw new OperationException(
          HttpStatus.BAD_REQUEST,
          "El campo '" + fieldName + "' debe ser un número.");
    }

    if (required && d <= 0) {
      throw new OperationException(
          HttpStatus.BAD_REQUEST,
          "El campo '" + fieldName + "' debe ser mayor a 0.");
    }
    if (d < 0) {
      throw new OperationException(
          HttpStatus.BAD_REQUEST,
          "El campo '" + fieldName + "' no puede ser negativo.");
    }
    if (d > MAX_RATE_VALUE) {
      throw new OperationException(
          HttpStatus.BAD_REQUEST,
          "El campo '" + fieldName + "' supera el valor máximo permitido (" + MAX_RATE_VALUE + ").");
    }
  }
}
