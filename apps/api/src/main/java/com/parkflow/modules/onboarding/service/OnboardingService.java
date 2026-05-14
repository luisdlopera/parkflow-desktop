package com.parkflow.modules.onboarding.service;

import com.parkflow.modules.licensing.entity.Company;
import com.parkflow.modules.licensing.repository.CompanyRepository;
import com.parkflow.modules.onboarding.dto.OnboardingStatusResponse;
import com.parkflow.modules.onboarding.entity.OnboardingProgress;
import com.parkflow.modules.onboarding.repository.OnboardingProgressRepository;
import com.parkflow.modules.parking.operation.exception.OperationException;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class OnboardingService {

  private final CompanyRepository companyRepository;
  private final OnboardingProgressRepository onboardingProgressRepository;
  private final CompanySettingsService companySettingsService;
  private final FeatureAccessService featureAccessService;

  @Transactional(readOnly = true)
  public OnboardingStatusResponse status(UUID companyId) {
    Company company = getCompany(companyId);
    OnboardingProgress progress = findOrCreateProgress(company);
    return new OnboardingStatusResponse(
        company.getId(),
        company.getPlan(),
        Boolean.TRUE.equals(company.getOnboardingCompleted()),
        progress.getCurrentStep(),
        progress.isSkipped(),
        progress.getProgressData(),
        featureAccessService.getAvailableOptionsByPlan(company.getPlan()));
  }

  @Transactional
  public OnboardingStatusResponse saveOnboardingStep(UUID companyId, int step, Map<String, Object> data) {
    Company company = getCompany(companyId);
    OnboardingProgress progress = findOrCreateProgress(company);
    Map<String, Object> merged = new LinkedHashMap<>(progress.getProgressData());
    merged.put("step_" + step, data);
    progress.setProgressData(merged);
    progress.setCurrentStep(Math.max(progress.getCurrentStep(), Math.min(step + 1, 12)));
    progress.setUpdatedAt(OffsetDateTime.now());
    onboardingProgressRepository.save(progress);
    return status(companyId);
  }

  @Transactional
  public OnboardingStatusResponse skipAndApplyDefaults(UUID companyId) {
    Company company = getCompany(companyId);
    OnboardingProgress progress = findOrCreateProgress(company);
    companySettingsService.upsertSettings(company, defaultConfiguration(company));
    progress.setSkipped(true);
    progress.setCompleted(true);
    progress.setCurrentStep(12);
    progress.setSkippedAt(OffsetDateTime.now());
    progress.setCompletedAt(OffsetDateTime.now());
    onboardingProgressRepository.save(progress);
    company.setOnboardingCompleted(true);
    companyRepository.save(company);
    return status(companyId);
  }

  @Transactional
  public OnboardingStatusResponse completeOnboarding(UUID companyId) {
    Company company = getCompany(companyId);
    OnboardingProgress progress = findOrCreateProgress(company);
    Map<String, Object> finalSettings = buildSettingsFromProgress(company, progress.getProgressData());
    companySettingsService.upsertSettings(company, finalSettings);
    progress.setCompleted(true);
    progress.setCurrentStep(12);
    progress.setCompletedAt(OffsetDateTime.now());
    onboardingProgressRepository.save(progress);
    company.setOnboardingCompleted(true);
    companyRepository.save(company);
    return status(companyId);
  }

  @Transactional(readOnly = true)
  public boolean isFeatureEnabled(UUID companyId, String featureKey) {
    Company company = getCompany(companyId);
    Map<String, Object> settings = companySettingsService.getSettingsOrDefault(company);
    return featureAccessService.isFeatureEnabled(settings, featureKey);
  }

  private Company getCompany(UUID companyId) {
    return companyRepository.findById(companyId)
        .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Empresa no encontrada"));
  }

  private OnboardingProgress findOrCreateProgress(Company company) {
    return onboardingProgressRepository.findByCompanyId(company.getId())
        .orElseGet(() -> {
          OnboardingProgress created = new OnboardingProgress();
          created.setCompany(company);
          created.setProgressData(new LinkedHashMap<>());
          return onboardingProgressRepository.save(created);
        });
  }

  private Map<String, Object> buildSettingsFromProgress(Company company, Map<String, Object> progressData) {
    if (progressData == null || progressData.isEmpty()) {
      return defaultConfiguration(company);
    }
    Map<String, Object> settings = new LinkedHashMap<>();
    settings.put("plan", company.getPlan().name());
    settings.put("wizard", progressData);
    settings.put("modules", inferModules(progressData));
    return settings;
  }

  private Map<String, Object> inferModules(Map<String, Object> progressData) {
    boolean shifts = containsYes(progressData.get("step_5"));
    boolean clients = containsYes(progressData.get("step_8"));
    boolean agreements = containsYes(progressData.get("step_9"));
    return Map.of(
        "cash", true,
        "shifts", shifts,
        "clients", clients,
        "monthly", clients,
        "agreements", agreements,
        "advancedAudit", true);
  }

  private boolean containsYes(Object rawStep) {
    if (!(rawStep instanceof Map<?, ?> map)) {
      return false;
    }
    Object v = map.get("enabled");
    if (v instanceof Boolean b) {
      return b;
    }
    return false;
  }

  private Map<String, Object> defaultConfiguration(Company company) {
    return Map.of(
        "plan", company.getPlan().name(),
        "vehicleTypes", List.of("MOTO", "CARRO"),
        "capacity", Map.of("controlSlots", false, "total", 0),
        "rates", List.of(Map.of("type", "HOURLY", "baseValue", 0, "active", true)),
        "paymentMethods", List.of("EFECTIVO"),
        "tickets", Map.of("delivery", List.of("PRINT"), "thermalPrinter", false, "allowReprint", true),
        "modules", Map.of(
            "cash", true,
            "shifts", false,
            "clients", false,
            "monthly", false,
            "agreements", false,
            "advancedAudit", true),
        "sites", List.of(Map.of("code", "PRINCIPAL", "name", "Sede principal")),
        "roles", List.of("ADMIN", "OPERADOR"),
        "criticalAudit", List.of("COBROS", "ANULACIONES", "CIERRE_CAJA"));
  }
}
