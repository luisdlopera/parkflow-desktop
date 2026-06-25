package com.parkflow.modules.onboarding.application.service;

import com.parkflow.modules.licensing.domain.Company;
import com.parkflow.modules.licensing.domain.repository.CompanyPort;
import com.parkflow.modules.onboarding.application.port.in.OnboardingQueryUseCase;
import com.parkflow.modules.onboarding.application.port.out.OperationalConfigurationPort;
import com.parkflow.modules.onboarding.dto.OnboardingStatusResponse;
import com.parkflow.modules.onboarding.dto.CompanyCapabilitiesResponse;
import com.parkflow.modules.onboarding.domain.OnboardingProgress;
import com.parkflow.modules.onboarding.domain.repository.OnboardingProgressPort;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Handles onboarding query operations: status, settings, capabilities, feature access.
 * Max 3 methods (read-only queries).
 */
@Service
@RequiredArgsConstructor
public class OnboardingQueryService implements OnboardingQueryUseCase {

  private final CompanyPort companyRepository;
  private final OnboardingProgressPort onboardingProgressPort;
  private final CompanySettingsService companySettingsService;
  private final FeatureAccessService featureAccessService;
  private final OperationalConfigurationPort operationalConfigurationPort;
  private final OnboardingQuestionConfigService onboardingQuestionConfigService;
  private final OnboardingSettingsMapper settingsMapper;

  @Override
  @Transactional(readOnly = true)
  public OnboardingStatusResponse status(UUID companyId) {
    Company company = getCompany(companyId);
    OnboardingProgress progress = findOrCreateProgress(company);
    List<Integer> enabledSteps = computeEnabledSteps(company);
    return new OnboardingStatusResponse(
        company.getId(),
        company.getPlan(),
        Boolean.TRUE.equals(company.getOnboardingCompleted()),
        progress.getCurrentStep(),
        progress.isSkipped(),
        progress.getProgressData(),
        featureAccessService.getAvailableOptionsByPlan(company.getPlan()),
        enabledSteps);
  }

  @Override
  @Transactional(readOnly = true)
  public boolean isFeatureEnabled(UUID companyId, String featureKey) {
    Company company = getCompany(companyId);
    Map<String, Object> settings = companySettingsService.getSettingsOrDefault(company);
    return featureAccessService.isFeatureEnabled(settings, featureKey);
  }

  @Override
  @Transactional(readOnly = true)
  public Map<String, Object> getCompanySettings(UUID companyId) {
    Company company = getCompany(companyId);
    Map<String, Object> settings = companySettingsService.getSettingsOrDefault(company);
    Map<String, Object> mutable = new LinkedHashMap<>(settings);
    mutable.put("businessModel", company.getOperationalProfile().name());
    mutable.put("operationalProfile", company.getOperationalProfile().name());
    @SuppressWarnings("unchecked")
    Map<String, Object> persistedOpConfig = (Map<String, Object>) settings.getOrDefault("operationConfiguration", new LinkedHashMap<>());
    Map<String, Object> derivedOpConfig = operationalConfigurationPort.getOperationConfiguration(companyId);
    Map<String, Object> mergedOpConfig = new LinkedHashMap<>(derivedOpConfig);
    mergedOpConfig.putAll(persistedOpConfig);
    mutable.put("operationConfiguration", mergedOpConfig);
    return mutable;
  }

  @Override
  @Transactional(readOnly = true)
  public CompanyCapabilitiesResponse getCapabilities(UUID companyId) {
    Company company = getCompany(companyId);
    Map<String, Object> plan = featureAccessService.getAvailableOptionsByPlan(company.getPlan());
    Map<String, Object> settings = companySettingsService.getSettingsOrDefault(company);
    List<String> rawVehicleTypes = settingsMapper.asStringList(settings.get("vehicleTypes"), List.of("MOTO", "CARRO"));
    List<String> vehicleTypes = rawVehicleTypes.stream().map(settingsMapper::mapVehicleTypeCode).toList();
    List<String> rawPaymentMethods = settingsMapper.asStringList(settings.get("paymentMethods"), List.of("EFECTIVO"));
    List<String> paymentMethods = rawPaymentMethods.stream().map(settingsMapper::mapPaymentMethodCode).toList();
    int siteCount = settingsMapper.extractSitesCount(settings.get("sites"));
    boolean cashEnabled = settingsMapper.moduleEnabled(settings, "cash", true);
    boolean shiftsEnabled = settingsMapper.moduleEnabled(settings, "shifts", false);
    boolean clientsEnabled = settingsMapper.moduleEnabled(settings, "clients", false);
    boolean agreementsEnabled = settingsMapper.moduleEnabled(settings, "agreements", false);
    return new CompanyCapabilitiesResponse(
        Boolean.TRUE.equals(company.getOnboardingCompleted()),
        Boolean.TRUE.equals(plan.get("allowMultiLocation")),
        Boolean.TRUE.equals(plan.get("allowAdvancedPermissions")),
        cashEnabled, shiftsEnabled, clientsEnabled, agreementsEnabled,
        vehicleTypes.size(), paymentMethods.size(), siteCount,
        vehicleTypes, paymentMethods);
  }

  private List<Integer> computeEnabledSteps(Company company) {
    var globalConfig = onboardingQuestionConfigService.findAllEnabled();
    Map<String, Object> planOptions = featureAccessService.getAvailableOptionsByPlan(company.getPlan());
    List<com.parkflow.modules.onboarding.dto.OnboardingQuestionConfigDto> filtered = new java.util.ArrayList<>();
    for (var question : globalConfig) {
      int step = question.stepNumber();
      if (question.planRestricted()) {
        boolean allowed = switch (step) {
          case 8, 9 -> Boolean.TRUE.equals(planOptions.get("allowAgreementsAndMonthly"));
          case 10 -> Boolean.TRUE.equals(planOptions.get("allowMultiLocation"));
          case 11 -> Boolean.TRUE.equals(planOptions.get("allowAdvancedPermissions"));
          default -> true;
        };
        if (!allowed) continue;
      }
      filtered.add(question);
    }
    return filtered.stream()
        .sorted(Comparator
            .comparing((com.parkflow.modules.onboarding.dto.OnboardingQuestionConfigDto q) -> !q.required())
            .thenComparingInt(com.parkflow.modules.onboarding.dto.OnboardingQuestionConfigDto::stepNumber))
        .map(com.parkflow.modules.onboarding.dto.OnboardingQuestionConfigDto::stepNumber)
        .distinct()
        .toList();
  }

  private Company getCompany(UUID companyId) {
    UUID currentCompanyId = com.parkflow.modules.auth.security.SecurityUtils.requireCompanyId();
    com.parkflow.modules.auth.domain.UserRole role = com.parkflow.modules.auth.security.SecurityUtils.requireUserRole();
    if (!currentCompanyId.equals(companyId) && role != com.parkflow.modules.auth.domain.UserRole.SUPER_ADMIN) {
      throw new com.parkflow.modules.common.exception.OperationException(
          org.springframework.http.HttpStatus.FORBIDDEN, "Acceso denegado a la empresa solicitada");
    }
    return companyRepository.findById(companyId)
        .orElseThrow(() -> new com.parkflow.modules.common.exception.OperationException(
            org.springframework.http.HttpStatus.NOT_FOUND, "Empresa no encontrada"));
  }

  private OnboardingProgress findOrCreateProgress(Company company) {
    return onboardingProgressPort.findByCompanyId(company.getId())
        .orElseGet(() -> {
          OnboardingProgress created = new OnboardingProgress();
          created.setCompany(company);
          created.setProgressData(new LinkedHashMap<>());
          return onboardingProgressPort.save(created);
        });
  }
}
