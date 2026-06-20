package com.parkflow.modules.configuration.application.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.parkflow.modules.audit.domain.AuditAction;
import com.parkflow.modules.audit.service.AuditService;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.common.exception.domain.EntityNotFoundException;
import com.parkflow.modules.configuration.application.port.in.ShiftConfigurationUseCase;
import com.parkflow.modules.configuration.dto.ShiftConfigurationRequest;
import com.parkflow.modules.configuration.dto.ShiftConfigurationResponse;
import com.parkflow.modules.licensing.domain.Company;
import com.parkflow.modules.licensing.domain.repository.CompanyPort;
import com.parkflow.modules.onboarding.application.service.CompanySettingsService;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class ShiftConfigurationServiceImpl implements ShiftConfigurationUseCase {

  private final CompanyPort companyRepository;
  private final CompanySettingsService companySettingsService;
  private final AuditService auditService;
  private final ObjectMapper objectMapper;

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
  @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
  public ShiftConfigurationResponse updateShiftConfiguration(UUID companyId, ShiftConfigurationRequest request) {
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

  private void validateShiftTimes(ShiftConfigurationRequest request) {
    if (request.getDayShiftStart() != null && request.getDayShiftEnd() != null) {
      if (request.getDayShiftStart().compareTo(request.getDayShiftEnd()) >= 0) {
        throw new OperationException(HttpStatus.BAD_REQUEST, "Day shift start must be before day shift end");
      }
    }
    if (request.getNightShiftStart() != null && request.getNightShiftEnd() != null) {
      if (request.getNightShiftStart().equals(request.getNightShiftEnd())) {
        throw new OperationException(HttpStatus.BAD_REQUEST, "Night shift start must not equal night shift end");
      }
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
