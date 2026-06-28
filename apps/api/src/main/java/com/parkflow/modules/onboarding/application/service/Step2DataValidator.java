package com.parkflow.modules.onboarding.application.service;

import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.onboarding.domain.OnboardingDomainInvariants;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

/**
 * Server-side validator for Onboarding Step 2 (Capacity).
 *
 * <p>Validation rules enforced:
 * <ul>
 *   <li>I-01: capacityByType keys must be ⊆ step1 vehicleTypes (cross-step consistency)</li>
 *   <li>E-06: If controlSlots=false, capacityByType must be stripped/ignored</li>
 *   <li>Total capacity must be ≥ 1</li>
 *   <li>If controlSlots=true, sum(capacityByType.values()) ≤ totalCapacity</li>
 * </ul>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class Step2DataValidator {

  private final OnboardingSettingsMapper settingsMapper;

  /**
   * Validates step 2 data against vehicle types defined in step 1.
   *
   * @param step2Data    raw step 2 data from client
   * @param vehicleTypes list of vehicle type codes from step 1 (may be empty if step 1 not yet saved)
   * @return sanitized step 2 data (with capacityByType stripped when controlSlots=false)
   * @throws OperationException if validation fails
   */
  public Map<String, Object> validateAndSanitize(
      Map<String, Object> step2Data, List<String> vehicleTypes) {
    if (step2Data == null || step2Data.isEmpty()) {
      throw new OperationException(
          HttpStatus.BAD_REQUEST, "Los datos de capacidad no pueden estar vacíos.");
    }

    int totalCapacity = settingsMapper.extractNumber(step2Data.get("totalCapacity"), 0);
    if (totalCapacity <= 0) {
      throw new OperationException(
          HttpStatus.BAD_REQUEST, "La capacidad total debe ser mayor a 0.");
    }

    boolean controlSlots = Boolean.TRUE.equals(step2Data.get("controlSlots"));

    // E-06: If controlSlots=false, capacityByType must be ignored (strip it)
    if (!controlSlots) {
      Map<String, Object> sanitized = new LinkedHashMap<>(step2Data);
      sanitized.remove("capacityByType");
      log.debug(
          "Step2DataValidator: controlSlots=false, capacityByType stripped from data.");
      return sanitized;
    }

    // controlSlots=true — validate capacityByType
    Map<String, Object> capacityByType = extractCapacityByType(step2Data);

    // I-01: Cross-step consistency — keys must be ⊆ vehicleTypes
    if (!vehicleTypes.isEmpty() && !capacityByType.isEmpty()) {
      OnboardingDomainInvariants.assertCapacityByTypeConsistentWithVehicleTypes(
          capacityByType, vehicleTypes);
    } else if (!vehicleTypes.isEmpty() && capacityByType.isEmpty()) {
      log.debug(
          "Step2DataValidator: controlSlots=true but capacityByType is empty; "
              + "accepting as user may configure later.");
    }

    // Sum must not exceed total capacity
    int sumByType =
        capacityByType.values().stream()
            .mapToInt(v -> settingsMapper.extractNumber(v, 0))
            .sum();
    if (sumByType > totalCapacity) {
      throw new OperationException(
          HttpStatus.BAD_REQUEST,
          "La suma de las capacidades configuradas por tipo ("
              + sumByType
              + ") supera la capacidad total permitida ("
              + totalCapacity
              + ").");
    }

    return new LinkedHashMap<>(step2Data);
  }

  private Map<String, Object> extractCapacityByType(Map<String, Object> step2Data) {
    Map<String, Object> byType = new LinkedHashMap<>();
    Object raw = step2Data.get("capacityByType");
    if (raw instanceof Map<?, ?> map) {
      map.forEach((k, v) -> {
        if (v != null) {
          byType.put(String.valueOf(k), v);
        }
      });
    }
    return byType;
  }
}
