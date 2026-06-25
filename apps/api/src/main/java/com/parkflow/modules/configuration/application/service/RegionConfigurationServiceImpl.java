package com.parkflow.modules.configuration.application.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.parkflow.modules.audit.domain.AuditAction;
import com.parkflow.modules.audit.application.service.AuditService;
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

/**
 * @deprecated Use {@link CompanyConfigurationFacadeService} for new code.
 *             This service is maintained for backward compatibility.
 */
@Deprecated(since = "2.0", forRemoval = false)
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

    @SuppressWarnings("unchecked")
    Map<String, Object> region = (Map<String, Object>) json.getOrDefault("region", Map.of());

    return RegionConfigurationResponse.builder()
        .companyId(companyId.toString())
        .countryCode(regionString(json, region, "countryCode", "CO"))
        .platePattern(regionString(json, region, "platePattern", "^[A-Z]{3}[0-9]{3}$"))
        .platePrefixes(regionString(json, region, "platePrefixes", ""))
        .timezone(regionString(json, region, "timezone", "America/Bogota"))
        .build();
  }

  private String regionString(Map<String, Object> root, Map<String, Object> region, String key, String def) {
    if (region.containsKey(key)) {
      Object v = region.get(key);
      if (v instanceof String) return (String) v;
    }
    Object v = root.get(key);
    if (v instanceof String) return (String) v;
    return def;
  }

  @Override
  @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
  public RegionConfigurationResponse updateRegionConfiguration(UUID companyId, RegionConfigurationRequest request) {
    Company company = getCompanyOrThrow(companyId);
    Map<String, Object> json = new LinkedHashMap<>(companySettingsService.getSettingsOrDefault(company));

    @SuppressWarnings("unchecked")
    Map<String, Object> region = new LinkedHashMap<>(
        (Map<String, Object>) json.getOrDefault("region", new LinkedHashMap<>()));

    region.put("countryCode", request.getCountryCode());
    region.put("platePattern", request.getPlatePattern());
    region.put("platePrefixes", request.getPlatePrefixes());
    region.put("timezone", request.getTimezone());

    json.put("region", region);
    json.put("countryCode", request.getCountryCode());
    json.put("platePattern", request.getPlatePattern());
    json.put("platePrefixes", request.getPlatePrefixes());
    json.put("timezone", request.getTimezone());

    companySettingsService.upsertSettings(company, json);
    auditService.record(AuditAction.CAMBIAR_CONFIGURACION, companyId, null,
        toJson(region), toJson(request), "section=region");

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
