package com.parkflow.modules.configuration.application.service;

import com.parkflow.modules.configuration.dto.AgreementRequest;
import com.parkflow.modules.configuration.dto.AgreementResponse;
import com.parkflow.modules.configuration.domain.Agreement;
import com.parkflow.modules.configuration.domain.ParkingSite;
import com.parkflow.modules.configuration.domain.repository.AgreementPort;
import com.parkflow.modules.configuration.domain.repository.ParkingSitePort;
import com.parkflow.modules.parking.operation.domain.Rate;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.auth.security.SecurityUtils;
import com.parkflow.modules.parking.operation.domain.repository.RatePort;
import com.parkflow.modules.audit.application.port.out.AuditPort;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Agreement Management - handles creation, updates, and status changes of agreements.
 * Manages agreement lifecycle and business rules.
 */
@Service
@RequiredArgsConstructor
public class AgreementManagementService {

  private final AgreementPort repo;
  private final ParkingSitePort siteRepository;
  private final RatePort rateRepository;
  private final AuditPort globalAuditService;
  private final ObjectMapper objectMapper;

  @Transactional
  public AgreementResponse create(AgreementRequest req) {
    UUID companyId = SecurityUtils.requireCompanyId();
    if (repo.existsByCodeAndCompanyId(req.code(), companyId)) {
      throw new OperationException(HttpStatus.CONFLICT,
          "Ya existe un convenio con el código: " + req.code());
    }
    Agreement a = fromRequest(req, new Agreement());
    a.setCompanyId(companyId);
    a = repo.save(a);
    try {
        globalAuditService.record(
            com.parkflow.modules.audit.domain.AuditAction.CREAR,
            null,
            objectMapper.writeValueAsString(req),
            "Agreement created: " + a.getId());
    } catch (Exception e) {
        // ignore
    }
    return toResponse(a);
  }

  @Transactional
  public AgreementResponse update(UUID id, AgreementRequest req) {
    Agreement a = findOrThrow(id);
    String before = "";
    try { before = objectMapper.writeValueAsString(toResponse(a)); } catch(Exception e) {}

    if (repo.existsByCodeAndIdNotAndCompanyId(req.code(), id, a.getCompanyId())) {
      throw new OperationException(HttpStatus.CONFLICT,
          "Ya existe otro convenio con el código: " + req.code());
    }
    fromRequest(req, a);
    a = repo.save(a);

    try {
        globalAuditService.record(
            com.parkflow.modules.audit.domain.AuditAction.EDITAR,
            before,
            objectMapper.writeValueAsString(toResponse(a)),
            "Agreement updated: " + id);
    } catch (Exception e) {
        // ignore
    }
    return toResponse(a);
  }

  @Transactional
  public AgreementResponse patchStatus(UUID id, boolean active) {
    Agreement a = findOrThrow(id);
    boolean previous = a.isActive();
    a.setActive(active);
    a.setUpdatedAt(OffsetDateTime.now());
    a = repo.save(a);

    globalAuditService.record(
        com.parkflow.modules.audit.domain.AuditAction.ELIMINAR,
        "active=" + previous,
        "active=" + active,
        "Agreement status changed: " + id);

    return toResponse(a);
  }

  // ─── helpers ───────────────────────────────────────────────────────────────

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
    return repo.findById(id)
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
