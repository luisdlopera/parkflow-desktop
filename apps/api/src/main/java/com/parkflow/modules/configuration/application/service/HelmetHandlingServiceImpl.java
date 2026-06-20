package com.parkflow.modules.configuration.application.service;

import com.parkflow.modules.audit.domain.AuditAction;
import com.parkflow.modules.audit.service.AuditService;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.common.exception.domain.EntityNotFoundException;
import com.parkflow.modules.configuration.application.port.in.HelmetHandlingUseCase;
import com.parkflow.modules.configuration.dto.HelmetHandlingRequest;
import com.parkflow.modules.configuration.dto.HelmetHandlingResponse;
import com.parkflow.modules.licensing.domain.Company;
import com.parkflow.modules.licensing.domain.repository.CompanyPort;
import com.parkflow.modules.onboarding.application.service.CompanySettingsService;
import com.parkflow.modules.parking.locker.domain.LockerStatus;
import com.parkflow.modules.parking.locker.domain.repository.LockerPort;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class HelmetHandlingServiceImpl implements HelmetHandlingUseCase {

  private final CompanyPort companyRepository;
  private final CompanySettingsService companySettingsService;
  private final AuditService auditService;
  private final LockerPort lockerPort;

  @Override
  @Transactional(readOnly = true)
  public HelmetHandlingResponse getHelmetHandling(UUID companyId) {
    Company company = getCompanyOrThrow(companyId);
    Map<String, Object> json = companySettingsService.getSettingsOrDefault(company);

    @SuppressWarnings("unchecked")
    Map<String, Object> opConfig = (Map<String, Object>)
        json.getOrDefault("operationConfiguration", new LinkedHashMap<>());

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
  @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
  public HelmetHandlingResponse updateHelmetHandling(UUID companyId, HelmetHandlingRequest request) {
    Company company = getCompanyOrThrow(companyId);
    Map<String, Object> json = new LinkedHashMap<>(companySettingsService.getSettingsOrDefault(company));

    @SuppressWarnings("unchecked")
    Map<String, Object> opConfig = (Map<String, Object>)
        json.getOrDefault("operationConfiguration", new LinkedHashMap<>());
    Map<String, Object> mutableOpConfig = new LinkedHashMap<>(opConfig);

    String currentMode = (String) mutableOpConfig.getOrDefault("helmetHandling", "NONE");

    if ("LOCKERS".equalsIgnoreCase(currentMode) && !currentMode.equalsIgnoreCase(request.getMode())) {
      long occupiedLockers = lockerPort.countByCompanyIdAndStatus(companyId, LockerStatus.OCUPADO);
      if (occupiedLockers > 0) {
        throw new OperationException(
            HttpStatus.CONFLICT,
            "No se puede cambiar el modo de casco: hay " + occupiedLockers + " casillero(s) en uso actualmente.");
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

  private Company getCompanyOrThrow(UUID companyId) {
    return companyRepository.findById(companyId)
        .orElseThrow(() -> new EntityNotFoundException("Company not found with id: " + companyId));
  }
}
