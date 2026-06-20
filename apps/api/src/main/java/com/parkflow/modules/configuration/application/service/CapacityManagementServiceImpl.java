package com.parkflow.modules.configuration.application.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.parkflow.modules.audit.domain.AuditAction;
import com.parkflow.modules.audit.service.AuditService;
import com.parkflow.modules.common.exception.domain.EntityNotFoundException;
import com.parkflow.modules.configuration.application.port.in.CapacityManagementUseCase;
import com.parkflow.modules.configuration.dto.CapacityRequest;
import com.parkflow.modules.configuration.dto.CapacityResponse;
import com.parkflow.modules.licensing.domain.Company;
import com.parkflow.modules.licensing.domain.repository.CompanyPort;
import com.parkflow.modules.onboarding.application.service.CompanySettingsService;
import java.util.HashMap;
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
public class CapacityManagementServiceImpl implements CapacityManagementUseCase {

  private final CompanyPort companyRepository;
  private final CompanySettingsService companySettingsService;
  private final AuditService auditService;
  private final ObjectMapper objectMapper;

  @Override
  @Transactional(readOnly = true)
  public CapacityResponse getCapacity(UUID companyId) {
    Company company = getCompanyOrThrow(companyId);
    Map<String, Object> settings = companySettingsService.getSettingsOrDefault(company);

    Object capacityObj = settings.get("capacity");
    Integer totalCapacity = 20;
    if (capacityObj instanceof Integer) {
      totalCapacity = (Integer) capacityObj;
    } else if (capacityObj instanceof Map) {
      Object totalObj = ((Map<?, ?>) capacityObj).get("total");
      if (totalObj instanceof Integer) {
        totalCapacity = (Integer) totalObj;
      }
    }
    @SuppressWarnings("unchecked")
    Map<String, Integer> capacityByType =
        (Map<String, Integer>) settings.getOrDefault("capacityByType", new HashMap<>());

    return CapacityResponse.builder()
        .companyId(companyId.toString())
        .totalCapacity(totalCapacity)
        .activeSpaces(totalCapacity)
        .inactiveSpaces(0)
        .capacityByType(capacityByType)
        .build();
  }

  @Override
  @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
  public CapacityResponse updateCapacity(UUID companyId, CapacityRequest request) {
    Company company = getCompanyOrThrow(companyId);
    Map<String, Object> settings = new LinkedHashMap<>(companySettingsService.getSettingsOrDefault(company));

    String previous = toJson(settings.get("capacity"));

    @SuppressWarnings("unchecked")
    Map<String, Object> capacity = new LinkedHashMap<>(
        settings.get("capacity") instanceof Map
            ? (Map<String, Object>) settings.get("capacity")
            : new LinkedHashMap<>());

    capacity.put("total", request.getTotalCapacity());
    capacity.put("controlSlots", capacity.getOrDefault("controlSlots", false));
    if (request.getCapacityByType() != null) {
      capacity.put("byType", request.getCapacityByType());
    }
    settings.put("capacity", capacity);

    companySettingsService.upsertSettings(company, settings);
    auditService.record(AuditAction.CAMBIAR_CONFIGURACION, companyId, null,
        previous, String.valueOf(request.getTotalCapacity()), "section=capacity");

    return getCapacity(companyId);
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
