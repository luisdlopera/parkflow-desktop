package com.parkflow.modules.configuration.application.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.parkflow.modules.audit.domain.AuditAction;
import com.parkflow.modules.audit.service.AuditService;
import com.parkflow.modules.common.exception.domain.EntityNotFoundException;
import com.parkflow.modules.configuration.application.port.in.FeatureConfigurationUseCase;
import com.parkflow.modules.configuration.dto.FeatureConfigurationRequest;
import com.parkflow.modules.configuration.dto.FeatureConfigurationResponse;
import com.parkflow.modules.licensing.domain.Company;
import com.parkflow.modules.licensing.domain.repository.CompanyPort;
import com.parkflow.modules.onboarding.application.service.CompanySettingsService;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class FeatureConfigurationServiceImpl implements FeatureConfigurationUseCase {

  private final CompanyPort companyRepository;
  private final CompanySettingsService companySettingsService;
  private final AuditService auditService;
  private final ObjectMapper objectMapper;

  @Override
  @Transactional(readOnly = true)
  public FeatureConfigurationResponse getFeatureConfiguration(UUID companyId) {
    Company company = getCompanyOrThrow(companyId);
    Map<String, Object> json = companySettingsService.getSettingsOrDefault(company);

    @SuppressWarnings("unchecked")
    Map<String, Object> features = (Map<String, Object>)
        json.getOrDefault("features", new LinkedHashMap<>());

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
  public FeatureConfigurationResponse updateFeatureConfiguration(UUID companyId, FeatureConfigurationRequest request) {
    Company company = getCompanyOrThrow(companyId);
    Map<String, Object> json = new LinkedHashMap<>(companySettingsService.getSettingsOrDefault(company));

    @SuppressWarnings("unchecked")
    Map<String, Object> features = (Map<String, Object>)
        json.getOrDefault("features", new LinkedHashMap<>());
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

  private Company getCompanyOrThrow(UUID companyId) {
    return companyRepository.findById(companyId)
        .orElseThrow(() -> new EntityNotFoundException("Company not found with id: " + companyId));
  }

  private String toJson(Object value) {
    try {
      return objectMapper.writeValueAsString(value);
    } catch (Exception e) {
      log.warn("Could not serialize audit payload", e);
      return String.valueOf(value);
    }
  }
}
