package com.parkflow.modules.onboarding.application.service;

import com.parkflow.modules.licensing.domain.Company;
import com.parkflow.modules.licensing.domain.repository.CompanyPort;
import com.parkflow.modules.onboarding.application.port.in.OnboardingUseCase;
import com.parkflow.modules.onboarding.application.port.out.OperationalConfigurationPort;
import com.parkflow.modules.onboarding.domain.OnboardingDomainInvariants;
import com.parkflow.modules.onboarding.dto.OnboardingStatusResponse;
import com.parkflow.modules.onboarding.dto.CompanyCapabilitiesResponse;
import com.parkflow.modules.onboarding.domain.OnboardingProgress;
import com.parkflow.modules.onboarding.domain.repository.OnboardingProgressPort;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.licensing.enums.OperationalProfile;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * @deprecated Use {@link OnboardingProgressService} and {@link OnboardingQueryService} instead.
 * This class maintained for backward compatibility during migration to hexagonal architecture.
 */
@Deprecated(since = "2.1.0", forRemoval = false)
@Slf4j
@Service
@RequiredArgsConstructor
public class OnboardingService implements OnboardingUseCase {

  private final CompanyPort companyRepository;
  private final OnboardingProgressPort onboardingProgressPort;
  private final CompanySettingsService companySettingsService;
  private final FeatureAccessService featureAccessService;
  private final com.parkflow.modules.onboarding.domain.repository.CompanySettingsSnapshotPort companySettingsSnapshotPort;
  private final com.parkflow.modules.audit.application.port.out.AuditPort auditService;
  private final OperationalConfigurationPort operationalConfigurationPort;
  private final OnboardingQuestionConfigService onboardingQuestionConfigService;
  private final OnboardingSettingsMapper settingsMapper;
  private final com.parkflow.modules.parking.operation.domain.repository.ParkingSessionPort parkingSessionPort;
  private final com.parkflow.modules.auth.domain.repository.AuthSessionPort authSessionPort;
  private final com.parkflow.modules.parking.operation.infrastructure.persistence.AppUserRepository appUserRepository;
  private final OnboardingMaterializationService materializationService;
  private final Step3DataValidator step3DataValidator;
  private final Step2DataValidator step2DataValidator;

  @Deprecated(since = "2.1.0", forRemoval = false)
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
        .sorted(java.util.Comparator
            .comparing((com.parkflow.modules.onboarding.dto.OnboardingQuestionConfigDto q) -> !q.required())
            .thenComparingInt(q -> q.stepNumber()))
        .map(q -> q.stepNumber())
        .distinct()
        .toList();
  }

  @Deprecated(since = "2.1.0", forRemoval = false)
  @Transactional
  public OnboardingStatusResponse saveOnboardingStep(UUID companyId, int step, Map<String, Object> data, Integer targetStep) {
    Company company = getCompany(companyId);
    OnboardingProgress progress = findOrCreateProgress(company);

    // E-05: Guard — completed onboarding cannot be mutated without explicit reset
    OnboardingDomainInvariants.assertNotCompleted(Boolean.TRUE.equals(company.getOnboardingCompleted()));

    validateStepData(step, data, progress.getProgressData());
    Map<String, Object> sanitized = settingsMapper.sanitizeStepDataByPlan(company, step, data);
    Map<String, Object> merged = new LinkedHashMap<>(progress.getProgressData());
    merged.put("step_" + step, sanitized);
    progress.setProgressData(merged);
    if (targetStep != null) {
      progress.setCurrentStep(targetStep);
    } else {
      progress.setCurrentStep(Math.max(progress.getCurrentStep(), Math.min(step + 1, 12)));
    }
    progress.setUpdatedAt(OffsetDateTime.now());
    onboardingProgressPort.save(progress);
    return status(companyId);
  }

  @Deprecated(since = "2.1.0", forRemoval = false)
  @Transactional
  public OnboardingStatusResponse skipAndApplyDefaults(UUID companyId) {
    Company company = getCompany(companyId);
    OnboardingProgress progress = findOrCreateProgress(company);

    // C-03: Idempotency guard — if already completed, return current state without re-materializing
    if (Boolean.TRUE.equals(company.getOnboardingCompleted())) {
      log.info("skipAndApplyDefaults called for already-completed company {}. Returning current state.", companyId);
      return status(companyId);
    }

    Map<String, Object> progressData = progress.getProgressData();
    boolean hasProgress = progressData != null && !progressData.isEmpty();

    Map<String, Object> settings = hasProgress
        ? settingsMapper.buildSettingsFromProgress(company, progressData)
        : settingsMapper.defaultConfiguration(company);

    Map<String, Object> step1 = settingsMapper.stepMap(
        progressData != null ? progressData : new LinkedHashMap<>(), 1);
    applyOperationalProfile(company, step1);
    companyRepository.save(company);
    companySettingsService.upsertSettings(company, settings);

    @SuppressWarnings("unchecked")
    List<String> vehicleTypeCodes = (List<String>) settings.getOrDefault("vehicleTypes", List.of("MOTORCYCLE", "CAR"));
    materializationService.materializeVehicleTypes(companyId, vehicleTypeCodes);

    @SuppressWarnings("unchecked")
    List<String> paymentMethodCodes = (List<String>) settings.getOrDefault("paymentMethods", List.of("CASH"));
    materializationService.materializePaymentMethods(companyId, paymentMethodCodes);

    if (hasProgress) {
      materializationService.createLockersIfConfigured(companyId, step1);
      materializationService.createRatesFromOnboarding(company, progressData);
    } else {
      materializationService.createDefaultRates(company);
    }

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

  @Deprecated(since = "2.1.0", forRemoval = false)
  @Transactional
  public OnboardingStatusResponse completeOnboarding(UUID companyId) {
    Company company = getCompany(companyId);
    OnboardingProgress progress = findOrCreateProgress(company);

    if (Boolean.TRUE.equals(company.getOnboardingCompleted())) {
      return status(companyId);
    }

    Map<String, Object> step2 = settingsMapper.stepMap(progress.getProgressData(), 2);
    validateCapacityConsistency(step2);

    Map<String, Object> finalSettings = settingsMapper.buildSettingsFromProgress(company, progress.getProgressData());
    Map<String, Object> step1 = settingsMapper.stepMap(progress.getProgressData(), 1);
    applyOperationalProfile(company, step1);

    companySettingsService.upsertSettings(company, finalSettings);

    @SuppressWarnings("unchecked")
    List<String> vehicleTypeCodes = (List<String>) finalSettings.getOrDefault("vehicleTypes", List.of("MOTORCYCLE", "CAR"));
    materializationService.materializeVehicleTypes(companyId, vehicleTypeCodes);

    @SuppressWarnings("unchecked")
    List<String> paymentMethodCodes = (List<String>) finalSettings.getOrDefault("paymentMethods", List.of("CASH"));
    materializationService.materializePaymentMethods(companyId, paymentMethodCodes);

    materializationService.createLockersIfConfigured(companyId, step1);

    int totalCapacity = settingsMapper.extractNumber(step2.get("totalCapacity"), 0);
    materializationService.resizeCapacity(companyId, totalCapacity);

    materializationService.createRatesFromOnboarding(company, progress.getProgressData());

    progress.setCompleted(true);
    progress.setCurrentStep(12);
    progress.setCompletedAt(OffsetDateTime.now());
    onboardingProgressPort.save(progress);
    company.setOnboardingCompleted(true);
    companyRepository.save(company);
    return status(companyId);
  }

  @Deprecated(since = "2.1.0", forRemoval = false)
  @Override
  @Transactional(readOnly = true)
  public boolean isFeatureEnabled(UUID companyId, String featureKey) {
    Company company = getCompany(companyId);
    Map<String, Object> settings = companySettingsService.getSettingsOrDefault(company);
    return featureAccessService.isFeatureEnabled(settings, featureKey);
  }

  @Deprecated(since = "2.1.0", forRemoval = false)
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

  @Deprecated(since = "2.1.0", forRemoval = false)
  @Override
  @Transactional(readOnly = true)
  public CompanyCapabilitiesResponse getCapabilities(UUID companyId) {
    Company company = getCompany(companyId);
    Map<String, Object> plan = featureAccessService.getAvailableOptionsByPlan(company.getPlan());
    Map<String, Object> settings = companySettingsService.getSettingsOrDefault(company);
    List<String> rawVehicleTypes = settingsMapper.asStringList(settings.get("vehicleTypes"), List.of("MOTO", "CARRO"));
    List<String> vehicleTypes = rawVehicleTypes.stream()
        .map(settingsMapper::mapVehicleTypeCode)
        .filter(Objects::nonNull)
        .toList();
    List<String> rawPaymentMethods = settingsMapper.asStringList(settings.get("paymentMethods"), List.of("EFECTIVO"));
    List<String> paymentMethods = rawPaymentMethods.stream()
        .map(settingsMapper::mapPaymentMethodCode)
        .filter(Objects::nonNull)
        .toList();
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

  @Deprecated(since = "2.1.0", forRemoval = false)
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
    long activeSessions = parkingSessionPort.countActive(companyId);
    StringBuilder auditContext = new StringBuilder();
    if (activeSessions > 0) {
      auditContext.append("Reinicio con ").append(activeSessions).append(" vehículos activos. ");
    }
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
    String creatorEmail = "SYSTEM";
    org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
    if (auth != null) {
      if (auth.getPrincipal() instanceof com.parkflow.modules.auth.domain.AppUser user) {
        appUser = user;
        creatorEmail = user.getEmail();
      } else if (auth.getPrincipal() instanceof com.parkflow.modules.auth.security.AuthPrincipal principal) {
        creatorEmail = principal.email();
      }
    }
    snapshot.setCreatedBy(creatorEmail);
    companySettingsSnapshotPort.save(snapshot);
    company.setOnboardingCompleted(false);
    companyRepository.save(company);
    List<com.parkflow.modules.auth.domain.AppUser> companyUsers = appUserRepository.findByCompanyId(companyId);
    if (!companyUsers.isEmpty()) {
      final String creator = creatorEmail;
      List<com.parkflow.modules.auth.domain.AppUser> usersToInvalidate = companyUsers.stream()
          .filter(u -> !u.getEmail().equalsIgnoreCase(creator))
          .toList();
      if (!usersToInvalidate.isEmpty()) {
        authSessionPort.deleteByUserIn(usersToInvalidate);
        org.slf4j.LoggerFactory.getLogger(getClass()).info(
            "Invalidated {} sessions for company {} during onboarding reset by {}",
            usersToInvalidate.size(), companyId, creatorEmail);
      }
    }
    progress.setCompleted(false);
    progress.setCurrentStep(1);
    progress.setUpdatedAt(OffsetDateTime.now());
    onboardingProgressPort.save(progress);
    auditService.record(
        com.parkflow.modules.audit.domain.AuditAction.REINICIAR_ONBOARDING,
        companyId, appUser,
        "onboardingCompleted=true, currentStep=" + progress.getCurrentStep(),
        "onboardingCompleted=false, currentStep=1",
        "Reinicio de onboarding multi-tenant. Snapshot v" + nextVersion + " guardado. " + auditContext);
    return status(companyId);
  }

  private void applyOperationalProfile(Company company, Map<String, Object> step1) {
    String opStr = String.valueOf(step1.getOrDefault("operationalProfile",
        step1.getOrDefault("businessModel", "MIXED")));
    try {
      company.setOperationalProfile(OperationalProfile.valueOf(opStr));
    } catch (Exception e) {
      company.setOperationalProfile(OperationalProfile.MIXED);
    }
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

  private void validateStepData(int step, Map<String, Object> data, Map<String, Object> existingProgress) {
    if (data == null) return;
    if (step == 1) {
      List<String> vehicleTypes = settingsMapper.asStringList(data.get("vehicleTypes"), List.of());
      if (!vehicleTypes.contains("MOTORCYCLE")) return;
      String handling = String.valueOf(data.getOrDefault("helmetHandling", ""));
      if (!"LOCKERS".equals(handling) && !"MANUAL".equals(handling) && !"NONE".equals(handling)) {
        throw new OperationException(HttpStatus.BAD_REQUEST, "Debes seleccionar una opción de custodia de cascos.");
      }
      if ("LOCKERS".equals(handling)) {
        int count = settingsMapper.extractNumber(data.get("helmetTokenCount"), 0);
        if (count <= 0) throw new OperationException(HttpStatus.BAD_REQUEST, "La cantidad de lockers debe ser mayor a 0.");
        if (count > 9999) throw new OperationException(HttpStatus.BAD_REQUEST, "La cantidad de lockers no puede superar 9999.");
      }
    }
    if (step == 2) {
      // I-01: Validate capacityByType keys ⊆ vehicleTypes from step 1 (cross-step consistency)
      List<String> vehicleTypes = extractVehicleTypesFromProgress(existingProgress);
      step2DataValidator.validateAndSanitize(data, vehicleTypes);
    }
    if (step == 3) validateStep3Rates(data, existingProgress);  // C-01, C-04, S-01, S-03, I-07
  }

  // C-01, C-04, I-07: Server-side validation for Step 3 with cross-step context
  private void validateStep3Rates(Map<String, Object> data, Map<String, Object> existingProgress) {
    List<String> vehicleTypes = extractVehicleTypesFromProgress(existingProgress);
    Step3DataValidator.Step3ValidationResult result = step3DataValidator.validateWithVehicleTypes(data, vehicleTypes);
    if (!result.isValid) {
      StringBuilder msg = new StringBuilder("Datos de tarifas inválidos:");
      result.errors.forEach((field, error) -> msg.append(" [").append(field).append(": ").append(error).append("]"));
      throw new OperationException(HttpStatus.BAD_REQUEST, msg.toString());
    }
  }

  private void validateCapacityConsistency(Map<String, Object> data) {
    int totalCapacity = settingsMapper.extractNumber(data.get("totalCapacity"), 0);
    if (totalCapacity <= 0) {
      throw new OperationException(HttpStatus.BAD_REQUEST, "La capacidad total debe ser mayor a 0.");
    }
    boolean controlSlots = Boolean.TRUE.equals(data.get("controlSlots"));
    if (!controlSlots) return;
    Map<String, Object> byType = new LinkedHashMap<>();
    Object rawByType = data.get("capacityByType");
    if (rawByType instanceof Map<?, ?> map) {
      map.forEach((k, v) -> {
        if (v != null) {
          byType.put(String.valueOf(k), v);
        }
      });
    }
    int sumByType = byType.values().stream()
        .mapToInt(v -> settingsMapper.extractNumber(v, 0))
        .sum();
    if (sumByType > totalCapacity) {
      throw new OperationException(HttpStatus.BAD_REQUEST,
          "La suma de las capacidades configuradas por tipo (" + sumByType
              + ") supera la capacidad total permitida (" + totalCapacity + ").");
    }
  }

  /**
   * Extracts vehicle types from existing progress data (step 1).
   * Used for cross-step consistency validation in C-01 and I-01.
   */
  private List<String> extractVehicleTypesFromProgress(Map<String, Object> existingProgress) {
    if (existingProgress == null || existingProgress.isEmpty()) return List.of();
    Map<String, Object> step1 = settingsMapper.stepMap(existingProgress, 1);
    List<String> rawTypes = settingsMapper.asStringList(step1.get("vehicleTypes"), List.of());
    return rawTypes.stream().map(settingsMapper::mapVehicleTypeCode).toList();
  }
}
