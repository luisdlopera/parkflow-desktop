package com.parkflow.modules.onboarding.application.service;

import com.parkflow.modules.licensing.domain.Company;
import com.parkflow.modules.licensing.domain.repository.CompanyPort;
import com.parkflow.modules.licensing.enums.OperationalProfile;
import com.parkflow.modules.configuration.service.OperationalConfigurationService;
import com.parkflow.modules.onboarding.application.port.in.OnboardingUseCase;
import com.parkflow.modules.onboarding.dto.OnboardingStatusResponse;
import com.parkflow.modules.onboarding.dto.CompanyCapabilitiesResponse;
import com.parkflow.modules.onboarding.domain.OnboardingProgress;
import com.parkflow.modules.onboarding.domain.repository.OnboardingProgressPort;
import com.parkflow.modules.common.exception.OperationException;
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
public class OnboardingService implements OnboardingUseCase {

  private final CompanyPort companyRepository;
  private final OnboardingProgressPort onboardingProgressPort;
  private final CompanySettingsService companySettingsService;
  private final FeatureAccessService featureAccessService;
  private final com.parkflow.modules.onboarding.domain.repository.CompanySettingsSnapshotPort companySettingsSnapshotPort;
  private final com.parkflow.modules.audit.service.AuditService auditService;
  private final OperationalConfigurationService operationalConfigurationService;

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
    onboardingProgressPort.save(progress);
    return status(companyId);
  }

  @Transactional
  public OnboardingStatusResponse skipAndApplyDefaults(UUID companyId) {
    Company company = getCompany(companyId);
    OnboardingProgress progress = findOrCreateProgress(company);
    company.setOperationalProfile(OperationalProfile.MIXED);
    companyRepository.save(company);
    companySettingsService.upsertSettings(company, defaultConfiguration(company));
    progress.setSkipped(true);
    progress.setCompleted(true);
    progress.setCurrentStep(12);
    progress.setSkippedAt(OffsetDateTime.now());
    progress.setCompletedAt(OffsetDateTime.now());
    onboardingProgressPort.save(progress);
    company.setOnboardingCompleted(true);
    companyRepository.save(company);
    return status(companyId);
  }

  @Transactional
  public OnboardingStatusResponse completeOnboarding(UUID companyId) {
    Company company = getCompany(companyId);
    OnboardingProgress progress = findOrCreateProgress(company);
    Map<String, Object> finalSettings = buildSettingsFromProgress(company, progress.getProgressData());
    
    Map<String, Object> step1 = stepMap(progress.getProgressData(), 1);
    String opStr = String.valueOf(step1.getOrDefault("operationalProfile", step1.getOrDefault("businessModel", "MIXED")));
    try {
      company.setOperationalProfile(OperationalProfile.valueOf(opStr));
    } catch (Exception e) {
      company.setOperationalProfile(OperationalProfile.MIXED);
    }
    
    companySettingsService.upsertSettings(company, finalSettings);
    progress.setCompleted(true);
    progress.setCurrentStep(12);
    progress.setCompletedAt(OffsetDateTime.now());
    onboardingProgressPort.save(progress);
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
    Map<String, Object> settings = companySettingsService.getSettingsOrDefault(company);
    Map<String, Object> mutable = new LinkedHashMap<>(settings);
    mutable.put("businessModel", company.getOperationalProfile().name());
    mutable.put("operationalProfile", company.getOperationalProfile().name());
    mutable.put("operationConfiguration", operationalConfigurationService.getOperationConfiguration(companyId));
    return mutable;
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
    com.parkflow.modules.auth.domain.UserRole role = com.parkflow.modules.auth.security.SecurityUtils.requireUserRole();
    
    if (!currentCompanyId.equals(companyId) && role != com.parkflow.modules.auth.domain.UserRole.SUPER_ADMIN) {
      throw new OperationException(HttpStatus.FORBIDDEN, "Acceso denegado a la empresa solicitada");
    }

    return companyRepository.findById(companyId)
        .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Empresa no encontrada"));
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

    String opStr = String.valueOf(step1.getOrDefault("operationalProfile", step1.getOrDefault("businessModel", "MIXED")));
    OperationalProfile op = OperationalProfile.MIXED;
    try {
      op = OperationalProfile.valueOf(opStr);
    } catch (Exception e) {
      // ignore
    }

    List<String> vehicleTypes;
    if (op == OperationalProfile.MOTORCYCLE_ONLY) {
      vehicleTypes = List.of("MOTORCYCLE");
    } else if (op == OperationalProfile.CAR_ONLY) {
      vehicleTypes = List.of("CAR");
    } else {
      vehicleTypes = asStringList(step1.get("vehicleTypes"), List.of("MOTO", "CARRO"));
    }

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

  @Override
  @Transactional
  public OnboardingStatusResponse resetOnboarding(UUID companyId, String reason) {
    UUID currentCompanyId = com.parkflow.modules.auth.security.SecurityUtils.requireCompanyId();
    com.parkflow.modules.auth.domain.UserRole role = com.parkflow.modules.auth.security.SecurityUtils.requireUserRole();
    
    if (!currentCompanyId.equals(companyId) && role != com.parkflow.modules.auth.domain.UserRole.SUPER_ADMIN) {
      throw new OperationException(HttpStatus.FORBIDDEN, "Acceso denegado a la empresa solicitada");
    }
    if (role != com.parkflow.modules.auth.domain.UserRole.SUPER_ADMIN && role != com.parkflow.modules.auth.domain.UserRole.ADMIN) {
      throw new OperationException(HttpStatus.FORBIDDEN, "Solo administradores pueden reiniciar el onboarding");
    }

    Company company = getCompany(companyId);
    OnboardingProgress progress = findOrCreateProgress(company);
    Map<String, Object> currentSettings = companySettingsService.getSettingsOrDefault(company);

    int nextVersion = companySettingsSnapshotPort.countByCompanyId(companyId) + 1;

    com.parkflow.modules.onboarding.domain.CompanySettingsSnapshot snapshot = new com.parkflow.modules.onboarding.domain.CompanySettingsSnapshot();
    snapshot.setCompany(company);
    snapshot.setVersion(nextVersion);
    snapshot.setSettingsJson(new LinkedHashMap<>(currentSettings));
    snapshot.setProgressData(new LinkedHashMap<>(progress.getProgressData()));
    snapshot.setReason(reason != null && !reason.isBlank() ? reason : "RESTART_ONBOARDING");
    snapshot.setCreatedAt(OffsetDateTime.now());
    
    com.parkflow.modules.auth.domain.AppUser appUser = null;
    String creator = "SYSTEM";
    org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
    if (auth != null) {
      if (auth.getPrincipal() instanceof com.parkflow.modules.auth.domain.AppUser user) {
        appUser = user;
        creator = user.getEmail();
      } else if (auth.getPrincipal() instanceof com.parkflow.modules.auth.security.AuthPrincipal principal) {
        creator = principal.email();
      }
    }
    snapshot.setCreatedBy(creator);
    companySettingsSnapshotPort.save(snapshot);

    company.setOnboardingCompleted(false);
    companyRepository.save(company);

    progress.setCompleted(false);
    progress.setCurrentStep(1);
    progress.setUpdatedAt(OffsetDateTime.now());
    onboardingProgressPort.save(progress);

    auditService.record(
        com.parkflow.modules.audit.domain.AuditAction.REINICIAR_ONBOARDING,
        appUser,
        "onboardingCompleted=true, currentStep=" + progress.getCurrentStep(),
        "onboardingCompleted=false, currentStep=1",
        "Reinicio de onboarding multi-tenant. Snapshot v" + nextVersion + " guardado."
    );

    return status(companyId);
  }
}
