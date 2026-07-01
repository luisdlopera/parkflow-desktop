package com.parkflow.modules.onboarding.application.service;

import com.parkflow.modules.licensing.domain.Company;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * @deprecated Use {@link OnboardingResourceMaterializationService} and
 *             {@link OnboardingRateInitializationService} instead.
 *             This facade is maintained for backward compatibility.
 */
@Deprecated(since = "2.1", forRemoval = false)
@Service
@RequiredArgsConstructor
public class OnboardingMaterializationService {

  private final OnboardingResourceMaterializationService resourceMaterializationService;
  private final OnboardingRateInitializationService rateInitializationService;

  @Transactional
  public void materializeVehicleTypes(UUID companyId, List<String> codes) {
    resourceMaterializationService.materializeVehicleTypes(companyId, codes);
  }

  @Transactional
  public void materializePaymentMethods(UUID companyId, List<String> codes) {
    resourceMaterializationService.materializePaymentMethods(companyId, codes);
  }

  @Transactional
  public void createRatesFromOnboarding(Company company, Map<String, Object> progressData) {
    rateInitializationService.createRatesFromOnboarding(company, progressData);
  }

  @Transactional
  public void createDefaultRates(Company company) {
    rateInitializationService.createDefaultRates(company);
  }

  public void createLockersIfConfigured(UUID companyId, Map<String, Object> step1) {
    resourceMaterializationService.createLockersIfConfigured(companyId, step1);
  }

  public void resizeCapacity(UUID companyId, int totalCapacity) {
    resourceMaterializationService.resizeCapacity(companyId, totalCapacity);
  }
}
