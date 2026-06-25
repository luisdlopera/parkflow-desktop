package com.parkflow.modules.configuration.application.service;

import com.parkflow.modules.onboarding.domain.repository.OnboardingProgressPort;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service for synchronizing onboarding progress with company settings.
 * When company settings are updated (via Configuration API), we update
 * the onboarding_progress.progress_data to keep the wizard in sync.
 *
 * FASE IV: Synchronize progress ↔ settings
 * Resolves Hallazgo #10: Progress data stays in sync with settings
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class ConfigurationSyncService {

  private final OnboardingProgressPort progressPort;

  /**
   * Syncs company settings back to onboarding progress data.
   * Called when configuration changes are made post-wizard.
   *
   * @param companyId the company whose progress should be synced
   * @param updatedSettings the new settings from Configuration API
   */
  public void syncConfigurationToProgress(UUID companyId, Map<String, Object> updatedSettings) {
    progressPort.findByCompanyId(companyId).ifPresent(progress -> {
      // Re-derive progress_data from settings
      Map<String, Object> progressData = progress.getProgressData();
      Map<String, Object> updatedProgressData = new HashMap<>(progressData);

      // Update progress data with new settings
      // This keeps the wizard data in sync with configuration
      if (updatedSettings.containsKey("vehicleTypes")) {
        Map<String, Object> step1 = (Map<String, Object>) updatedProgressData.getOrDefault("step_1", new HashMap<>());
        step1.put("vehicleTypes", updatedSettings.get("vehicleTypes"));
        updatedProgressData.put("step_1", step1);
      }

      if (updatedSettings.containsKey("capacity")) {
        Map<String, Object> step2 = (Map<String, Object>) updatedProgressData.getOrDefault("step_2", new HashMap<>());
        step2.put("capacity", updatedSettings.get("capacity"));
        updatedProgressData.put("step_2", step2);
      }

      if (updatedSettings.containsKey("rates")) {
        Map<String, Object> step3 = (Map<String, Object>) updatedProgressData.getOrDefault("step_3", new HashMap<>());
        step3.put("rates", updatedSettings.get("rates"));
        updatedProgressData.put("step_3", step3);
      }

      if (updatedSettings.containsKey("region")) {
        Map<String, Object> step4 = (Map<String, Object>) updatedProgressData.getOrDefault("step_4", new HashMap<>());
        step4.put("region", updatedSettings.get("region"));
        updatedProgressData.put("step_4", step4);
      }

      if (updatedSettings.containsKey("shifts")) {
        Map<String, Object> step5 = (Map<String, Object>) updatedProgressData.getOrDefault("step_5", new HashMap<>());
        step5.put("shifts", updatedSettings.get("shifts"));
        updatedProgressData.put("step_5", step5);
      }

      if (updatedSettings.containsKey("paymentMethods")) {
        Map<String, Object> step6 = (Map<String, Object>) updatedProgressData.getOrDefault("step_6", new HashMap<>());
        step6.put("paymentMethods", updatedSettings.get("paymentMethods"));
        updatedProgressData.put("step_6", step6);
      }

      progress.setProgressData(updatedProgressData);
      progressPort.save(progress);

      log.debug("Synced configuration to progress for company {}", companyId);
    });
  }

  /**
   * Syncs ALL settings at once (useful for batch updates)
   */
  public void syncAllSettings(UUID companyId, Map<String, Object> allSettings) {
    syncConfigurationToProgress(companyId, allSettings);
  }
}
