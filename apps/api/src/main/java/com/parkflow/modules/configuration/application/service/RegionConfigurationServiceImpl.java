package com.parkflow.modules.configuration.application.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.parkflow.modules.audit.domain.AuditAction;
import com.parkflow.modules.audit.service.AuditService;
import com.parkflow.modules.common.exception.domain.EntityNotFoundException;
import com.parkflow.modules.configuration.application.port.in.RegionConfigurationUseCase;
import com.parkflow.modules.configuration.dto.RegionConfigurationRequest;
import com.parkflow.modules.configuration.dto.RegionConfigurationResponse;
import com.parkflow.modules.licensing.domain.Company;
import com.parkflow.modules.licensing.domain.repository.CompanyPort;
import com.parkflow.modules.onboarding.application.service.CompanySettingsService;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class RegionConfigurationServiceImpl implements RegionConfigurationUseCase {

  private final CompanyPort companyRepository;
  private final CompanySettingsService companySettingsService;
  private final AuditService auditService;
  private final ObjectMapper objectMapper;

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
  @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
  public RegionConfigurationResponse updateRegionConfiguration(UUID companyId, RegionConfigurationRequest request) {
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
