package com.parkflow.modules.cash.application.usecase;

import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.cash.application.port.in.ParkingCashIntegrationUseCase;
import com.parkflow.modules.cash.domain.*;
import com.parkflow.modules.cash.repository.CashMovementRepository;
import com.parkflow.modules.cash.repository.CashRegisterRepository;
import com.parkflow.modules.cash.repository.CashSessionRepository;
import com.parkflow.modules.cash.application.usecase.CashDomainAuditService;
import com.parkflow.modules.cash.application.usecase.CashPolicyResolver;
import com.parkflow.modules.cash.support.CashHttpContext;
import com.parkflow.modules.auth.security.TenantContext;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.parking.operation.domain.Payment;
import com.parkflow.modules.parking.operation.domain.ParkingSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ParkingCashIntegrationService implements ParkingCashIntegrationUseCase {

  private final CashMovementRepository cashMovementRepository;
  private final CashSessionRepository cashSessionRepository;
  private final CashRegisterRepository cashRegisterRepository;
  private final CashDomainAuditService cashDomainAuditService;
  private final CashPolicyResolver cashPolicyResolver;
  private final CashMovementResponseMapper responseMapper;

  @Override
  @Transactional
  public void assertCashOpenForParkingPayment(ParkingSession parkingSession, UUID cashSessionId) {
    if (!cashPolicyResolver.requireOpenForPayment(policySiteLabel(parkingSession))) {
      return;
    }
    if (cashSessionId != null) {
      cashSessionRepository.findById(cashSessionId)
          .filter(s -> s.getStatus() == CashSessionStatus.OPEN)
          .orElseThrow(() -> new OperationException(HttpStatus.CONFLICT, "La sesion de caja no esta abierta"));
      return;
    }
    String site = normalizeSite(null);  // Site field removed
    String terminal = resolveTerminal(parkingSession);
    CashRegister reg = cashRegisterRepository.findBySiteAndTerminal(site, terminal)
        .orElseThrow(() -> new OperationException(HttpStatus.CONFLICT, "Debe abrir caja en este terminal antes de cobrar"));
    cashSessionRepository.findByRegisterAndStatus(reg.getId(), CashSessionStatus.OPEN)
        .orElseThrow(() -> new OperationException(HttpStatus.CONFLICT, "Debe abrir caja para registrar cobros de parqueo"));
  }

  @Override
  @Transactional
  public void recordParkingPayment(
      ParkingSession parkingSession,
      Payment payment,
      AppUser operator,
      String idempotencyKey,
      CashMovementType movementType,
      UUID cashSessionId) {
    if (payment == null) {
      return;
    }
    if (!cashPolicyResolver.requireOpenForPayment(policySiteLabel(parkingSession))) {
      tryRecordParkingLedger(parkingSession, payment, operator, idempotencyKey, movementType);
      return;
    }
    recordParkingLedgerStrict(parkingSession, payment, operator, idempotencyKey, movementType, cashSessionId);
  }

  private void tryRecordParkingLedger(
      ParkingSession parkingSession,
      Payment payment,
      AppUser operator,
      String idempotencyKey,
      CashMovementType movementType) {
    try {
      recordParkingLedgerStrict(parkingSession, payment, operator, idempotencyKey, movementType, null);
    } catch (OperationException ex) {
      if (ex.getStatus() == HttpStatus.CONFLICT) {
        return;
      }
      throw ex;
    }
  }

  private void recordParkingLedgerStrict(
      ParkingSession parkingSession,
      Payment payment,
      AppUser operator,
      String idempotencyKey,
      CashMovementType movementType,
      UUID cashSessionId) {
    CashSession cashSession;
    String terminal;
    if (cashSessionId != null) {
      cashSession = cashSessionRepository.findById(cashSessionId)
          .filter(s -> s.getStatus() == CashSessionStatus.OPEN)
          .orElseThrow(() -> new OperationException(HttpStatus.CONFLICT, "No hay caja abierta"));
      terminal = cashSession.getCashRegister().getTerminal();
    } else {
      String site = normalizeSite(null);  // Site field removed
      terminal = resolveTerminal(parkingSession);
      CashRegister reg = cashRegisterRepository.findBySiteAndTerminal(site, terminal)
          .orElseThrow(() -> new OperationException(HttpStatus.CONFLICT, "Caja no configurada"));
      cashSession = cashSessionRepository.findByRegisterAndStatus(reg.getId(), CashSessionStatus.OPEN)
          .orElseThrow(() -> new OperationException(HttpStatus.CONFLICT, "No hay caja abierta"));
    }

    String key = StringUtils.hasText(idempotencyKey)
        ? "parkpay:" + idempotencyKey.trim()
        : "parkpay:sess:" + parkingSession.getId() + ":pay:" + payment.getId();
    if (cashMovementRepository.findByIdempotencyKey(key).isPresent()) {
      return;
    }

    UUID companyId = TenantContext.getTenantId() != null
        ? TenantContext.getTenantId()
        : operator.getCompanyId();
    if (companyId == null) {
      throw new OperationException(HttpStatus.UNAUTHORIZED, "Contexto de compañía no identificado");
    }

    CashMovement m = new CashMovement();
    m.setCompanyId(companyId);
    m.setCashSession(cashSession);
    m.setMovementType(movementType);
    m.setPaymentMethod(payment.getMethod());
    m.setAmount(payment.getAmount());
    m.setParkingSession(parkingSession);
    m.setCreatedBy(operator);
    m.setTerminal(terminal);
    m.setIdempotencyKey(key);
    try {
      cashMovementRepository.save(m);
    } catch (DataIntegrityViolationException ex) {
      throw new OperationException(HttpStatus.CONFLICT, "Cobro ya registrado en caja para este ticket");
    }

    Map<String, Object> meta = responseMapper.baseMeta(cashSession);
    meta.put("parkingSessionId", parkingSession.getId().toString());
    cashDomainAuditService.log(cashSession, m, "PARKING_PAYMENT", null, payment.getAmount().toPlainString(), null, meta);
  }

  private static String normalizeSite(String site) {
    return StringUtils.hasText(site) ? site.trim() : "default";
  }

  private static String resolveTerminal(ParkingSession parkingSession) {
    // Terminal field removed
    return CashHttpContext.currentTerminal().orElseThrow(() ->
        new OperationException(HttpStatus.BAD_REQUEST,
            "Defina terminal via header X-Parkflow-Terminal"));
  }

  private static String policySiteLabel(ParkingSession parkingSession) {
    // Site field removed - using DEFAULT
    return "DEFAULT";
  }
}
