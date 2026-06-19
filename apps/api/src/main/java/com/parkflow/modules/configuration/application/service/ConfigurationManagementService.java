package com.parkflow.modules.configuration.application.service;

import com.parkflow.modules.audit.domain.AuditAction;
import com.parkflow.modules.audit.service.AuditService;
import com.parkflow.modules.configuration.application.port.in.CapacityManagementUseCase;
import com.parkflow.modules.configuration.application.port.in.FeatureConfigurationUseCase;
import com.parkflow.modules.configuration.application.port.in.HelmetHandlingUseCase;
import com.parkflow.modules.configuration.application.port.in.ModuleConfigurationUseCase;
import com.parkflow.modules.configuration.application.port.in.RegionConfigurationUseCase;
import com.parkflow.modules.configuration.application.port.in.ShiftConfigurationUseCase;
import com.parkflow.modules.configuration.dto.CapacityRequest;
import com.parkflow.modules.configuration.dto.CapacityResponse;
import com.parkflow.modules.configuration.dto.FeatureConfigurationRequest;
import com.parkflow.modules.configuration.dto.FeatureConfigurationResponse;
import com.parkflow.modules.configuration.dto.HelmetHandlingRequest;
import com.parkflow.modules.configuration.dto.HelmetHandlingResponse;
import com.parkflow.modules.configuration.dto.ModuleConfigurationRequest;
import com.parkflow.modules.configuration.dto.ModuleConfigurationResponse;
import com.parkflow.modules.configuration.dto.RegionConfigurationRequest;
import com.parkflow.modules.configuration.dto.RegionConfigurationResponse;
import com.parkflow.modules.configuration.dto.ShiftConfigurationRequest;
import com.parkflow.modules.configuration.dto.ShiftConfigurationResponse;
import com.parkflow.modules.licensing.domain.Company;
import com.parkflow.modules.licensing.domain.repository.CompanyPort;
import com.parkflow.modules.onboarding.application.service.CompanySettingsService;
import com.parkflow.modules.parking.locker.domain.LockerStatus;
import com.parkflow.modules.parking.locker.domain.repository.LockerPort;
import com.parkflow.modules.common.exception.domain.EntityNotFoundException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class ConfigurationManagementService
    implements CapacityManagementUseCase,
        ShiftConfigurationUseCase,
        ModuleConfigurationUseCase,
        RegionConfigurationUseCase,
        HelmetHandlingUseCase,
        FeatureConfigurationUseCase {

  private final CompanyPort companyRepository;
  private final CompanySettingsService companySettingsService;
  private final AuditService auditService;
  private final LockerPort lockerPort;
  private final ObjectMapper objectMapper;
  // ==================== CAPACITY MANAGEMENT ====================

  @Override
  @Transactional(readOnly = true)
  public CapacityResponse getCapacity(UUID companyId) {
    Company company = getCompanyOrThrow(companyId);
    Map<String, Object> settings = companySettingsService.getSettingsOrDefault(company);

    Object capacityObj = settings.get("capacity");
    Integer totalCapacity = 20;
    if (capacityObj instanceof Integer) {
      totalCapacity = (Integer) capacityObj;
    } else if (capacityObj instanceof java.util.Map) {
      Object totalObj = ((Map<?, ?>) capacityObj).get("total");
      if (totalObj instanceof Integer) {
        totalCapacity = (Integer) totalObj;
      }
    }
    @SuppressWarnings("unchecked")
    Map<String, Integer> capacityByType =
        (Map<String, Integer>)
            settings.getOrDefault("capacityByType", new HashMap<>());

    return CapacityResponse.builder()
        .companyId(companyId.toString())
        .totalCapacity(totalCapacity)
        .activeSpaces(totalCapacity)
        .inactiveSpaces(0)
        .capacityByType(capacityByType)
        .build();
  }

  @Override
  public CapacityResponse updateCapacity(UUID companyId, CapacityRequest request) {
    Company company = getCompanyOrThrow(companyId);
    Map<String, Object> settings = new LinkedHashMap<>(companySettingsService.getSettingsOrDefault(company));

    String previous = toJson(settings.get("capacity"));
    settings.put("capacity", request.getTotalCapacity());
    if (request.getCapacityByType() != null) {
      settings.put("capacityByType", request.getCapacityByType());
    }
    companySettingsService.upsertSettings(company, settings);
    auditService.record(AuditAction.CAMBIAR_CONFIGURACION, companyId, null,
        previous, String.valueOf(request.getTotalCapacity()), "section=capacity");

    return getCapacity(companyId);
  }

  // ==================== SHIFT CONFIGURATION ====================

  @Override
  @Transactional(readOnly = true)
  public ShiftConfigurationResponse getShiftConfiguration(UUID companyId) {
    Company company = getCompanyOrThrow(companyId);
    Map<String, Object> json = companySettingsService.getSettingsOrDefault(company);

    return ShiftConfigurationResponse.builder()
        .companyId(companyId.toString())
        .shiftsEnabled((Boolean) json.getOrDefault("shiftsEnabled", false))
        .dayShiftStart((String) json.getOrDefault("dayShiftStart", "06:00"))
        .dayShiftEnd((String) json.getOrDefault("dayShiftEnd", "18:00"))
        .nightShiftStart((String) json.getOrDefault("nightShiftStart", "18:00"))
        .nightShiftEnd((String) json.getOrDefault("nightShiftEnd", "06:00"))
        .build();
  }

  @Override
  public ShiftConfigurationResponse updateShiftConfiguration(
      UUID companyId, ShiftConfigurationRequest request) {
    Company company = getCompanyOrThrow(companyId);
    Map<String, Object> json = new LinkedHashMap<>(companySettingsService.getSettingsOrDefault(company));

    if (Boolean.TRUE.equals(request.getShiftsEnabled())) {
      validateShiftTimes(request);
    }

    String previous = toJson(Map.of(
        "shiftsEnabled", json.getOrDefault("shiftsEnabled", false),
        "dayShiftStart", json.getOrDefault("dayShiftStart", "06:00"),
        "dayShiftEnd", json.getOrDefault("dayShiftEnd", "18:00")));

    json.put("shiftsEnabled", request.getShiftsEnabled());
    json.put("dayShiftStart", request.getDayShiftStart());
    json.put("dayShiftEnd", request.getDayShiftEnd());
    json.put("nightShiftStart", request.getNightShiftStart());
    json.put("nightShiftEnd", request.getNightShiftEnd());

    companySettingsService.upsertSettings(company, json);
    auditService.record(AuditAction.CAMBIAR_CONFIGURACION, companyId, null,
        previous, toJson(request), "section=shifts");

    return getShiftConfiguration(companyId);
  }

  // ==================== MODULE CONFIGURATION ====================

  @Override
  @Transactional(readOnly = true)
  public ModuleConfigurationResponse getModuleConfiguration(UUID companyId) {
    Company company = getCompanyOrThrow(companyId);
    Map<String, Object> json = companySettingsService.getSettingsOrDefault(company);

    return ModuleConfigurationResponse.builder()
        .companyId(companyId.toString())
        .clientsEnabled((Boolean) json.getOrDefault("clientsEnabled", false))
        .agreementsEnabled((Boolean) json.getOrDefault("agreementsEnabled", false))
        .monthlyEnabled((Boolean) json.getOrDefault("monthlyEnabled", false))
        .shiftsEnabled((Boolean) json.getOrDefault("shiftsEnabled", false))
        .cashEnabled((Boolean) json.getOrDefault("cashEnabled", true))
        .advancedAuditEnabled((Boolean) json.getOrDefault("advancedAuditEnabled", false))
        .licensePlan(company.getPlan().name())
        .build();
  }

  @Override
  public ModuleConfigurationResponse updateModuleConfiguration(
      UUID companyId, ModuleConfigurationRequest request) {
    Company company = getCompanyOrThrow(companyId);
    Map<String, Object> json = new LinkedHashMap<>(companySettingsService.getSettingsOrDefault(company));

    validateModuleRestrictions(request, company.getPlan().name());

    String previous = toJson(Map.of(
        "clientsEnabled", json.getOrDefault("clientsEnabled", false),
        "cashEnabled", json.getOrDefault("cashEnabled", true)));

    json.put("clientsEnabled", request.getClientsEnabled());
    json.put("agreementsEnabled", request.getAgreementsEnabled());
    json.put("monthlyEnabled", request.getMonthlyEnabled());
    json.put("shiftsEnabled", request.getShiftsEnabled());
    json.put("cashEnabled", request.getCashEnabled());
    json.put("advancedAuditEnabled", request.getAdvancedAuditEnabled());

    companySettingsService.upsertSettings(company, json);
    auditService.record(AuditAction.CAMBIAR_CONFIGURACION, companyId, null,
        previous, toJson(request), "section=modules");

    return getModuleConfiguration(companyId);
  }

  // ==================== REGION CONFIGURATION ====================

  @Override
  @Transactional(readOnly = true)
  public RegionConfigurationResponse getRegionConfiguration(UUID companyId) {
    Company company = getCompanyOrThrow(companyId);
    Map<String, Object> json = companySettingsService.getSettingsOrDefault(company);

    return RegionConfigurationResponse.builder()
        .companyId(companyId.toString())
        .countryCode((String) json.getOrDefault("countryCode", "CO"))
        .platePattern((String) json.getOrDefault("platePattern", "^[A-Z]{3}[0-9]{3}$"))
        .platePrefixes((String) json.getOrDefault("platePrefixes", ""))
        .timezone((String) json.getOrDefault("timezone", "America/Bogota"))
        .build();
  }

  @Override
  public RegionConfigurationResponse updateRegionConfiguration(
      UUID companyId, RegionConfigurationRequest request) {
    Company company = getCompanyOrThrow(companyId);
    Map<String, Object> json = new LinkedHashMap<>(companySettingsService.getSettingsOrDefault(company));

    String previous = toJson(Map.of(
        "countryCode", json.getOrDefault("countryCode", "CO"),
        "timezone", json.getOrDefault("timezone", "America/Bogota")));

    json.put("countryCode", request.getCountryCode());
    json.put("platePattern", request.getPlatePattern());
    json.put("platePrefixes", request.getPlatePrefixes());
    json.put("timezone", request.getTimezone());

    companySettingsService.upsertSettings(company, json);
    auditService.record(AuditAction.CAMBIAR_CONFIGURACION, companyId, null,
        previous, toJson(request), "section=region");

    return getRegionConfiguration(companyId);
  }

  // ==================== HELMET HANDLING ====================

  @Override
  @Transactional(readOnly = true)
  public HelmetHandlingResponse getHelmetHandling(UUID companyId) {
    Company company = getCompanyOrThrow(companyId);
    Map<String, Object> json = companySettingsService.getSettingsOrDefault(company);

    @SuppressWarnings("unchecked")
    Map<String, Object> opConfig = (Map<String, Object>) json.getOrDefault("operationConfiguration", new LinkedHashMap<>());

    String currentMode = (String) opConfig.getOrDefault("helmetHandling", "NONE");

    return HelmetHandlingResponse.builder()
        .companyId(companyId.toString())
        .currentMode(currentMode)
        .activeLockerCount(0)
        .inactiveLockerCount(0)
        .usedLockerCount(0L)
        .isEditable(true)
        .editabilityReason(null)
        .build();
  }

  @Override
  public HelmetHandlingResponse updateHelmetHandling(
      UUID companyId, HelmetHandlingRequest request) {
    Company company = getCompanyOrThrow(companyId);
    Map<String, Object> json = new LinkedHashMap<>(companySettingsService.getSettingsOrDefault(company));

    @SuppressWarnings("unchecked")
    Map<String, Object> opConfig = (Map<String, Object>) json.getOrDefault("operationConfiguration", new LinkedHashMap<>());
    Map<String, Object> mutableOpConfig = new LinkedHashMap<>(opConfig);

    String currentMode = (String) mutableOpConfig.getOrDefault("helmetHandling", "NONE");

    if ("LOCKERS".equalsIgnoreCase(currentMode) && !currentMode.equalsIgnoreCase(request.getMode())) {
      long occupiedLockers = lockerPort.countByCompanyIdAndStatus(companyId, LockerStatus.OCUPADO);
      if (occupiedLockers > 0) {
        throw new com.parkflow.modules.common.exception.OperationException(
            HttpStatus.CONFLICT,
            "No se puede cambiar el modo de casco: hay " + occupiedLockers +
            " casillero(s) en uso actualmente.");
      }
    }

    boolean usesLockers = "LOCKERS".equalsIgnoreCase(request.getMode());
    boolean enableHelmetSection = !"NONE".equalsIgnoreCase(request.getMode());

    mutableOpConfig.put("helmetHandling", request.getMode());
    mutableOpConfig.put("usesLockers", usesLockers);
    mutableOpConfig.put("usesHelmetTokens", usesLockers);
    mutableOpConfig.put("enableHelmetSection", enableHelmetSection);
    mutableOpConfig.put("enableCustodiedItem", enableHelmetSection);

    if (request.getLockerCount() != null) {
      mutableOpConfig.put("helmetTokenCount", request.getLockerCount());
    }

    json.put("operationConfiguration", mutableOpConfig);
    companySettingsService.upsertSettings(company, json);
    auditService.record(AuditAction.CAMBIAR_CONFIGURACION, companyId, null,
        currentMode, request.getMode(), "section=helmet-handling");

    return getHelmetHandling(companyId);
  }

  // ==================== FEATURE CONFIGURATION ====================

  @Override
  @Transactional(readOnly = true)
  public FeatureConfigurationResponse getFeatureConfiguration(UUID companyId) {
    Company company = getCompanyOrThrow(companyId);
    Map<String, Object> json = companySettingsService.getSettingsOrDefault(company);

    @SuppressWarnings("unchecked")
    Map<String, Object> features = (Map<String, Object>) json.getOrDefault("features", new LinkedHashMap<>());

    return FeatureConfigurationResponse.builder()
        .companyId(companyId.toString())
        .agreements(getFeature(features, "agreements", false))
        .prepaid(getFeature(features, "prepaid", false))
        .memberships(getFeature(features, "memberships", false))
        .electronicBilling(getFeature(features, "electronicBilling", false))
        .lockerControl(getFeature(features, "lockerControl", false))
        .motorcycleParking(getFeature(features, "motorcycleParking", true))
        .bicycleParking(getFeature(features, "bicycleParking", false))
        .multiplePaymentMethods(getFeature(features, "multiplePaymentMethods", true))
        .plateValidation(getFeature(features, "plateValidation", true))
        .specialRates(getFeature(features, "specialRates", false))
        .frequentCustomers(getFeature(features, "frequentCustomers", false))
        .helmetControl(getFeature(features, "helmetControl", false))
        .accessoryControl(getFeature(features, "accessoryControl", false))
        .reservations(getFeature(features, "reservations", false))
        .operation24Hours(getFeature(features, "operation24Hours", false))
        .build();
  }

  @Override
  public FeatureConfigurationResponse updateFeatureConfiguration(
      UUID companyId, FeatureConfigurationRequest request) {
    Company company = getCompanyOrThrow(companyId);
    Map<String, Object> json = new LinkedHashMap<>(companySettingsService.getSettingsOrDefault(company));

    @SuppressWarnings("unchecked")
    Map<String, Object> features = (Map<String, Object>) json.getOrDefault("features", new LinkedHashMap<>());
    Map<String, Object> mutableFeatures = new LinkedHashMap<>(features);

    putIfNotNull(mutableFeatures, "agreements", request.getAgreements());
    putIfNotNull(mutableFeatures, "prepaid", request.getPrepaid());
    putIfNotNull(mutableFeatures, "memberships", request.getMemberships());
    putIfNotNull(mutableFeatures, "electronicBilling", request.getElectronicBilling());
    putIfNotNull(mutableFeatures, "lockerControl", request.getLockerControl());
    putIfNotNull(mutableFeatures, "motorcycleParking", request.getMotorcycleParking());
    putIfNotNull(mutableFeatures, "bicycleParking", request.getBicycleParking());
    putIfNotNull(mutableFeatures, "multiplePaymentMethods", request.getMultiplePaymentMethods());
    putIfNotNull(mutableFeatures, "plateValidation", request.getPlateValidation());
    putIfNotNull(mutableFeatures, "specialRates", request.getSpecialRates());
    putIfNotNull(mutableFeatures, "frequentCustomers", request.getFrequentCustomers());
    putIfNotNull(mutableFeatures, "helmetControl", request.getHelmetControl());
    putIfNotNull(mutableFeatures, "accessoryControl", request.getAccessoryControl());
    putIfNotNull(mutableFeatures, "reservations", request.getReservations());
    putIfNotNull(mutableFeatures, "operation24Hours", request.getOperation24Hours());

    json.put("features", mutableFeatures);
    companySettingsService.upsertSettings(company, json);
    auditService.record(AuditAction.CAMBIAR_CONFIGURACION, companyId, null,
        toJson(features), toJson(request), "section=features");

    return getFeatureConfiguration(companyId);
  }

  private boolean getFeature(Map<String, Object> features, String key, boolean defaultValue) {
    Object value = features.get(key);
    return value instanceof Boolean ? (Boolean) value : defaultValue;
  }

  private void putIfNotNull(Map<String, Object> map, String key, Boolean value) {
    if (value != null) {
      map.put(key, value);
    }
  }

  // ==================== HELPER METHODS ====================

  private String toJson(Object value) {
    try {
      return objectMapper.writeValueAsString(value);
    } catch (Exception e) {
      log.warn("Could not serialize audit payload", e);
      return String.valueOf(value);
    }
  }

  private Company getCompanyOrThrow(UUID companyId) {
    return companyRepository
        .findById(companyId)
        .orElseThrow(
            () ->
                new EntityNotFoundException(
                    "Company not found with id: " + companyId));
  }

  private void validateShiftTimes(ShiftConfigurationRequest request) {
    if (request.getDayShiftStart() != null && request.getDayShiftEnd() != null) {
      if (request.getDayShiftStart().compareTo(request.getDayShiftEnd()) >= 0) {
        throw new com.parkflow.modules.common.exception.OperationException(
            HttpStatus.BAD_REQUEST,
            "Day shift start must be before day shift end");
      }
    }

    if (request.getNightShiftStart() != null && request.getNightShiftEnd() != null) {
      if (request.getNightShiftStart().equals(request.getNightShiftEnd())) {
        throw new com.parkflow.modules.common.exception.OperationException(
            HttpStatus.BAD_REQUEST,
            "Night shift start must not be equal to night shift end");
      }
    }
  }

  private void validateModuleRestrictions(ModuleConfigurationRequest request, String licensePlan) {
    // Implement license plan validation based on module requirements
    // For now, allow all module configurations
    // In future, restrict based on license plan (PRO, ENTERPRISE, etc.)
  }
}
