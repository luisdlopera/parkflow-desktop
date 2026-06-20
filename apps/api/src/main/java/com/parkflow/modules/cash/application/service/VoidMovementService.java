package com.parkflow.modules.cash.application.service;

import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.auth.domain.UserRole;
import com.parkflow.modules.auth.domain.AuthAuditAction;
import com.parkflow.modules.auth.application.service.AuthAuditService;
import com.parkflow.modules.cash.application.port.in.VoidCashMovementUseCase;
import com.parkflow.modules.cash.domain.*;
import com.parkflow.modules.cash.dto.CashMovementResponse;
import com.parkflow.modules.cash.dto.VoidMovementRequest;
import com.parkflow.modules.cash.repository.CashMovementRepository;
import com.parkflow.modules.cash.repository.CashSessionRepository;
import com.parkflow.modules.cash.service.CashDomainAuditService;
import com.parkflow.modules.auth.security.SecurityUtils;
import com.parkflow.modules.auth.security.TenantContext;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.parking.operation.repository.AppUserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class VoidMovementService implements VoidCashMovementUseCase {

  private final CashMovementRepository cashMovementRepository;
  private final CashSessionRepository cashSessionRepository;
  private final AppUserRepository appUserRepository;
  private final CashDomainAuditService cashDomainAuditService;
  private final AuthAuditService authAuditService;
  private final CashLedgerSummaryCalculator cashLedgerSummaryCalculator;
  private final CashMovementResponseMapper responseMapper;

  @Override
  @Transactional
  @PreAuthorize("hasAuthority('anulaciones:crear')")
  public CashMovementResponse voidMovement(UUID sessionId, UUID movementId, VoidMovementRequest request) {
    CashSession session = requireOpenSession(sessionId);
    validateOperator(session.getOperator().getId());

    CashMovement m = cashMovementRepository.findById(movementId)
        .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Movimiento no encontrado"));
    if (!m.getCashSession().getId().equals(sessionId)) {
      throw new OperationException(HttpStatus.BAD_REQUEST, "Movimiento no pertenece a la sesion");
    }
    if (m.getStatus() == CashMovementStatus.VOIDED) {
      return responseMapper.toMovementResponse(m);
    }
    if (m.getMovementType() == CashMovementType.VOID_OFFSET) {
      throw new OperationException(HttpStatus.BAD_REQUEST, "No se puede anular un movimiento de contrapartida");
    }

    if (StringUtils.hasText(request.idempotencyKey())) {
      String vk = "void:" + movementId + ":" + request.idempotencyKey().trim();
      Optional<CashMovement> existing = cashMovementRepository.findByIdempotencyKey(vk);
      if (existing.isPresent()) {
        m.setStatus(CashMovementStatus.VOIDED);
        return responseMapper.toMovementResponse(m);
      }
    }

    AppUser actor = appUserRepository.findById(SecurityUtils.requireUserId())
        .orElseThrow(() -> new OperationException(HttpStatus.UNAUTHORIZED, "Usuario no encontrado"));

    OffsetDateTime now = OffsetDateTime.now();
    m.setStatus(CashMovementStatus.VOIDED);
    m.setVoidedAt(now);
    m.setVoidReason(request.reason());
    m.setVoidedBy(actor);

    String voidKey = null;
    if (StringUtils.hasText(request.idempotencyKey())) {
      voidKey = "void:" + movementId + ":" + request.idempotencyKey().trim();
      m.setIdempotencyKey(voidKey);
    }

    try {
      cashMovementRepository.save(m);
    } catch (DataIntegrityViolationException ex) {
      throw new OperationException(HttpStatus.CONFLICT, "Movimiento ya anulado o conflicto de concurrencia");
    }

    UUID companyId = TenantContext.getTenantId() != null
        ? TenantContext.getTenantId()
        : actor.getCompanyId();
    if (companyId == null) {
      throw new OperationException(HttpStatus.UNAUTHORIZED, "Contexto de compañía no identificado");
    }

    CashMovement offset = new CashMovement();
    offset.setCompanyId(companyId);
    offset.setCashSession(session);
    offset.setMovementType(CashMovementType.VOID_OFFSET);
    offset.setPaymentMethod(m.getPaymentMethod());
    offset.setAmount(cashLedgerSummaryCalculator.ledgerContribution(m).negate());
    offset.setReason("Anulacion: " + request.reason());
    offset.setMetadata("{\"voidOf\":\"" + m.getId() + "\"}");
    offset.setCreatedBy(actor);
    offset.setTerminal(m.getTerminal());
    if (voidKey != null) {
      offset.setIdempotencyKey(voidKey + ":offset");
    }

    try {
      cashMovementRepository.save(offset);
    } catch (DataIntegrityViolationException ex) {
      throw new OperationException(HttpStatus.CONFLICT, "Error creando movimiento de contrapartida para anulación");
    }

    Map<String, Object> meta = responseMapper.baseMeta(session);
    meta.put("voidedMovementId", m.getId().toString());
    meta.put("offsetId", offset.getId().toString());
    authAuditService.log(AuthAuditAction.CASH_MOVEMENT_VOID, actor, null, "voided", meta);
    cashDomainAuditService.log(session, m, "MOVEMENT_VOID",
        m.getAmount().toPlainString(), "0", request.reason(), meta);

    return responseMapper.toMovementResponse(m);
  }

  private CashSession requireOpenSession(UUID id) {
    CashSession s = cashSessionRepository.findById(id)
        .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Sesion de caja no encontrada"));
    if (TenantContext.getTenantId() != null && !s.getCompanyId().equals(TenantContext.getTenantId())) {
      throw new OperationException(HttpStatus.FORBIDDEN, "Acceso denegado a esta sesión");
    }
    if (s.getStatus() != CashSessionStatus.OPEN) {
      throw new OperationException(HttpStatus.CONFLICT, "La sesion de caja ya esta cerrada");
    }
    return s;
  }

  private void validateOperator(UUID operatorUserId) {
    UUID actor = SecurityUtils.requireUserId();
    UserRole role = SecurityUtils.requireUserRole();
    if (!operatorUserId.equals(actor) && role != UserRole.ADMIN && role != UserRole.SUPER_ADMIN) {
      throw new OperationException(HttpStatus.FORBIDDEN, "Solo puede operar caja como su usuario");
    }
    AppUser operator = appUserRepository.findById(operatorUserId)
        .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Operador no encontrado"));
    UUID expectedCompanyId = TenantContext.getTenantId();
    if (expectedCompanyId != null && !operator.getCompanyId().equals(expectedCompanyId)) {
      throw new OperationException(HttpStatus.FORBIDDEN, "Operador no pertenece a la compañía del contexto");
    }
  }
}
