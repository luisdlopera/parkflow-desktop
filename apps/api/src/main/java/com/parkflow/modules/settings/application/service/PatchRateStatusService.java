package com.parkflow.modules.settings.application.service;

import com.parkflow.modules.auth.domain.AuthAuditAction;
import com.parkflow.modules.auth.security.SecurityUtils;
import com.parkflow.modules.configuration.domain.Rate;
import com.parkflow.modules.configuration.domain.repository.RatePort;
import com.parkflow.modules.configuration.domain.service.RateDomainService;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.settings.application.mapper.RateMapper;
import com.parkflow.modules.settings.application.port.in.PatchRateStatusUseCase;
import com.parkflow.modules.settings.dto.RateResponse;
import com.parkflow.modules.settings.dto.RateStatusRequest;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PatchRateStatusService implements PatchRateStatusUseCase {
  private final RatePort ratePort;
  private final RateMapper rateMapper;
  private final RateDomainService rateDomainService;
  private final SettingsAuditService settingsAuditService;
  private final com.parkflow.modules.audit.application.port.out.AuditPort globalAuditService;

  @Override
  @Transactional
  public RateResponse patchStatus(UUID id, RateStatusRequest req) {
    Rate rate = ratePort.findById(id)
        .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Tarifa no encontrada"));
    
    boolean previous = rate.isActive();
    rate.setActive(req.active());
    rate.setUpdatedAt(OffsetDateTime.now());
    
    rateDomainService.validateRate(rate, id, SecurityUtils.requireCompanyId());
    rate = ratePort.save(rate);

    settingsAuditService.log(
        AuthAuditAction.SETTINGS_RATE_STATUS,
        "OK",
        Map.of("rateId", id.toString(), "previousActive", previous, "active", rate.isActive()));

    globalAuditService.record(
        com.parkflow.modules.audit.domain.AuditAction.CAMBIAR_TARIFA,
        "active=" + previous,
        "active=" + rate.isActive(),
        "Rate status changed: " + id);

    return rateMapper.toResponse(rate);
  }
}
