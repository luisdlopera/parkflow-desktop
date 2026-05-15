package com.parkflow.modules.settings.application.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.parkflow.modules.auth.domain.AuthAuditAction;
import com.parkflow.modules.auth.security.SecurityUtils;
import com.parkflow.modules.configuration.domain.Rate;
import com.parkflow.modules.configuration.domain.repository.ParkingSitePort;
import com.parkflow.modules.configuration.domain.repository.RatePort;
import com.parkflow.modules.configuration.domain.service.RateDomainService;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.settings.application.mapper.RateMapper;
import com.parkflow.modules.settings.application.port.in.UpdateRateUseCase;
import com.parkflow.modules.settings.dto.RateResponse;
import com.parkflow.modules.settings.dto.RateUpsertRequest;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class UpdateRateService implements UpdateRateUseCase {
  private final RatePort ratePort;
  private final RateMapper rateMapper;
  private final RateDomainService rateDomainService;
  private final ParkingSitePort parkingSiteRepository;
  private final SettingsAuditService settingsAuditService;
  private final com.parkflow.modules.audit.application.port.out.AuditPort globalAuditService;
  private final ObjectMapper objectMapper;

  @Override
  @Transactional
  public RateResponse update(UUID id, RateUpsertRequest req) {
    Rate rate = ratePort.findById(id)
        .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Tarifa no encontrada"));
    
    Map<String, Object> before = snapshot(rate);
    rate = rateMapper.fromRequest(req, rate);
    UUID companyId = SecurityUtils.requireCompanyId();

    if (req.siteId() != null) {
      rate.setSiteRef(parkingSiteRepository.findById(req.siteId())
          .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Sede no encontrada")));
      rate.setSite(rate.getSiteRef().getCode());
    }

    rateDomainService.validateRate(rate, id, companyId);

    try {
      rate = ratePort.save(rate);
    } catch (DataIntegrityViolationException ex) {
      throw new OperationException(HttpStatus.CONFLICT, "Conflicto de integridad al actualizar tarifa");
    }

    logAudits(id, before, rate);
    return rateMapper.toResponse(rate);
  }

  private void logAudits(UUID id, Map<String, Object> before, Rate after) {
    Map<String, Object> afterSnapshot = snapshot(after);
    settingsAuditService.log(
        AuthAuditAction.SETTINGS_RATE_UPDATE,
        "OK",
        Map.of("rateId", id.toString(), "before", before, "after", afterSnapshot));

    try {
      globalAuditService.record(
          com.parkflow.modules.audit.domain.AuditAction.CAMBIAR_TARIFA,
          objectMapper.writeValueAsString(before),
          objectMapper.writeValueAsString(afterSnapshot),
          "Rate updated: " + id);
    } catch (Exception e) {
      log.warn("Global audit failed for rate update {}", id);
    }
  }

  private Map<String, Object> snapshot(Rate r) {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("name", r.getName());
    m.put("vehicleType", r.getVehicleType());
    m.put("amount", r.getAmount());
    m.put("active", r.isActive());
    return m;
  }
}
