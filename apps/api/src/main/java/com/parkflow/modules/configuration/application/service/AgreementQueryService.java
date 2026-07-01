package com.parkflow.modules.configuration.application.service;

import com.parkflow.modules.configuration.dto.AgreementResponse;
import com.parkflow.modules.configuration.domain.Agreement;
import com.parkflow.modules.configuration.domain.repository.AgreementPort;
import com.parkflow.modules.auth.security.SecurityUtils;
import com.parkflow.modules.common.dto.PageResponse;
import com.parkflow.modules.common.exception.OperationException;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Agreement Query - handles retrieval and listing of agreements.
 * Read-only service for querying agreement state.
 */
@Service
@RequiredArgsConstructor
public class AgreementQueryService {

  private final AgreementPort repo;

  @Transactional(readOnly = true)
  public PageResponse<AgreementResponse> list(
      String site, String q, Boolean active, Pageable pageable) {
    UUID companyId = SecurityUtils.requireCompanyId();
    Page<Agreement> page = repo.search(site, q, active, companyId, pageable);
    return PageResponse.of(page.map(this::toResponse));
  }

  @Transactional(readOnly = true)
  public AgreementResponse get(UUID id) {
    return toResponse(findOrThrow(id));
  }

  @Transactional(readOnly = true)
  public AgreementResponse resolveByCode(String code) {
    UUID companyId = SecurityUtils.requireCompanyId();
    Agreement a = repo.findByCodeAndIsActiveTrueAndCompanyId(code, companyId)
        .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND,
            "Convenio no encontrado o inactivo para el código: " + code));
    return toResponse(a);
  }

  // ─── helpers ───────────────────────────────────────────────────────────────

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
