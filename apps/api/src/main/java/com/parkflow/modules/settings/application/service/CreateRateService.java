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
import com.parkflow.modules.settings.application.port.in.CreateRateUseCase;
import com.parkflow.modules.settings.dto.RateResponse;
import com.parkflow.modules.settings.dto.RateUpsertRequest;
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
public class CreateRateService implements CreateRateUseCase {
  private final RatePort ratePort;
  private final RateMapper rateMapper;
  private final RateDomainService rateDomainService;
  private final ParkingSitePort parkingSiteRepository;
  private final SettingsAuditService settingsAuditService;
  private final com.parkflow.modules.audit.application.port.out.AuditPort globalAuditService;
  private final ObjectMapper objectMapper;

  @Override
  @Transactional
  public RateResponse create(RateUpsertRequest req) {
    Rate rate = rateMapper.fromRequest(req, new Rate());
    UUID companyId = SecurityUtils.requireCompanyId();
    rate.setCompanyId(companyId);

    // Resolve Site
    if (req.siteId() != null) {
      rate.setSiteRef(parkingSiteRepository.findById(req.siteId())
          .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Sede no encontrada")));
      rate.setSite(rate.getSiteRef().getCode());
    } else {
      rate.setSite(req.site() == null || req.site().isBlank() ? "DEFAULT" : req.site().trim());
    }

    rateDomainService.validateRate(rate, null, companyId);

    try {
      rate = ratePort.save(rate);
    } catch (DataIntegrityViolationException ex) {
      throw new OperationException(HttpStatus.CONFLICT, "Ya existe una tarifa activa con el mismo nombre");
    }

    logAudits(rate, req);
    return rateMapper.toResponse(rate);
  }

  private void logAudits(Rate rate, RateUpsertRequest req) {
    settingsAuditService.log(
        AuthAuditAction.SETTINGS_RATE_CREATE,
        "OK",
        Map.of("rateId", rate.getId().toString(), "name", rate.getName()));

    try {
      globalAuditService.record(
          com.parkflow.modules.audit.domain.AuditAction.CAMBIAR_TARIFA,
          null,
          objectMapper.writeValueAsString(req),
          "Rate created: " + rate.getId());
    } catch (Exception e) {
      log.warn("Global audit failed for rate {}", rate.getId());
    }
  }
}
