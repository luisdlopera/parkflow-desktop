package com.parkflow.modules.onboarding.service;

import com.parkflow.modules.licensing.entity.Company;
import com.parkflow.modules.licensing.repository.CompanyRepository;
import com.parkflow.modules.onboarding.dto.OnboardingStatusResponse;
import com.parkflow.modules.onboarding.dto.CompanyCapabilitiesResponse;
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
    Map<String, Object> sanitized = sanitizeStepDataByPlan(company, step, data);
    Map<String, Object> merged = new LinkedHashMap<>(progress.getProgressData());
    merged.put("step_" + step, sanitized);
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

  @Transactional(readOnly = true)
  public Map<String, Object> getCompanySettings(UUID companyId) {
    Company company = getCompany(companyId);
    return companySettingsService.getSettingsOrDefault(company);
  }

  @Transactional(readOnly = true)
  public CompanyCapabilitiesResponse getCapabilities(UUID companyId) {
    Company company = getCompany(companyId);
    Map<String, Object> plan = featureAccessService.getAvailableOptionsByPlan(company.getPlan());
    Map<String, Object> settings = companySettingsService.getSettingsOrDefault(company);
    List<String> vehicleTypes = asStringList(settings.get("vehicleTypes"), List.of("MOTO", "CARRO"));
    List<String> paymentMethods = asStringList(settings.get("paymentMethods"), List.of("EFECTIVO"));
    int siteCount = extractSitesCount(settings.get("sites"));
    boolean cashEnabled = moduleEnabled(settings, "cash", true);
    boolean shiftsEnabled = moduleEnabled(settings, "shifts", false);
    boolean clientsEnabled = moduleEnabled(settings, "clients", false);
    boolean agreementsEnabled = moduleEnabled(settings, "agreements", false);
    return new CompanyCapabilitiesResponse(
        Boolean.TRUE.equals(company.getOnboardingCompleted()),
        Boolean.TRUE.equals(plan.get("allowMultiLocation")),
        Boolean.TRUE.equals(plan.get("allowAdvancedPermissions")),
        cashEnabled,
        shiftsEnabled,
        clientsEnabled,
        agreementsEnabled,
        vehicleTypes.size(),
        paymentMethods.size(),
        siteCount,
        vehicleTypes,
        paymentMethods);
  }

  private Company getCompany(UUID companyId) {
    UUID currentCompanyId = com.parkflow.modules.auth.security.SecurityUtils.requireCompanyId();
    com.parkflow.modules.parking.operation.domain.UserRole role = com.parkflow.modules.auth.security.SecurityUtils.requireUserRole();
    
    if (!currentCompanyId.equals(companyId) && role != com.parkflow.modules.parking.operation.domain.UserRole.SUPER_ADMIN) {
      throw new OperationException(HttpStatus.FORBIDDEN, "Acceso denegado a la empresa solicitada");
    }

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

  private Map<String, Object> sanitizeStepDataByPlan(Company company, int step, Map<String, Object> data) {
    Map<String, Object> out = new LinkedHashMap<>(data);
    Map<String, Object> access = featureAccessService.getAvailableOptionsByPlan(company.getPlan());
    if (step == 6) {
      List<String> allowedPayments = asStringList(access.get("paymentMethods"), List.of("EFECTIVO"));
      List<String> current = asStringList(out.get("paymentMethods"), List.of("EFECTIVO"));
      out.put("paymentMethods", current.stream().filter(allowedPayments::contains).toList());
    }
    if ((step == 8 || step == 9) && Boolean.FALSE.equals(access.get("allowAgreementsAndMonthly"))) {
      out.put("enabled", false);
    }
    if (step == 10 && Boolean.FALSE.equals(access.get("allowMultiLocation"))) {
      out.put("multiSite", false);
    }
    if (step == 11 && Boolean.FALSE.equals(access.get("allowAdvancedPermissions"))) {
      out.put("advanced", false);
    }
    return out;
  }

  private Map<String, Object> buildSettingsFromProgress(Company company, Map<String, Object> progressData) {
    if (progressData == null || progressData.isEmpty()) {
      return defaultConfiguration(company);
    }
    Map<String, Object> step1 = stepMap(progressData, 1);
    Map<String, Object> step6 = stepMap(progressData, 6);
    Map<String, Object> step10 = stepMap(progressData, 10);

    List<String> vehicleTypes = asStringList(step1.get("vehicleTypes"), List.of("MOTO", "CARRO"));
    List<String> paymentMethods = asStringList(step6.get("paymentMethods"), List.of("EFECTIVO"));
    boolean multiSite = Boolean.TRUE.equals(step10.get("multiSite"));
    List<Map<String, String>> sites = multiSite
        ? List.of(Map.of("code", "PRINCIPAL", "name", "Sede principal"), Map.of("code", "SECUNDARIA", "name", "Sede secundaria"))
        : List.of(Map.of("code", "PRINCIPAL", "name", "Sede principal"));

    Map<String, Object> settings = new LinkedHashMap<>();
    settings.put("plan", company.getPlan().name());
    settings.put("vehicleTypes", vehicleTypes);
    settings.put("paymentMethods", paymentMethods);
    settings.put("sites", sites);
    settings.put("wizard", progressData);
    settings.put("modules", inferModules(progressData));
    return settings;
  }

  private Map<String, Object> stepMap(Map<String, Object> progressData, int step) {
    Object raw = progressData.get("step_" + step);
    if (raw instanceof Map<?, ?> map) {
      Map<String, Object> out = new LinkedHashMap<>();
      map.forEach((k, v) -> out.put(String.valueOf(k), v));
      return out;
    }
    return Map.of();
  }

  private int extractSitesCount(Object rawSites) {
    if (!(rawSites instanceof List<?> sites)) return 1;
    return Math.max(1, sites.size());
  }

  private boolean moduleEnabled(Map<String, Object> settings, String key, boolean fallback) {
    Object raw = settings.get("modules");
    if (raw instanceof Map<?, ?> map) {
      Object value = map.get(key);
      if (value instanceof Boolean b) return b;
    }
    return fallback;
  }

  private List<String> asStringList(Object raw, List<String> fallback) {
    if (!(raw instanceof List<?> list)) return fallback;
    List<String> out = list.stream().map(String::valueOf).map(String::trim).filter(s -> !s.isBlank()).toList();
    return out.isEmpty() ? fallback : out;
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
