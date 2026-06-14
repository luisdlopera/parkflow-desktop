package com.parkflow.modules.onboarding.application.service;

import com.parkflow.modules.licensing.domain.Company;
import com.parkflow.modules.licensing.domain.repository.CompanyPort;
import com.parkflow.modules.onboarding.application.port.in.OnboardingUseCase;
import com.parkflow.modules.onboarding.dto.OnboardingStatusResponse;
import com.parkflow.modules.onboarding.dto.CompanyCapabilitiesResponse;
import com.parkflow.modules.onboarding.domain.OnboardingProgress;
import com.parkflow.modules.onboarding.domain.repository.OnboardingProgressPort;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.configuration.service.OperationalConfigurationService;
import com.parkflow.modules.licensing.enums.OperationalProfile;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.parkflow.modules.parking.operation.repository.AppUserRepository;

@Service
@RequiredArgsConstructor
public class OnboardingService implements OnboardingUseCase {

  private final CompanyPort companyRepository;
  private final OnboardingProgressPort onboardingProgressPort;
  private final CompanySettingsService companySettingsService;
  private final FeatureAccessService featureAccessService;
  private final com.parkflow.modules.onboarding.domain.repository.CompanySettingsSnapshotPort companySettingsSnapshotPort;
  private final com.parkflow.modules.audit.application.port.out.AuditPort auditService;
  private final OperationalConfigurationService operationalConfigurationService;
  private final OnboardingQuestionConfigService onboardingQuestionConfigService;
  private final OnboardingSettingsMapper settingsMapper;
  private final com.parkflow.modules.parking.operation.domain.repository.ParkingSessionPort parkingSessionPort;
  private final com.parkflow.modules.auth.domain.repository.AuthSessionPort authSessionPort;
  private final AppUserRepository appUserRepository;

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
      // Si está restringida por plan, verificar que el plan lo permita
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
    // Ordenar: obligatorias primero, luego opcionales, manteniendo orden por stepNumber
    return filtered.stream()
        .sorted(java.util.Comparator
            .comparing((com.parkflow.modules.onboarding.dto.OnboardingQuestionConfigDto q) -> !q.required())
            .thenComparingInt(com.parkflow.modules.onboarding.dto.OnboardingQuestionConfigDto::stepNumber))
        .map(com.parkflow.modules.onboarding.dto.OnboardingQuestionConfigDto::stepNumber)
        .distinct()
        .toList();
  }

  @Transactional
  public OnboardingStatusResponse saveOnboardingStep(UUID companyId, int step, Map<String, Object> data, Integer targetStep) {
    Company company = getCompany(companyId);
    OnboardingProgress progress = findOrCreateProgress(company);
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

  @Transactional
  public OnboardingStatusResponse skipAndApplyDefaults(UUID companyId) {
    Company company = getCompany(companyId);
    OnboardingProgress progress = findOrCreateProgress(company);
    company.setOperationalProfile(OperationalProfile.MIXED);
    companyRepository.save(company);
    companySettingsService.upsertSettings(company, settingsMapper.defaultConfiguration(company));
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

    // Idempotencia: si ya está completado, retornar estado actual sin cambios
    if (Boolean.TRUE.equals(company.getOnboardingCompleted())) {
      return status(companyId);
    }
    Map<String, Object> finalSettings = settingsMapper.buildSettingsFromProgress(company, progress.getProgressData());
    
    Map<String, Object> step1 = settingsMapper.stepMap(progress.getProgressData(), 1);
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

    // Verificación informativa (no bloqueante): se permite reiniciar el onboarding
    // incluso con vehículos activos o cajas abiertas, ya que solo afecta configuración
    // futura y no compromete operaciones en curso. Se registra en auditoría para trazabilidad.
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
    final String creator = creatorEmail;
    snapshot.setCreatedBy(creator);
    companySettingsSnapshotPort.save(snapshot);

    company.setOnboardingCompleted(false);
    companyRepository.save(company);

    // Invalidar todas las sesiones activas de la empresa para forzar re-login con nuevo estado
    List<com.parkflow.modules.auth.domain.AppUser> companyUsers = appUserRepository.findByCompanyId(companyId);
    if (!companyUsers.isEmpty()) {
      // No cerrar sesión al usuario que realiza la acción
      List<com.parkflow.modules.auth.domain.AppUser> usersToInvalidate = companyUsers.stream()
          .filter(u -> !u.getEmail().equalsIgnoreCase(creator))
          .toList();
      if (!usersToInvalidate.isEmpty()) {
        authSessionPort.deleteByUserIn(usersToInvalidate);
        org.slf4j.LoggerFactory.getLogger(getClass()).info("Invalidated {} sessions for company {} ({}) during onboarding reset by {}",
            usersToInvalidate.size(), company.getName(), companyId, creator);
      }
    }

    progress.setCompleted(false);
    progress.setCurrentStep(1);
    progress.setUpdatedAt(OffsetDateTime.now());
    onboardingProgressPort.save(progress);

    auditService.record(
        com.parkflow.modules.audit.domain.AuditAction.REINICIAR_ONBOARDING,
        companyId,
        appUser,
        "onboardingCompleted=true, currentStep=" + progress.getCurrentStep(),
        "onboardingCompleted=false, currentStep=1",
        "Reinicio de onboarding multi-tenant. Snapshot v" + nextVersion + " guardado. " + auditContext.toString()
    );

    return status(companyId);
  }
}
