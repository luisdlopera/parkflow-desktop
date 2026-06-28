package com.parkflow.modules.onboarding.application.service;

import com.parkflow.modules.licensing.domain.Company;
import com.parkflow.modules.onboarding.domain.OnboardingCompletedEvent;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Recover;
import org.springframework.retry.annotation.Retryable;
import com.parkflow.modules.onboarding.domain.repository.OnboardingProgressPort;

@Slf4j
@Component
@RequiredArgsConstructor
public class OnboardingMaterializationEventListener {

  private final OnboardingMaterializationService materializationService;
  private final OnboardingSettingsMapper settingsMapper;
  private final CompanySettingsService companySettingsService;
  private final OnboardingProgressPort progressRepository;

  @Async
  @EventListener
  @Retryable(maxAttempts = 3, backoff = @Backoff(delay = 2000))
  public void onOnboardingCompleted(OnboardingCompletedEvent event) {
    log.info("Materializing onboarding data for company {}", event.getCompanyId());
    
    UUID companyId = event.getCompanyId();
    Company company = event.getCompany();
    Map<String, Object> progressData = event.getProgressData();
    Map<String, Object> settings = event.getFinalSettings();

    // 1. Save company settings
    companySettingsService.upsertSettings(company, settings);

    // 2. Materialize Vehicle Types
    @SuppressWarnings("unchecked")
    List<String> vehicleTypeCodes = (List<String>) settings.getOrDefault("vehicleTypes", List.of("MOTORCYCLE", "CAR"));
    materializationService.materializeVehicleTypes(companyId, vehicleTypeCodes);

    // 3. Materialize Payment Methods
    @SuppressWarnings("unchecked")
    List<String> paymentMethodCodes = (List<String>) settings.getOrDefault("paymentMethods", List.of("CASH"));
    materializationService.materializePaymentMethods(companyId, paymentMethodCodes);

    if (event.isSkipped() && (progressData == null || progressData.isEmpty())) {
      materializationService.createDefaultRates(company);
    } else {
      Map<String, Object> step1 = settingsMapper.stepMap(progressData, 1);
      Map<String, Object> step2 = settingsMapper.stepMap(progressData, 2);

      // 4. Lockers
      materializationService.createLockersIfConfigured(companyId, step1);

      // 5. Capacity
      int totalCapacity = settingsMapper.extractNumber(step2.get("totalCapacity"), 0);
      materializationService.resizeCapacity(companyId, totalCapacity);

      // 6. Rates
      materializationService.createRatesFromOnboarding(company, progressData);
    }
    
    log.info("Successfully materialized onboarding data for company {}", companyId);
  }

  @Recover
  public void recoverFromMaterializationFailure(Exception e, OnboardingCompletedEvent event) {
    log.error("CRITICAL: Failed to materialize onboarding data for company {} after retries. Error: {}", event.getCompanyId(), e.getMessage(), e);
    progressRepository.findByCompanyId(event.getCompanyId()).ifPresent(progress -> {
      progress.setMaterializationFailed(true);
      progressRepository.save(progress);
      log.info("Marked onboarding progress as materialization_failed for company {}", event.getCompanyId());
    });
  }
}
