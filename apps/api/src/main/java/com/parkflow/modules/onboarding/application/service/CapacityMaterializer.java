package com.parkflow.modules.onboarding.application.service;

import com.parkflow.modules.onboarding.application.port.out.OnboardingMaterializationPort;
import com.parkflow.modules.parking.locker.dto.BatchLockerRequest;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CapacityMaterializer {

  private final OnboardingMaterializationPort materializationPort;
  private final OnboardingSettingsMapper settingsMapper;

  @Transactional
  public void createLockersIfConfigured(UUID companyId, Map<String, Object> step1) {
    if (step1 == null || step1.isEmpty()) return;

    String handling = String.valueOf(step1.getOrDefault("helmetHandling", ""));
    if (!"LOCKERS".equals(handling)) return;

    int count = extractNumber(step1.get("helmetTokenCount"), 0);
    if (count <= 0 || count > 9999) return;

    materializationPort.createLockersForCompany(companyId, new BatchLockerRequest("L-", 1, count));
  }

  @Transactional
  public void resizeCapacity(UUID companyId, int totalCapacity) {
    if (totalCapacity > 0) {
      materializationPort.resizeCapacityForCompany(companyId, totalCapacity);
    }
  }

  private int extractNumber(Object raw, int fallback) {
    if (raw instanceof Number n) return n.intValue();
    if (raw instanceof String s) {
      try {
        return Integer.parseInt(s);
      } catch (NumberFormatException e) {
        return fallback;
      }
    }
    return fallback;
  }
}
