package com.parkflow.modules.configuration.application.service;

import com.parkflow.modules.configuration.application.port.in.CapacityManagementUseCase;
import com.parkflow.modules.configuration.application.port.in.HelmetHandlingUseCase;
import com.parkflow.modules.configuration.application.port.in.ModuleConfigurationUseCase;
import com.parkflow.modules.configuration.application.port.in.RegionConfigurationUseCase;
import com.parkflow.modules.configuration.application.port.in.ShiftConfigurationUseCase;
import com.parkflow.modules.configuration.dto.CapacityRequest;
import com.parkflow.modules.configuration.dto.CapacityResponse;
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
import com.parkflow.modules.onboarding.domain.CompanySettings;
import com.parkflow.modules.parking.locker.repository.LockerRepository;
import com.parkflow.modules.parking.spaces.service.ParkingSpaceService;
import com.parkflow.modules.common.exception.domain.EntityNotFoundException;
import java.util.LinkedHashMap;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
@Transactional
public class ConfigurationManagementService
    implements CapacityManagementUseCase,
        ShiftConfigurationUseCase,
        ModuleConfigurationUseCase,
        RegionConfigurationUseCase,
        HelmetHandlingUseCase {

  private final CompanyPort companyRepository;
  private final CompanySettingsService companySettingsService;
  private final ParkingSpaceService parkingSpaceService;
  private final LockerRepository lockerRepository;

  // ==================== CAPACITY MANAGEMENT ====================

  @Override
  @Transactional(readOnly = true)
  public CapacityResponse getCapacity(UUID companyId) {
    Company company = getCompanyOrThrow(companyId);
    java.util.Map<String, Object> settings = companySettingsService.getSettingsOrDefault(company);

    Integer totalCapacity = (Integer) settings.getOrDefault("capacity", 20);
    java.util.Map<String, Integer> capacityByType =
        (java.util.Map<String, Integer>)
            settings.getOrDefault("capacityByType", new java.util.HashMap<>());

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
    java.util.Map<String, Object> settings = new LinkedHashMap<>(companySettingsService.getSettingsOrDefault(company));

    settings.put("capacity", request.getTotalCapacity());
    if (request.getCapacityByType() != null) {
      settings.put("capacityByType", request.getCapacityByType());
    }
    companySettingsService.upsertSettings(company, settings);

    return getCapacity(companyId);
  }

  // ==================== SHIFT CONFIGURATION ====================

  @Override
  @Transactional(readOnly = true)
  public ShiftConfigurationResponse getShiftConfiguration(UUID companyId) {
    Company company = getCompanyOrThrow(companyId);
    java.util.Map<String, Object> json = companySettingsService.getSettingsOrDefault(company);

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
    java.util.Map<String, Object> json = new LinkedHashMap<>(companySettingsService.getSettingsOrDefault(company));

    if (Boolean.TRUE.equals(request.getShiftsEnabled())) {
      validateShiftTimes(request);
    }

    json.put("shiftsEnabled", request.getShiftsEnabled());
    json.put("dayShiftStart", request.getDayShiftStart());
    json.put("dayShiftEnd", request.getDayShiftEnd());
    json.put("nightShiftStart", request.getNightShiftStart());
    json.put("nightShiftEnd", request.getNightShiftEnd());

    companySettingsService.upsertSettings(company, json);

    return getShiftConfiguration(companyId);
  }

  // ==================== MODULE CONFIGURATION ====================

  @Override
  @Transactional(readOnly = true)
  public ModuleConfigurationResponse getModuleConfiguration(UUID companyId) {
    Company company = getCompanyOrThrow(companyId);
    java.util.Map<String, Object> json = companySettingsService.getSettingsOrDefault(company);

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
    java.util.Map<String, Object> json = new LinkedHashMap<>(companySettingsService.getSettingsOrDefault(company));

    validateModuleRestrictions(request, company.getPlan().name());

    json.put("clientsEnabled", request.getClientsEnabled());
    json.put("agreementsEnabled", request.getAgreementsEnabled());
    json.put("monthlyEnabled", request.getMonthlyEnabled());
    json.put("shiftsEnabled", request.getShiftsEnabled());
    json.put("cashEnabled", request.getCashEnabled());
    json.put("advancedAuditEnabled", request.getAdvancedAuditEnabled());

    companySettingsService.upsertSettings(company, json);

    return getModuleConfiguration(companyId);
  }

  // ==================== REGION CONFIGURATION ====================

  @Override
  @Transactional(readOnly = true)
  public RegionConfigurationResponse getRegionConfiguration(UUID companyId) {
    Company company = getCompanyOrThrow(companyId);
    java.util.Map<String, Object> json = companySettingsService.getSettingsOrDefault(company);

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
    java.util.Map<String, Object> json = new LinkedHashMap<>(companySettingsService.getSettingsOrDefault(company));

    json.put("countryCode", request.getCountryCode());
    json.put("platePattern", request.getPlatePattern());
    json.put("platePrefixes", request.getPlatePrefixes());
    json.put("timezone", request.getTimezone());

    companySettingsService.upsertSettings(company, json);

    return getRegionConfiguration(companyId);
  }

  // ==================== HELMET HANDLING ====================

  @Override
  @Transactional(readOnly = true)
  public HelmetHandlingResponse getHelmetHandling(UUID companyId) {
    Company company = getCompanyOrThrow(companyId);
    java.util.Map<String, Object> json = companySettingsService.getSettingsOrDefault(company);

    String currentMode = (String) json.getOrDefault("helmetMode", "NONE");

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
    java.util.Map<String, Object> json = new LinkedHashMap<>(companySettingsService.getSettingsOrDefault(company));

    String currentMode = (String) json.getOrDefault("helmetMode", "NONE");

    // Validate mode change
    if ("LOCKERS".equalsIgnoreCase(currentMode)
        && !currentMode.equalsIgnoreCase(request.getMode())) {
      // TODO: Check locker usage history to determine if change is allowed
      // For now, allow the change
    }

    json.put("helmetMode", request.getMode());
    if (request.getLockerCount() != null) {
      json.put("helmetLockerCount", request.getLockerCount());
    }

    companySettingsService.upsertSettings(company, json);

    return getHelmetHandling(companyId);
  }

  // ==================== HELPER METHODS ====================

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
        throw new ResponseStatusException(
            HttpStatus.BAD_REQUEST,
            "Day shift start must be before day shift end");
      }
    }

    if (request.getNightShiftStart() != null && request.getNightShiftEnd() != null) {
      if (request.getNightShiftStart().compareTo(request.getNightShiftEnd()) >= 0) {
        throw new ResponseStatusException(
            HttpStatus.BAD_REQUEST,
            "Night shift start must be before night shift end");
      }
    }
  }

  private void validateModuleRestrictions(ModuleConfigurationRequest request, String licensePlan) {
    // TODO: Implement license plan validation based on module requirements
    // For now, allow all module configurations
    // In future, restrict based on license plan (PRO, ENTERPRISE, etc.)
  }
}
