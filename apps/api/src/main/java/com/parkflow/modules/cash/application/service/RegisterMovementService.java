package com.parkflow.modules.cash.application.service;

import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.auth.domain.UserRole;
import com.parkflow.modules.auth.domain.AuthAuditAction;
import com.parkflow.modules.auth.application.service.AuthAuditService;
import com.parkflow.modules.cash.application.port.in.RegisterCashMovementUseCase;
import com.parkflow.modules.cash.domain.*;
import com.parkflow.modules.cash.dto.CashMovementRequest;
import com.parkflow.modules.cash.dto.CashMovementResponse;
import com.parkflow.modules.cash.repository.CashMovementRepository;
import com.parkflow.modules.cash.repository.CashSessionRepository;
import com.parkflow.modules.cash.service.CashDomainAuditService;
import com.parkflow.modules.cash.service.CashPolicyResolver;
import com.parkflow.modules.cash.support.CashHttpContext;
import com.parkflow.modules.auth.security.SecurityUtils;
import com.parkflow.modules.auth.security.TenantContext;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.parking.operation.domain.ParkingSession;
import com.parkflow.modules.parking.operation.repository.AppUserRepository;
import com.parkflow.modules.parking.operation.repository.ParkingSessionRepository;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class RegisterMovementService implements RegisterCashMovementUseCase {

  private static final BigDecimal MAX_CASHIER_ADJUST = new BigDecimal("500000.00");

  private final CashMovementRepository cashMovementRepository;
  private final CashSessionRepository cashSessionRepository;
  private final AppUserRepository appUserRepository;
  private final ParkingSessionRepository parkingSessionRepository;
  private final CashDomainAuditService cashDomainAuditService;
  private final AuthAuditService authAuditService;
  private final CashPolicyResolver cashPolicyResolver;
  private final MeterRegistry meterRegistry;
  private final CashMovementResponseMapper responseMapper;

  @Override
  @Transactional
  @PreAuthorize("hasAuthority('cobros:registrar')")
  public CashMovementResponse addMovement(UUID sessionId, CashMovementRequest request) {
    CashSession session = requireOpenSession(sessionId);
    validateOperator(session.getOperator().getId());

    if (request.type() == CashMovementType.PARKING_PAYMENT
        || request.type() == CashMovementType.VOID_OFFSET) {
      throw new OperationException(HttpStatus.BAD_REQUEST, "Tipo de movimiento no permitido en API");
    }
    if ((request.type() == CashMovementType.DISCOUNT
            || request.type() == CashMovementType.MANUAL_EXPENSE
            || request.type() == CashMovementType.WITHDRAWAL
            || request.type() == CashMovementType.CUSTOMER_REFUND
            || request.type() == CashMovementType.ADJUSTMENT)
        && !StringUtils.hasText(request.reason())) {
      throw new OperationException(HttpStatus.BAD_REQUEST, "Motivo obligatorio para este movimiento");
    }
    if (request.type() == CashMovementType.ADJUSTMENT || request.type() == CashMovementType.CUSTOMER_REFUND) {
      UserRole role = SecurityUtils.requireUserRole();
      if (request.amount().compareTo(MAX_CASHIER_ADJUST) > 0
          && role != UserRole.ADMIN
          && role != UserRole.SUPER_ADMIN) {
        throw new OperationException(
            HttpStatus.FORBIDDEN, "Monto elevado (" + request.type() + "): requiere perfil administrador");
      }
    }

    if (CashHttpContext.offlineClientFlag()) {
      BigDecimal max = cashPolicyResolver.offlineMaxManualMovement(session.getCashRegister().getSite());
      if (offlineCappedMovement(request.type()) && request.amount().compareTo(max) > 0) {
        throw new OperationException(HttpStatus.FORBIDDEN,
            "Monto supera tope para movimientos manuales en modo offline (" + max + ")");
      }
    }

    if (StringUtils.hasText(request.idempotencyKey())) {
      Optional<CashMovement> ex = cashMovementRepository.findByIdempotencyKey(request.idempotencyKey().trim());
      if (ex.isPresent()) {
        if (!ex.get().getCashSession().getId().equals(sessionId)) {
          throw new OperationException(HttpStatus.CONFLICT, "Idempotency key ya usada en otra sesion");
        }
        return responseMapper.toMovementResponse(ex.get());
      }
    }

    AppUser actor = appUserRepository.findById(SecurityUtils.requireUserId())
        .orElseThrow(() -> new OperationException(HttpStatus.UNAUTHORIZED, "Usuario no encontrado"));

    if (request.type() == CashMovementType.REPRINT_FEE && !StringUtils.hasText(request.reason())) {
      throw new OperationException(HttpStatus.BAD_REQUEST, "Motivo obligatorio para cobro de reimpresion");
    }

    CashMovement m = new CashMovement();
    m.setCompanyId(resolveCompanyId(actor));
    m.setCashSession(session);
    m.setMovementType(request.type());
    m.setPaymentMethod(request.paymentMethod());
    m.setAmount(request.amount().setScale(2, RoundingMode.HALF_UP));
    m.setReason(request.reason());
    m.setMetadata(request.metadataJson());
    m.setExternalReference(request.externalReference());
    m.setCreatedBy(actor);
    m.setTerminal(CashHttpContext.currentTerminal().orElse(session.getCashRegister().getTerminal()));
    if (StringUtils.hasText(request.idempotencyKey())) {
      m.setIdempotencyKey(request.idempotencyKey().trim());
    }
    if (request.parkingSessionId() != null) {
      ParkingSession ps = parkingSessionRepository.findById(request.parkingSessionId())
          .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Sesion no encontrada"));
      m.setParkingSession(ps);
    }
    try {
      m = cashMovementRepository.save(m);
    } catch (DataIntegrityViolationException ex) {
      throw new OperationException(HttpStatus.CONFLICT, "Movimiento duplicado o conflicto de concurrencia");
    }

    Map<String, Object> meta = responseMapper.baseMeta(session);
    meta.put("movementId", m.getId().toString());
    meta.put("movementType", m.getMovementType().name());
    authAuditService.log(AuthAuditAction.CASH_MOVEMENT_POST, actor, null, "posted", meta);
    cashDomainAuditService.log(session, m, "MOVEMENT_POST", null, m.getAmount().toPlainString(), m.getReason(), meta);

    meterRegistry.counter("parkflow.cash.movements", "type", m.getMovementType().name()).increment();

    return responseMapper.toMovementResponse(m);
  }

  private UUID resolveCompanyId(AppUser actor) {
    UUID id = TenantContext.getTenantId() != null
        ? TenantContext.getTenantId()
        : actor.getCompanyId();
    if (id == null) {
      throw new OperationException(HttpStatus.UNAUTHORIZED, "Contexto de compañía no identificado");
    }
    return id;
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

  private static boolean offlineCappedMovement(CashMovementType t) {
    return t == CashMovementType.MANUAL_INCOME
        || t == CashMovementType.MANUAL_EXPENSE
        || t == CashMovementType.WITHDRAWAL
        || t == CashMovementType.CUSTOMER_REFUND
        || t == CashMovementType.DISCOUNT
        || t == CashMovementType.ADJUSTMENT
        || t == CashMovementType.REPRINT_FEE;
  }
}
