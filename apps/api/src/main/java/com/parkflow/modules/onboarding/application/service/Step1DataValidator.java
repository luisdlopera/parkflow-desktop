package com.parkflow.modules.onboarding.application.service;

import com.parkflow.modules.common.exception.OperationException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Value;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

/**
 * Validator for Step 1: Vehicle Types.
 *
 * <p>Enforces:
 * <ul>
 *   <li>At least one vehicle type must be selected</li>
 *   <li>If MOTORCYCLE is selected, helmet handling must be specified</li>
 *   <li>If LOCKERS helmet handling, token count must be [1, 9999]</li>
 * </ul>
 */
@Slf4j
@Component
public class Step1DataValidator {

  public ValidationResult validate(Map<String, Object> data) {
    var errors = new HashMap<String, String>();
    
    if (data == null || data.isEmpty()) {
      return new ValidationResult(true, errors, new HashMap<>());
    }
    
    var sanitized = new HashMap<>(data);

    // Validate vehicle types
    List<String> vehicleTypes = extractList(data.get("vehicleTypes"));
    if (vehicleTypes == null || vehicleTypes.isEmpty()) {
      errors.put("vehicleTypes", "Selecciona al menos un tipo de vehículo.");
    } else {
      // Validate helmet handling if MOTORCYCLE selected
      if (vehicleTypes.contains("MOTORCYCLE")) {
        String helmetHandling = (String) data.get("helmetHandling");
        if (helmetHandling == null || (!helmetHandling.equals("LOCKERS") && !helmetHandling.equals("NONE"))) {
          errors.put("helmetHandling", "Selecciona una opción de custodia de cascos.");
        }

        // Validate helmet count if LOCKERS
        if ("LOCKERS".equals(helmetHandling)) {
          int tokenCount =
              data.get("helmetTokenCount") instanceof Number
                  ? ((Number) data.get("helmetTokenCount")).intValue()
                  : 0;
          if (tokenCount <= 0 || tokenCount > 9999) {
            errors.put(
                "helmetTokenCount",
                "La cantidad de lockers debe estar entre 1 y 9999.");
          }
        }
      }
    }

    boolean isValid = errors.isEmpty();
    return new ValidationResult(isValid, errors, sanitized);
  }

  @SuppressWarnings("unchecked")
  private List<String> extractList(Object obj) {
    if (obj instanceof List<?>) {
      return (List<String>) obj;
    }
    return null;
  }

  @Value
  @AllArgsConstructor
  public static class ValidationResult {
    boolean isValid;
    Map<String, String> errors;
    Map<String, Object> sanitized;
  }
}
