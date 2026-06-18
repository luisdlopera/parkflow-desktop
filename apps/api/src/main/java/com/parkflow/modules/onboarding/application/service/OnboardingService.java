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

import com.parkflow.modules.parking.locker.dto.BatchLockerRequest;
import com.parkflow.modules.parking.locker.service.LockerService;
import com.parkflow.modules.parking.operation.domain.Rate;
import com.parkflow.modules.parking.operation.domain.RateType;
import com.parkflow.modules.parking.operation.repository.AppUserRepository;
import com.parkflow.modules.parking.operation.repository.RateRepository;
import com.parkflow.modules.parking.spaces.service.ParkingSpaceService;
import com.parkflow.modules.configuration.domain.RoundingMode;
import com.parkflow.modules.settings.application.service.SettingsVehicleTypeService;
import java.math.BigDecimal;

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
  private final LockerService lockerService;
  private final ParkingSpaceService parkingSpaceService;
  private final RateRepository rateRepository;
  private final SettingsVehicleTypeService settingsVehicleTypeService;

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
    validateStepData(step, data);
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

    // "Omitir" preserva lo que el usuario alcanzó a configurar (métodos de pago,
    // custodia de cascos, tipos de vehículo, etc.) y solo completa con valores
    // estándar lo que falte. Si no hay progreso, aplica configuración por defecto.
    Map<String, Object> progressData = progress.getProgressData();
    boolean hasProgress = progressData != null && !progressData.isEmpty();

    Map<String, Object> settings = hasProgress
        ? settingsMapper.buildSettingsFromProgress(company, progressData)
        : settingsMapper.defaultConfiguration(company);

    Map<String, Object> step1 = settingsMapper.stepMap(
        progressData != null ? progressData : new LinkedHashMap<>(), 1);
    String opStr = String.valueOf(step1.getOrDefault("operationalProfile",
        step1.getOrDefault("businessModel", "MIXED")));
    try {
      company.setOperationalProfile(OperationalProfile.valueOf(opStr));
    } catch (Exception e) {
      company.setOperationalProfile(OperationalProfile.MIXED);
    }
    companyRepository.save(company);

    companySettingsService.upsertSettings(company, settings);

    // Crear tipos de vehículo en el catálogo global + vínculo con la empresa
    @SuppressWarnings("unchecked")
    List<String> vehicleTypeCodes = (List<String>) settings.getOrDefault(
        "vehicleTypes", List.of("MOTORCYCLE", "CAR"));
    materializeVehicleTypes(companyId, vehicleTypeCodes);

    if (hasProgress) {
      // Preservar lockers y tarifas configuradas por el usuario.
      createLockersIfConfigured(companyId, step1);
      createRatesFromOnboarding(company, progressData);
    } else {
      // Crear tarifas default para que el ingreso de vehículos no falle.
      createDefaultRates(company);
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

  @Transactional
  public OnboardingStatusResponse completeOnboarding(UUID companyId) {
    Company company = getCompany(companyId);
    OnboardingProgress progress = findOrCreateProgress(company);

    // Idempotencia: si ya está completado, retornar estado actual sin cambios
    if (Boolean.TRUE.equals(company.getOnboardingCompleted())) {
      return status(companyId);
    }

    // Validar consistencia de capacidad antes de completar (por si el paso 2 no se re-guardó).
    Map<String, Object> step2 = settingsMapper.stepMap(progress.getProgressData(), 2);
    validateCapacityConsistency(step2);

    Map<String, Object> finalSettings = settingsMapper.buildSettingsFromProgress(company, progress.getProgressData());
    
    Map<String, Object> step1 = settingsMapper.stepMap(progress.getProgressData(), 1);
    String opStr = String.valueOf(step1.getOrDefault("operationalProfile", step1.getOrDefault("businessModel", "MIXED")));
    try {
      company.setOperationalProfile(OperationalProfile.valueOf(opStr));
    } catch (Exception e) {
      company.setOperationalProfile(OperationalProfile.MIXED);
    }
    
    companySettingsService.upsertSettings(company, finalSettings);

    // Crear tipos de vehículo en el catálogo global + vínculo con la empresa
    @SuppressWarnings("unchecked")
    List<String> vehicleTypeCodes = (List<String>) finalSettings.getOrDefault("vehicleTypes", List.of("MOTORCYCLE", "CAR"));
    materializeVehicleTypes(companyId, vehicleTypeCodes);

    // Crear lockers automáticamente si el usuario configuró custodia por lockers.
    createLockersIfConfigured(companyId, step1);

    // Materializar las celdas de parqueo configuradas en el paso 2.
    // Si no se crean aquí, el ingreso queda bloqueado porque no hay espacios disponibles.
    int totalCapacity = settingsMapper.extractNumber(step2.get("totalCapacity"), 0);
    if (totalCapacity > 0) {
      parkingSpaceService.resizeCapacity(companyId, totalCapacity);
    }

    // Crear tarifas operativas en la tabla rate desde la configuración del paso 3.
    // Necesarias para que el ingreso de vehículos no falle con "No se encontró tarifa aplicable".
    createRatesFromOnboarding(company, progress.getProgressData());

    progress.setCompleted(true);
    progress.setCurrentStep(12);
    progress.setCompletedAt(OffsetDateTime.now());
    onboardingProgressPort.save(progress);
    company.setOnboardingCompleted(true);
    companyRepository.save(company);
    return status(companyId);
  }

  private void materializeVehicleTypes(UUID companyId, List<String> codes) {
    for (String code : codes) {
      settingsVehicleTypeService.addTypeToCompany(companyId, code);
    }
  }

  private void createRatesFromOnboarding(Company company, Map<String, Object> progressData) {
    Map<String, Object> step1 = settingsMapper.stepMap(progressData, 1);
    Map<String, Object> step3 = settingsMapper.stepMap(progressData, 3);

    List<String> vehicleTypes = settingsMapper.asStringList(step1.get("vehicleTypes"), List.of("MOTORCYCLE", "CAR"));
    int baseValue = settingsMapper.extractNumber(step3.get("baseValue"), 2000);
    int graceMinutes = settingsMapper.extractNumber(step3.get("graceMinutes"), 5);

    Map<String, Object> ratesByType = new LinkedHashMap<>();
    Object rawByType = step3.get("ratesByType");
    if (rawByType instanceof Map<?, ?> map) {
      map.forEach((k, v) -> ratesByType.put(String.valueOf(k), v));
    }

    // Desactivar tarifas existentes de la empresa antes de crear las nuevas
    List<Rate> existing = rateRepository.findByCompanyId(company.getId());
    for (Rate r : existing) {
      r.setActive(false);
      r.setUpdatedAt(OffsetDateTime.now());
      rateRepository.save(r);
    }

    // Crear una tarifa HOURLY por tipo de vehículo
    for (String vehicleType : vehicleTypes) {
      int amount = settingsMapper.extractNumber(ratesByType.get(vehicleType), baseValue);
      Rate rate = new Rate();
      rate.setCompanyId(company.getId());
      rate.setName("Tarifa " + vehicleType);
      rate.setVehicleType(vehicleType);
      rate.setRateType(RateType.HOURLY);
      rate.setAmount(BigDecimal.valueOf(amount));
      rate.setGraceMinutes(graceMinutes);
      rate.setFractionMinutes(60);
      rate.setSite(null);
      rate.setBaseValue(BigDecimal.ZERO);
      rate.setBaseMinutes(0);
      rate.setAdditionalValue(BigDecimal.ZERO);
      rate.setAdditionalMinutes(0);
      rate.setRoundingMode(RoundingMode.NEAREST);
      rate.setLostTicketSurcharge(BigDecimal.ZERO);
      rate.setActive(true);
      rate.setCreatedAt(OffsetDateTime.now());
      rate.setUpdatedAt(OffsetDateTime.now());
      rateRepository.save(rate);
    }
  }

  private void createDefaultRates(Company company) {
    // Desactivar tarifas existentes
    List<Rate> existing = rateRepository.findByCompanyId(company.getId());
    for (Rate r : existing) {
      r.setActive(false);
      r.setUpdatedAt(OffsetDateTime.now());
      rateRepository.save(r);
    }

    // Crear tarifas default para MOTO y CARRO
    for (String vehicleType : List.of("MOTORCYCLE", "CAR")) {
      int amount = "MOTORCYCLE".equals(vehicleType) ? 1000 : 2000;
      Rate rate = new Rate();
      rate.setCompanyId(company.getId());
      rate.setName("Tarifa " + vehicleType);
      rate.setVehicleType(vehicleType);
      rate.setRateType(RateType.HOURLY);
      rate.setAmount(BigDecimal.valueOf(amount));
      rate.setGraceMinutes(5);
      rate.setFractionMinutes(60);
      rate.setSite(null);
      rate.setBaseValue(BigDecimal.ZERO);
      rate.setBaseMinutes(0);
      rate.setAdditionalValue(BigDecimal.ZERO);
      rate.setAdditionalMinutes(0);
      rate.setRoundingMode(RoundingMode.NEAREST);
      rate.setLostTicketSurcharge(BigDecimal.ZERO);
      rate.setActive(true);
      rate.setCreatedAt(OffsetDateTime.now());
      rate.setUpdatedAt(OffsetDateTime.now());
      rateRepository.save(rate);
    }
  }

  private void createLockersIfConfigured(UUID companyId, Map<String, Object> step1) {
    if (step1 == null) {
      return;
    }
    String handling = String.valueOf(step1.getOrDefault("helmetHandling", ""));
    if (!"LOCKERS".equals(handling)) {
      return;
    }
    int count = settingsMapper.extractNumber(step1.get("helmetTokenCount"), 0);
    if (count <= 0 || count > 9999) {
      return;
    }
    BatchLockerRequest batchRequest = new BatchLockerRequest("L-", 1, count);
    lockerService.createBatch(companyId, batchRequest);
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
    @SuppressWarnings("unchecked")
    Map<String, Object> persistedOpConfig = (Map<String, Object>) settings.getOrDefault("operationConfiguration", new LinkedHashMap<>());
    Map<String, Object> derivedOpConfig = operationalConfigurationService.getOperationConfiguration(companyId);
    
    Map<String, Object> mergedOpConfig = new LinkedHashMap<>(derivedOpConfig);
    mergedOpConfig.putAll(persistedOpConfig);
    
    mutable.put("operationConfiguration", mergedOpConfig);
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

  private void validateStepData(int step, Map<String, Object> data) {
    if (data == null) {
      return;
    }
    if (step == 1) {
      List<String> vehicleTypes = settingsMapper.asStringList(data.get("vehicleTypes"), List.of());
      if (!vehicleTypes.contains("MOTORCYCLE")) {
        return;
      }
      String handling = String.valueOf(data.getOrDefault("helmetHandling", ""));
      if (!"LOCKERS".equals(handling) && !"MANUAL".equals(handling) && !"NONE".equals(handling)) {
        throw new OperationException(HttpStatus.BAD_REQUEST, "Debes seleccionar una opción de custodia de cascos.");
      }
      if ("LOCKERS".equals(handling)) {
        int count = settingsMapper.extractNumber(data.get("helmetTokenCount"), 0);
        if (count <= 0) {
          throw new OperationException(HttpStatus.BAD_REQUEST, "La cantidad de lockers debe ser mayor a 0.");
        }
        if (count > 9999) {
          throw new OperationException(HttpStatus.BAD_REQUEST, "La cantidad de lockers no puede superar 9999.");
        }
      }
    }
    if (step == 2) {
      validateCapacityConsistency(data);
    }
  }

  private void validateCapacityConsistency(Map<String, Object> data) {
    int totalCapacity = settingsMapper.extractNumber(data.get("totalCapacity"), 0);
    if (totalCapacity <= 0) {
      throw new OperationException(HttpStatus.BAD_REQUEST, "La capacidad total debe ser mayor a 0.");
    }
    boolean controlSlots = Boolean.TRUE.equals(data.get("controlSlots"));
    if (!controlSlots) {
      return;
    }
    Map<String, Object> byType = new LinkedHashMap<>();
    Object rawByType = data.get("capacityByType");
    if (rawByType instanceof Map<?, ?> map) {
      map.forEach((k, v) -> byType.put(String.valueOf(k), v));
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
