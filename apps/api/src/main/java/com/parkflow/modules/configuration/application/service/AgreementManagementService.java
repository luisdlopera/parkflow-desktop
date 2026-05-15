package com.parkflow.modules.configuration.application.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.parkflow.modules.audit.application.port.out.AuditPort;
import com.parkflow.modules.configuration.application.port.in.AgreementUseCase;
import com.parkflow.modules.configuration.domain.Agreement;
import com.parkflow.modules.configuration.domain.ParkingSite;
import com.parkflow.modules.configuration.domain.repository.AgreementPort;
import com.parkflow.modules.configuration.domain.repository.ParkingSitePort;
import com.parkflow.modules.configuration.dto.AgreementRequest;
import com.parkflow.modules.configuration.dto.AgreementResponse;
import com.parkflow.modules.parking.operation.domain.Rate;
import com.parkflow.modules.parking.operation.exception.OperationException;
import com.parkflow.modules.parking.operation.domain.repository.RatePort;
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
public class AgreementManagementService implements AgreementUseCase {

  private final AgreementPort agreementPort;
  private final ParkingSitePort siteRepository;
  private final RatePort rateRepository;
  private final AuditPort globalAuditService;
  private final ObjectMapper objectMapper;

  @Override
  @Transactional(readOnly = true)
  public SettingsPageResponse<AgreementResponse> list(String site, String q, Boolean active, Pageable pageable) {
    Page<Agreement> page = agreementPort.search(site, q, active, SecurityUtils.requireCompanyId(), pageable);
    return SettingsPageResponse.of(page.map(this::toResponse));
  }

  @Override
  @Transactional(readOnly = true)
  public AgreementResponse get(UUID id) {
    return toResponse(findOrThrow(id));
  }

  @Override
  @Transactional(readOnly = true)
  public AgreementResponse resolveByCode(String code) {
    Agreement a = agreementPort.findByCodeAndIsActiveTrue(code, SecurityUtils.requireCompanyId())
        .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND,
            "Convenio no encontrado o inactivo para el código: " + code));
    return toResponse(a);
  }

  @Override
  @Transactional
  public AgreementResponse create(AgreementRequest req) {
    UUID companyId = SecurityUtils.requireCompanyId();
    if (agreementPort.existsByCodeAndCompanyId(req.code(), companyId)) {
      throw new OperationException(HttpStatus.CONFLICT,
          "Ya existe un convenio con el código: " + req.code());
    }
    Agreement a = fromRequest(req, new Agreement());
    a.setCompanyId(companyId);
    a = agreementPort.save(a);
    try {
        globalAuditService.record(
            com.parkflow.modules.audit.domain.AuditAction.CREAR,
            null,
            objectMapper.writeValueAsString(req),
            "Agreement created: " + a.getId());
    } catch (Exception e) {
        log.warn("No se pudo registrar auditoria global al crear convenio {}", a.getId(), e);
    }
    return toResponse(a);
  }

  @Override
  @Transactional
  public AgreementResponse update(UUID id, AgreementRequest req) {
    Agreement a = findOrThrow(id);
    UUID companyId = SecurityUtils.requireCompanyId();
    String before = "";
    try {
      before = objectMapper.writeValueAsString(toResponse(a));
    } catch (Exception e) {
      log.warn("No se pudo serializar estado previo de convenio {}", id, e);
    }
    
    if (agreementPort.existsByCodeAndIdNotAndCompanyId(req.code(), id, companyId)) {
      throw new OperationException(HttpStatus.CONFLICT,
          "Ya existe otro convenio con el código: " + req.code());
    }
    fromRequest(req, a);
    a = agreementPort.save(a);
    
    try {
        globalAuditService.record(
            com.parkflow.modules.audit.domain.AuditAction.EDITAR,
            before,
            objectMapper.writeValueAsString(toResponse(a)),
            "Agreement updated: " + id);
    } catch (Exception e) {
        log.warn("No se pudo registrar auditoria global al actualizar convenio {}", id, e);
    }
    return toResponse(a);
  }

  @Override
  @Transactional
  public AgreementResponse patchStatus(UUID id, boolean active) {
    Agreement a = findOrThrow(id);
    boolean previous = a.isActive();
    a.setActive(active);
    a.setUpdatedAt(OffsetDateTime.now());
    a = agreementPort.save(a);
    
    globalAuditService.record(
        com.parkflow.modules.audit.domain.AuditAction.ELIMINAR,
        "active=" + previous,
        "active=" + active,
        "Agreement status changed: " + id);
        
    return toResponse(a);
  }

  private Agreement fromRequest(AgreementRequest req, Agreement target) {
    target.setCode(req.code().toUpperCase().trim());
    target.setCompanyName(req.companyName().trim());
    target.setDiscountPercent(req.discountPercent());
    target.setMaxHoursPerDay(req.maxHoursPerDay());
    target.setFlatAmount(req.flatAmount());
    if (req.rateId() != null) {
      Rate rate = rateRepository.findById(req.rateId())
          .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Tarifa no encontrada"));
      target.setRate(rate);
    } else {
      target.setRate(null);
    }
    if (req.siteId() != null) {
      ParkingSite site = siteRepository.findById(req.siteId())
          .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Sede no encontrada"));
      target.setSiteRef(site);
    }
    target.setSite(req.site());
    target.setValidFrom(req.validFrom());
    target.setValidTo(req.validTo());
    target.setActive(req.active());
    target.setNotes(req.notes());
    target.setUpdatedAt(OffsetDateTime.now());
    return target;
  }

  private Agreement findOrThrow(UUID id) {
    return agreementPort.findById(id)
        .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Convenio no encontrado"));
  }

  private AgreementResponse toResponse(Agreement a) {
    return new AgreementResponse(
        a.getId(),
        a.getCode(),
        a.getCompanyName(),
        a.getDiscountPercent(),
        a.getMaxHoursPerDay(),
        a.getFlatAmount(),
        a.getRate() != null ? a.getRate().getId() : null,
        a.getRate() != null ? a.getRate().getName() : null,
        a.getSite(),
        a.getSiteRef() != null ? a.getSiteRef().getId() : null,
        a.getValidFrom(),
        a.getValidTo(),
        a.isActive(),
        a.getNotes(),
        a.getCreatedAt(),
        a.getUpdatedAt());
  }
}
