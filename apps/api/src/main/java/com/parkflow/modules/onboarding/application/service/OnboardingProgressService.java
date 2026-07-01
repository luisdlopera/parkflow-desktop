package com.parkflow.modules.onboarding.application.service;

import com.parkflow.modules.licensing.domain.Company;
import com.parkflow.modules.licensing.domain.repository.CompanyPort;
import com.parkflow.modules.onboarding.application.port.in.OnboardingQueryUseCase;
import com.parkflow.modules.onboarding.application.port.in.OnboardingProgressUseCase;
import com.parkflow.modules.onboarding.application.port.out.OperationalConfigurationPort;
import com.parkflow.modules.onboarding.domain.OnboardingDomainInvariants;
import com.parkflow.modules.onboarding.dto.OnboardingStatusResponse;
import com.parkflow.modules.onboarding.domain.OnboardingProgress;
import com.parkflow.modules.onboarding.domain.repository.OnboardingProgressPort;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.licensing.enums.OperationalProfile;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Handles onboarding progress operations: save steps, complete, skip, reset.
 * Max 4 methods as per hexagonal architecture.
 */
@SuppressWarnings("deprecation")
@Slf4j
@Service
@RequiredArgsConstructor
public class OnboardingProgressService implements OnboardingProgressUseCase {

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
  private final Step2DataValidator step2DataValidator;
  private final Step3DataValidator step3DataValidator;
  private final OnboardingQueryUseCase onboardingQueryUseCase;
  private final com.parkflow.modules.onboarding.domain.OnboardingStateMachine onboardingStateMachine;
  private final org.springframework.context.ApplicationEventPublisher eventPublisher;
  private final com.parkflow.modules.onboarding.infrastructure.persistence.OnboardingRuleSnapshotRepository ruleSnapshotRepository;

  @Transactional
  public OnboardingStatusResponse saveOnboardingStep(UUID companyId, int step, Map<String, Object> data, Integer targetStep) {
    try {
      Company company = getCompany(companyId);
      OnboardingProgress progress = findOrCreateProgress(company);

      // E-05: Guard — completed onboarding cannot be mutated without explicit reset
      OnboardingDomainInvariants.assertNotCompleted(Boolean.TRUE.equals(company.getOnboardingCompleted()));

      // C-06: isPlanStepAllowed is enforced inside sanitizeStepDataByPlan() — throws FORBIDDEN
      validateStepData(step, data, progress.getProgressData());
      Map<String, Object> sanitized = settingsMapper.sanitizeStepDataByPlan(company, step, data);
      Map<String, Object> merged = new LinkedHashMap<>(progress.getProgressData());
      merged.put("step_" + step, sanitized);
      progress.setProgressData(merged);

      // I-02, I-03: Use state machine to determine the next valid step
      int nextStep = onboardingStateMachine.determineNextStep(company, progress.getCurrentStep(), targetStep);
      progress.setCurrentStep(nextStep);

      progress.setUpdatedAt(OffsetDateTime.now());
      onboardingProgressPort.save(progress);
      return onboardingQueryUseCase.status(companyId);
    } catch (OperationException ex) {
      throw ex;
    } catch (RuntimeException ex) {
      if (step == 3) {
        log.warn("Step 3 save failed for company {}: {}", companyId, ex.getMessage(), ex);
        throw new OperationException(
            HttpStatus.BAD_REQUEST,
            "No pudimos validar las tarifas. Revisa los campos marcados en rojo e inténtalo de nuevo.");
      }
      throw ex;
    }
  }

  @Transactional
  public OnboardingStatusResponse skipAndApplyDefaults(UUID companyId) {
    Company company = getCompany(companyId);
    OnboardingProgress progress = findOrCreateProgress(company);

    // C-03: Idempotency guard — if already completed, return current state without re-materializing
    if (Boolean.TRUE.equals(company.getOnboardingCompleted())) {
      log.info("skipAndApplyDefaults called for already-completed company {}. Returning current state.", companyId);
      return onboardingQueryUseCase.status(companyId);
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

    eventPublisher.publishEvent(new com.parkflow.modules.onboarding.domain.OnboardingCompletedEvent(
        this, company, progressData, settings, true
    ));

    var snapshot = ruleSnapshotRepository.findLatestSnapshot();
    if (snapshot != null) {
      progress.setRuleVersion(snapshot.getVersion());
      progress.setSnapshotHash(String.valueOf(snapshot.getValidationRules().hashCode()));
    }

    progress.setSkipped(true);
    progress.setCompleted(true);
    progress.setCurrentStep(12);
    progress.setSkippedAt(OffsetDateTime.now());
    progress.setCompletedAt(OffsetDateTime.now());
    onboardingProgressPort.save(progress);
    company.setOnboardingCompleted(true);
    companyRepository.save(company);
    return onboardingQueryUseCase.status(companyId);
  }

  @Transactional
  public OnboardingStatusResponse completeOnboarding(UUID companyId) {
    Company company = getCompany(companyId);
    OnboardingProgress progress = findOrCreateProgress(company);

    // C-03: Idempotency — already completed returns current state
    if (Boolean.TRUE.equals(company.getOnboardingCompleted())) {
      return onboardingQueryUseCase.status(companyId);
    }

    Map<String, Object> progressData = progress.getProgressData();
    Map<String, Object> step1 = settingsMapper.stepMap(progressData, 1);
    Map<String, Object> step2 = settingsMapper.stepMap(progressData, 2);
    Map<String, Object> step3 = settingsMapper.stepMap(progressData, 3);

    // INV-1: Pre-completion cross-step consistency checks (C-01, I-01)
    List<String> vehicleTypes = extractVehicleTypesFromProgress(progressData);

    // C-01: Assert ratesByType keys ⊆ vehicleTypes
    if (!step3.isEmpty() && step3.get("ratesByType") instanceof java.util.Map<?, ?> ratesMap) {
      java.util.Map<String, Object> typedRates = new java.util.LinkedHashMap<>();
      ratesMap.forEach((k, v) -> typedRates.put(String.valueOf(k), v));
      if (!vehicleTypes.isEmpty()) {
        OnboardingDomainInvariants.assertRatesByTypeConsistentWithVehicleTypes(typedRates, vehicleTypes);
      }
    }

    // I-01: Assert capacityByType keys ⊆ vehicleTypes
    if (Boolean.TRUE.equals(step2.get("controlSlots"))
        && step2.get("capacityByType") instanceof java.util.Map<?, ?> capMap) {
      java.util.Map<String, Object> typedCap = new java.util.LinkedHashMap<>();
      capMap.forEach((k, v) -> typedCap.put(String.valueOf(k), v));
      if (!vehicleTypes.isEmpty()) {
        OnboardingDomainInvariants.assertCapacityByTypeConsistentWithVehicleTypes(typedCap, vehicleTypes);
      }
    }

    validateCapacityConsistency(step2);

    Map<String, Object> finalSettings = settingsMapper.buildSettingsFromProgress(company, progressData);
    applyOperationalProfile(company, step1);

    companySettingsService.upsertSettings(company, finalSettings);

    eventPublisher.publishEvent(new com.parkflow.modules.onboarding.domain.OnboardingCompletedEvent(
        this, company, progressData, finalSettings, false
    ));

    var snapshot = ruleSnapshotRepository.findLatestSnapshot();
    if (snapshot != null) {
      progress.setRuleVersion(snapshot.getVersion());
      progress.setSnapshotHash(String.valueOf(snapshot.getValidationRules().hashCode()));
    }

    progress.setCompleted(true);
    progress.setCurrentStep(12);
    progress.setCompletedAt(OffsetDateTime.now());
    onboardingProgressPort.save(progress);
    company.setOnboardingCompleted(true);
    companyRepository.save(company);
    return onboardingQueryUseCase.status(companyId);
  }

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
    return onboardingQueryUseCase.status(companyId);
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
      // I-01: Validate capacityByType keys ⊆ vehicleTypes from step 1
      List<String> vehicleTypes = extractVehicleTypesFromProgress(existingProgress);
      step2DataValidator.validateAndSanitize(data, vehicleTypes);
    }

    if (step == 3) {
      // C-01: Cross-step consistency — ratesByType keys must be ⊆ step1.vehicleTypes
      List<String> vehicleTypes = extractVehicleTypesFromProgress(existingProgress);
      Step3DataValidator.Step3ValidationResult result =
          step3DataValidator.validateWithVehicleTypes(data, vehicleTypes);
      if (!result.isValid) {
        StringBuilder msg = new StringBuilder("Datos de tarifas inválidos:");
        result.errors.forEach((field, error) -> msg.append(" [").append(field).append(": ").append(error).append("]"));
        throw new OperationException(HttpStatus.BAD_REQUEST, msg.toString());
      }
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
   * Extracts vehicle types from the existing progress data (step 1).
   * Used for cross-step consistency validation.
   *
   * @param existingProgress the current onboarding progress data
   * @return list of vehicle type codes, or empty list if step 1 not yet saved
   */
  private List<String> extractVehicleTypesFromProgress(Map<String, Object> existingProgress) {
    if (existingProgress == null || existingProgress.isEmpty()) return List.of();
    Map<String, Object> step1 = settingsMapper.stepMap(existingProgress, 1);
    List<String> rawTypes = settingsMapper.asStringList(step1.get("vehicleTypes"), List.of());
    return rawTypes.stream().map(settingsMapper::mapVehicleTypeCode).toList();
  }
}
