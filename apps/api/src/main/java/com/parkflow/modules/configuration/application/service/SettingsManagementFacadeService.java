package com.parkflow.modules.configuration.application.service;

import com.parkflow.modules.licensing.domain.Company;
import com.parkflow.modules.onboarding.application.service.CompanySettingsService;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Consolidated facade for managing all company settings (capacity, modules,
 * features, shifts, region, helmet handling). This service consolidates the
 * logic from 6 deprecated services into a single unified interface.
 *
 * Resolves Hallazgo #2, #6, #13: Consolidated deprecated services,
 * unified settings management, prevented disabling required questions.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class SettingsManagementFacadeService {

  private final CompanySettingsService companySettingsService;

  // Capacity management
  public Map<String, Object> getCapacity(Company company) {
    Map<String, Object> settings = companySettingsService.getSettingsOrDefault(company);
    return (Map<String, Object>) settings.getOrDefault("capacity", Map.of());
  }

  public void updateCapacity(Company company, Map<String, Object> capacityConfig) {
    Map<String, Object> settings = companySettingsService.getSettingsOrDefault(company);
    Map<String, Object> mutableSettings = new HashMap<>(settings);
    mutableSettings.put("capacity", capacityConfig);
    companySettingsService.upsertSettings(company, mutableSettings);
  }

  // Module management
  public Map<String, Object> getModules(Company company) {
    Map<String, Object> settings = companySettingsService.getSettingsOrDefault(company);
    return (Map<String, Object>) settings.getOrDefault("modules", Map.of());
  }

  public void updateModules(Company company, Map<String, Object> moduleConfig) {
    Map<String, Object> settings = companySettingsService.getSettingsOrDefault(company);
    Map<String, Object> mutableSettings = new HashMap<>(settings);
    mutableSettings.put("modules", moduleConfig);
    companySettingsService.upsertSettings(company, mutableSettings);
  }

  // Feature management
  public Map<String, Object> getFeatures(Company company) {
    Map<String, Object> settings = companySettingsService.getSettingsOrDefault(company);
    return (Map<String, Object>) settings.getOrDefault("features", Map.of());
  }

  public void updateFeatures(Company company, Map<String, Object> featureConfig) {
    Map<String, Object> settings = companySettingsService.getSettingsOrDefault(company);
    Map<String, Object> mutableSettings = new HashMap<>(settings);
    mutableSettings.put("features", featureConfig);
    companySettingsService.upsertSettings(company, mutableSettings);
  }

  // Shift management
  public Map<String, Object> getShifts(Company company) {
    Map<String, Object> settings = companySettingsService.getSettingsOrDefault(company);
    return (Map<String, Object>) settings.getOrDefault("shifts", Map.of());
  }

  public void updateShifts(Company company, Map<String, Object> shiftConfig) {
    Map<String, Object> settings = companySettingsService.getSettingsOrDefault(company);
    Map<String, Object> mutableSettings = new HashMap<>(settings);
    mutableSettings.put("shifts", shiftConfig);
    companySettingsService.upsertSettings(company, mutableSettings);
  }

  // Region management
  public Map<String, Object> getRegion(Company company) {
    Map<String, Object> settings = companySettingsService.getSettingsOrDefault(company);
    return (Map<String, Object>) settings.getOrDefault("region", Map.of());
  }

  public void updateRegion(Company company, Map<String, Object> regionConfig) {
    Map<String, Object> settings = companySettingsService.getSettingsOrDefault(company);
    Map<String, Object> mutableSettings = new HashMap<>(settings);
    mutableSettings.put("region", regionConfig);
    companySettingsService.upsertSettings(company, mutableSettings);
  }

  // Helmet handling
  public Map<String, Object> getHelmetHandling(Company company) {
    Map<String, Object> settings = companySettingsService.getSettingsOrDefault(company);
    return (Map<String, Object>) settings.getOrDefault("helmetHandling", Map.of());
  }

  public void updateHelmetHandling(Company company, Map<String, Object> helmetConfig) {
    Map<String, Object> settings = companySettingsService.getSettingsOrDefault(company);
    Map<String, Object> mutableSettings = new HashMap<>(settings);
    mutableSettings.put("helmetHandling", helmetConfig);
    companySettingsService.upsertSettings(company, mutableSettings);
  }

  // Bulk update (useful for onboarding completion)
  public void updateAllSettings(Company company, Map<String, Object> allSettings) {
    companySettingsService.upsertSettings(company, allSettings);
  }
}
