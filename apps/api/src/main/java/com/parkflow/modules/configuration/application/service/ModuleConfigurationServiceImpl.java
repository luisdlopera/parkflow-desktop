package com.parkflow.modules.configuration.application.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.parkflow.modules.audit.domain.AuditAction;
import com.parkflow.modules.audit.service.AuditService;
import com.parkflow.modules.common.exception.domain.EntityNotFoundException;
import com.parkflow.modules.configuration.application.port.in.ModuleConfigurationUseCase;
import com.parkflow.modules.configuration.dto.ModuleConfigurationRequest;
import com.parkflow.modules.configuration.dto.ModuleConfigurationResponse;
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
public class ModuleConfigurationServiceImpl implements ModuleConfigurationUseCase {

  private final CompanyPort companyRepository;
  private final CompanySettingsService companySettingsService;
  private final AuditService auditService;
  private final ObjectMapper objectMapper;

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
  @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
  public ModuleConfigurationResponse updateModuleConfiguration(UUID companyId, ModuleConfigurationRequest request) {
    Company company = getCompanyOrThrow(companyId);
    Map<String, Object> json = new LinkedHashMap<>(companySettingsService.getSettingsOrDefault(company));

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
