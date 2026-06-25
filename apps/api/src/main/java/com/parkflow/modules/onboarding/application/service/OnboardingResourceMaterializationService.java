package com.parkflow.modules.onboarding.application.service;

import com.parkflow.modules.configuration.domain.PaymentMethod;
import com.parkflow.modules.configuration.domain.repository.PaymentMethodPort;
import com.parkflow.modules.onboarding.application.port.out.OnboardingMaterializationPort;
import com.parkflow.modules.parking.locker.dto.BatchLockerRequest;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Onboarding Resource Materialization - handles materialization of vehicle types, payment methods, and lockers.
 * Creates company-specific resources from global templates during onboarding.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class OnboardingResourceMaterializationService {

  private final OnboardingMaterializationPort materializationPort;
  private final PaymentMethodPort paymentMethodPort;
  private final OnboardingSettingsMapper settingsMapper;

  @Transactional
  public void materializeVehicleTypes(UUID companyId, List<String> codes) {
    materializationPort.addVehicleTypesToCompany(companyId, codes);
  }

  @Transactional
  public void materializePaymentMethods(UUID companyId, List<String> codes) {
    for (String code : codes) {
      if (paymentMethodPort.existsByCodeAndCompany(code, companyId)) continue;
      PaymentMethod global = paymentMethodPort.findByCode(code).orElse(null);
      PaymentMethod pm = new PaymentMethod();
      pm.setCompanyId(companyId);
      pm.setCode(code);
      pm.setName(global != null ? global.getName() : code);
      pm.setRequiresReference(global != null && global.isRequiresReference());
      pm.setActive(true);
      pm.setDisplayOrder(global != null ? global.getDisplayOrder() : 99);
      paymentMethodPort.save(pm);
    }
  }

  @Transactional
  public void createLockersIfConfigured(UUID companyId, Map<String, Object> step1) {
    if (step1 == null) return;
    String handling = String.valueOf(step1.getOrDefault("helmetHandling", ""));
    if (!"LOCKERS".equals(handling)) return;
    int count = settingsMapper.extractNumber(step1.get("helmetTokenCount"), 0);
    if (count <= 0 || count > 9999) return;
    materializationPort.createLockersForCompany(companyId, new BatchLockerRequest("L-", 1, count));
  }

  @Transactional
  public void resizeCapacity(UUID companyId, int totalCapacity) {
    if (totalCapacity > 0) {
      materializationPort.resizeCapacityForCompany(companyId, totalCapacity);
    }
  }
}
