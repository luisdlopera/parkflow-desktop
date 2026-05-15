package com.parkflow.modules.configuration.application.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.parkflow.modules.audit.application.port.out.AuditPort;
import com.parkflow.modules.configuration.application.port.in.MonthlyContractUseCase;
import com.parkflow.modules.configuration.domain.MonthlyContract;
import com.parkflow.modules.configuration.domain.ParkingSite;
import com.parkflow.modules.configuration.domain.repository.MonthlyContractPort;
import com.parkflow.modules.configuration.domain.repository.ParkingSitePort;
import com.parkflow.modules.configuration.dto.MonthlyContractRequest;
import com.parkflow.modules.configuration.dto.MonthlyContractResponse;
import com.parkflow.modules.configuration.domain.Rate;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.configuration.domain.repository.RatePort;
import com.parkflow.modules.settings.dto.SettingsPageResponse;
import com.parkflow.modules.auth.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class MonthlyContractManagementService implements MonthlyContractUseCase {

  private final MonthlyContractPort repo;
  private final RatePort rateRepository;
  private final ParkingSitePort siteRepository;
  private final AuditPort globalAuditService;
  private final ObjectMapper objectMapper;

  @Override
  @Transactional(readOnly = true)
  public SettingsPageResponse<MonthlyContractResponse> list(String site, String plate, Boolean active, Pageable pageable) {
    Page<MonthlyContract> page = repo.search(site, plate, active, SecurityUtils.requireCompanyId(), pageable);
    return SettingsPageResponse.of(page.map(this::toResponse));
  }

  @Override
  @Transactional(readOnly = true)
  public MonthlyContractResponse get(UUID id) {
    return toResponse(findOrThrow(id));
  }

  @Override
  @Transactional
  public MonthlyContractResponse create(MonthlyContractRequest req) {
    validateDates(req);
    MonthlyContract mc = fromRequest(req, new MonthlyContract());
    mc.setCompanyId(SecurityUtils.requireCompanyId());
    mc = repo.save(mc);
    try {
        globalAuditService.record(
            com.parkflow.modules.audit.domain.AuditAction.CREAR,
            null,
            objectMapper.writeValueAsString(req),
            "Monthly contract created: " + mc.getId());
    } catch (Exception e) {
        log.warn("No se pudo registrar auditoria global al crear mensualidad {}", mc.getId(), e);
    }
    return toResponse(mc);
  }

  @Override
  @Transactional
  public MonthlyContractResponse update(UUID id, MonthlyContractRequest req) {
    validateDates(req);
    MonthlyContract mc = findOrThrow(id);
    String before = "";
    try {
      before = objectMapper.writeValueAsString(toResponse(mc));
    } catch (Exception e) {
      log.warn("No se pudo serializar estado previo de mensualidad {}", id, e);
    }
    fromRequest(req, mc);
    mc = repo.save(mc);
    try {
        globalAuditService.record(
            com.parkflow.modules.audit.domain.AuditAction.EDITAR,
            before,
            objectMapper.writeValueAsString(toResponse(mc)),
            "Monthly contract updated: " + id);
    } catch (Exception e) {
        log.warn("No se pudo registrar auditoria global al actualizar mensualidad {}", id, e);
    }
    return toResponse(mc);
  }

  @Override
  @Transactional
  public MonthlyContractResponse patchStatus(UUID id, boolean active) {
    MonthlyContract mc = findOrThrow(id);
    boolean previous = mc.isActive();
    mc.setActive(active);
    mc.setUpdatedAt(OffsetDateTime.now());
    mc = repo.save(mc);
    globalAuditService.record(
        com.parkflow.modules.audit.domain.AuditAction.ELIMINAR,
        "active=" + previous,
        "active=" + active,
        "Monthly contract status changed: " + id);
    return toResponse(mc);
  }

  private void validateDates(MonthlyContractRequest req) {
    if (req.startDate() != null && req.endDate() != null
        && req.startDate().isAfter(req.endDate())) {
      throw new OperationException(HttpStatus.BAD_REQUEST,
          "La fecha de inicio no puede ser posterior a la fecha de fin");
    }
  }

  private MonthlyContract fromRequest(MonthlyContractRequest req, MonthlyContract target) {
    Rate rate = rateRepository.findById(req.rateId())
        .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Tarifa no encontrada"));
    target.setRate(rate);
    target.setPlate(req.plate().toUpperCase().trim());
    target.setVehicleType(req.vehicleType());
    target.setHolderName(req.holderName().trim());
    target.setHolderDocument(req.holderDocument());
    target.setHolderPhone(req.holderPhone());
    target.setHolderEmail(req.holderEmail());
    target.setSite(req.site() == null || req.site().isBlank() ? "DEFAULT" : req.site().trim());
    if (req.siteId() != null) {
      ParkingSite site = siteRepository.findById(req.siteId())
          .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Sede no encontrada"));
      target.setSiteRef(site);
    }
    target.setStartDate(req.startDate());
    target.setEndDate(req.endDate());
    target.setAmount(req.amount());
    target.setActive(req.active());
    target.setNotes(req.notes());
    target.setUpdatedAt(OffsetDateTime.now());
    return target;
  }

  private MonthlyContract findOrThrow(UUID id) {
    return repo.findById(id)
        .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Mensualidad no encontrada"));
  }

  private MonthlyContractResponse toResponse(MonthlyContract mc) {
    return new MonthlyContractResponse(
        mc.getId(),
        mc.getRate() != null ? mc.getRate().getId() : null,
        mc.getRate() != null ? mc.getRate().getName() : null,
        mc.getPlate(),
        mc.getVehicleType(),
        mc.getHolderName(),
        mc.getHolderDocument(),
        mc.getHolderPhone(),
        mc.getHolderEmail(),
        mc.getSite(),
        mc.getSiteRef() != null ? mc.getSiteRef().getId() : null,
        mc.getStartDate(),
        mc.getEndDate(),
        mc.getAmount(),
        mc.isActive(),
        mc.getNotes(),
        mc.getCreatedAt(),
        mc.getUpdatedAt());
  }
}
