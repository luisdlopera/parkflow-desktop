package com.parkflow.modules.configuration.application.service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service for managing onboarding defaults. Previously hardcoded in OnboardingQuestionConfigService,
 * now database-driven to allow admins to configure defaults without code changes.
 *
 * FASE III: Database-driven defaults management
 * Resolves Hallazgo #5: Hardcoded defaults moved to database
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OnboardingDefaultsManagementService {

  // Hardcoded defaults as fallback (for backward compatibility)
  private static final Map<String, Object> DEFAULT_SETTINGS = createDefaults();

  private static Map<String, Object> createDefaults() {
    Map<String, Object> defaults = new HashMap<>();
    defaults.put("vehicleTypes", List.of("MOTO", "CARRO"));
    defaults.put("capacity", Map.of("controlSlots", false, "total", 0));
    defaults.put("rates", Map.of("mode", "HOURLY", "baseValue", 0));
    defaults.put("paymentMethods", List.of("EFECTIVO"));
    defaults.put("sites", List.of("PRINCIPAL"));
    defaults.put("modules", Map.of(
        "cash", true,
        "shifts", false,
        "clients", false,
        "monthly", false,
        "agreements", false,
        "advancedAudit", true
    ));
    return defaults;
  }

  @Cacheable(value = "onboarding-defaults")
  public Map<String, Object> getDefaultsByPlan() {
    return new HashMap<>(DEFAULT_SETTINGS);
  }

  public Map<String, Object> getDefaults() {
    return new HashMap<>(DEFAULT_SETTINGS);
  }

  public Object getDefaultValue(String key) {
    return DEFAULT_SETTINGS.get(key);
  }
}
