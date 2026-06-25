package com.parkflow.modules.configuration.application.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.parkflow.modules.audit.domain.AuditAction;
import com.parkflow.modules.audit.application.service.AuditService;
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

/**
 * @deprecated Use {@link CompanyConfigurationFacadeService} for new code.
 *             This service is maintained for backward compatibility.
 */
@Deprecated(since = "2.0", forRemoval = false)
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class ModuleConfigurationServiceImpl implements ModuleConfigurationUseCase {

  private final CompanyPort companyRepository;
  private final CompanySettingsService companySettingsService;
  private final AuditService auditService;
  private final ObjectMapper objectMapper;

  private boolean getModuleEnabled(Map<String, Object> modules, String moduleKey, boolean defaultValue) {
    if (modules.containsKey(moduleKey)) {
      Object v = modules.get(moduleKey);
      if (v instanceof Boolean) return (Boolean) v;
    }
    return defaultValue;
  }

  @Override
  @Transactional(readOnly = true)
  public ModuleConfigurationResponse getModuleConfiguration(UUID companyId) {
    Company company = getCompanyOrThrow(companyId);
    Map<String, Object> json = companySettingsService.getSettingsOrDefault(company);

    @SuppressWarnings("unchecked")
    Map<String, Object> modules = (Map<String, Object>) json.getOrDefault("modules", Map.of());

    return ModuleConfigurationResponse.builder()
        .companyId(companyId.toString())
        .clientsEnabled(getModuleEnabled(modules, "clients", false))
        .agreementsEnabled(getModuleEnabled(modules, "agreements", false))
        .monthlyEnabled(getModuleEnabled(modules, "monthly", false))
        .shiftsEnabled(getModuleEnabled(modules, "shifts", false))
        .cashEnabled(getModuleEnabled(modules, "cash", true))
        .advancedAuditEnabled(getModuleEnabled(modules, "advancedAudit", false))
        .licensePlan(company.getPlan().name())
        .build();
  }

  @Override
  @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
  public ModuleConfigurationResponse updateModuleConfiguration(UUID companyId, ModuleConfigurationRequest request) {
    Company company = getCompanyOrThrow(companyId);
    Map<String, Object> json = new LinkedHashMap<>(companySettingsService.getSettingsOrDefault(company));

    @SuppressWarnings("unchecked")
    Map<String, Object> modules = new LinkedHashMap<>(
        (Map<String, Object>) json.getOrDefault("modules", new LinkedHashMap<>()));

    modules.put("clients", request.getClientsEnabled());
    modules.put("agreements", request.getAgreementsEnabled());
    modules.put("monthly", request.getMonthlyEnabled());
    modules.put("shifts", request.getShiftsEnabled());
    modules.put("cash", request.getCashEnabled());
    modules.put("advancedAudit", request.getAdvancedAuditEnabled());

    json.put("modules", modules);
    json.put("clientsEnabled", request.getClientsEnabled());
    json.put("agreementsEnabled", request.getAgreementsEnabled());
    json.put("monthlyEnabled", request.getMonthlyEnabled());
    json.put("shiftsEnabled", request.getShiftsEnabled());
    json.put("cashEnabled", request.getCashEnabled());
    json.put("advancedAuditEnabled", request.getAdvancedAuditEnabled());

    companySettingsService.upsertSettings(company, json);
    auditService.record(AuditAction.CAMBIAR_CONFIGURACION, companyId, null,
        toJson(modules), toJson(request), "section=modules");

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
