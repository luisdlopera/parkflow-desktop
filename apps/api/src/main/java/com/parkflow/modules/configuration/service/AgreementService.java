package com.parkflow.modules.configuration.service;

import com.parkflow.modules.configuration.dto.AgreementRequest;
import com.parkflow.modules.configuration.dto.AgreementResponse;
import com.parkflow.modules.configuration.entity.Agreement;
import com.parkflow.modules.configuration.entity.ParkingSite;
import com.parkflow.modules.configuration.repository.AgreementRepository;
import com.parkflow.modules.configuration.repository.ParkingSiteRepository;
import com.parkflow.modules.parking.operation.domain.Rate;
import com.parkflow.modules.parking.operation.exception.OperationException;
import com.parkflow.modules.parking.operation.repository.RateRepository;
import com.parkflow.modules.settings.dto.SettingsPageResponse;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AgreementService {

  private final AgreementRepository repo;
  private final ParkingSiteRepository siteRepository;
  private final RateRepository rateRepository;
  private final com.parkflow.modules.audit.service.AuditService globalAuditService;
  private final com.fasterxml.jackson.databind.ObjectMapper objectMapper;

  @Transactional(readOnly = true)
  public SettingsPageResponse<AgreementResponse> list(
      String site, String q, Boolean active, Pageable pageable) {
    Page<Agreement> page = repo.search(site, q, active, pageable);
    return SettingsPageResponse.of(page.map(this::toResponse));
  }

  @Transactional(readOnly = true)
  public AgreementResponse get(UUID id) {
    return toResponse(findOrThrow(id));
  }

  /** Resolución de convenio por código para uso en caja (GET público por código). */
  @Transactional(readOnly = true)
  public AgreementResponse resolveByCode(String code) {
    Agreement a = repo.findByCodeAndIsActiveTrue(code)
        .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND,
            "Convenio no encontrado o inactivo para el código: " + code));
    return toResponse(a);
  }

  @Transactional
  public AgreementResponse create(AgreementRequest req) {
    if (repo.existsByCode(req.code())) {
      throw new OperationException(HttpStatus.CONFLICT,
          "Ya existe un convenio con el código: " + req.code());
    }
    Agreement a = fromRequest(req, new Agreement());
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
    
    if (repo.existsByCodeAndIdNot(req.code(), id)) {
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

  // -------------------------------------------------------------------------

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
