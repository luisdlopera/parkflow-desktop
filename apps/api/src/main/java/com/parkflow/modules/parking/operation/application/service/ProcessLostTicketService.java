package com.parkflow.modules.parking.operation.application.service;

import com.parkflow.modules.auth.security.SecurityUtils;
import com.parkflow.modules.cash.application.port.in.CashMovementUseCase;
import com.parkflow.modules.cash.domain.CashMovementType;
import com.parkflow.modules.configuration.domain.OperationalParameter;
import com.parkflow.modules.configuration.domain.repository.OperationalParameterPort;
import com.parkflow.modules.configuration.domain.repository.ParkingSitePort;
import com.parkflow.modules.parking.operation.application.port.in.ComplexPricingPort;
import com.parkflow.modules.parking.operation.application.port.in.ProcessLostTicketUseCase;
import com.parkflow.modules.parking.operation.domain.*;
import com.parkflow.modules.parking.operation.dto.LostTicketRequest;
import com.parkflow.modules.parking.operation.dto.OperationResultResponse;
import com.parkflow.modules.parking.operation.dto.ReceiptResponse;
import com.parkflow.modules.parking.operation.domain.pricing.PriceBreakdown;
import com.parkflow.modules.common.exception.domain.*;
import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.auth.domain.UserRole;
import com.parkflow.modules.auth.domain.repository.AppUserPort;
import com.parkflow.modules.parking.operation.domain.repository.OperationIdempotencyPort;
import com.parkflow.modules.parking.operation.domain.repository.ParkingSessionPort;
import com.parkflow.modules.parking.operation.domain.repository.PaymentPort;

import io.micrometer.core.instrument.MeterRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProcessLostTicketService implements ProcessLostTicketUseCase {

  private static final int LOST_TICKET_ENTRY_DRIFT_MAX_MINUTES = 240;

  private final ParkingSessionPort parkingSessionPort;
  private final AppUserPort appUserPort;
  private final PaymentPort paymentPort;
  private final ParkingSitePort parkingSiteRepository;
  private final OperationalParameterPort operationalParameterRepository;
  private final OperationIdempotencyPort operationIdempotencyPort;
  private final ComplexPricingPort complexPricingPort;
  private final CashMovementUseCase cashMovementUseCase;
  private final MeterRegistry meterRegistry;

  @Override
  @Transactional
  public OperationResultResponse execute(LostTicketRequest request) {
    Optional<OperationResultResponse> replay =
        tryReplay(request.idempotencyKey(), IdempotentOperationType.LOST_TICKET);
    if (replay.isPresent()) return replay.get();

    ParkingSession session = requireActiveSessionForUpdate(request.ticketNumber(), request.plate());
    AppUser operator = findRequiredOperator(request.operatorUserId());

    if (operator.getRole() == UserRole.CAJERO || operator.getRole() == UserRole.OPERADOR) {
      throw new BusinessValidationException("FORBIDDEN_LOST_TICKET", "Solo ADMIN o SUPER_ADMIN puede procesar ticket perdido");
    }
    
    if (request.approximateEntryAt() != null) {
      long driftMinutes = Math.abs(
          Duration.between(request.approximateEntryAt(), session.getEntryAt()).toMinutes());
      if (driftMinutes > LOST_TICKET_ENTRY_DRIFT_MAX_MINUTES) {
        throw new BusinessValidationException("Hora aproximada de ingreso no coincide con el registro");
      }
    }

    OffsetDateTime exitAt = OffsetDateTime.now();
    PriceBreakdown price =
        complexPricingPort.calculate(session, exitAt, null, true, false);
    price = complexPricingPort.applyCourtesy(session, price, true);

    assertExitPhotoIfRequired(session, request.exitImageUrl());
    assertExitPaymentPolicy(session, request.paymentMethod(), price);

    session.registerLostTicket(
        operator,
        exitAt,
        price.total(),
        request.reason(),
        blankToNull(request.exitImageUrl())
    );
    session = parkingSessionPort.save(session);

    if (request.paymentMethod() != null) {
      cashMovementUseCase.assertCashOpenForParkingPayment(session);
      Payment payment = new Payment();
      payment.setSession(session);
      payment.setMethod(request.paymentMethod());
      payment.setAmount(price.total());
      payment.setPaidAt(exitAt);
      paymentPort.save(payment);
      
      cashMovementUseCase.recordParkingPayment(
          session, payment, operator, request.idempotencyKey(), CashMovementType.LOST_TICKET_PAYMENT);
    }

    safeRecordIdempotency(request.idempotencyKey(), IdempotentOperationType.LOST_TICKET, session);
    meterRegistry.counter("parkflow.operations", "operation", "lost_ticket").increment();

    return new OperationResultResponse(
        session.getId().toString(),
        toReceipt(session, Duration.between(session.getEntryAt(), exitAt).toMinutes(), "0h 0m"),
        "Ticket perdido procesado",
        price.subtotal(), price.surcharge(), price.discount(), price.deductedMinutes(), price.total());
  }

  private AppUser findRequiredOperator(UUID operatorUserId) {
    UUID effectiveId = operatorUserId != null ? operatorUserId : SecurityUtils.requireUserId();
    AppUser user = appUserPort.findById(effectiveId)
        .orElseThrow(() -> new EntityNotFoundException("Operador", effectiveId.toString()));
    if (!user.isActive()) throw new BusinessValidationException("OPERATOR_INACTIVE", "Operador inactivo");
    return user;
  }

  private ParkingSession requireActiveSessionForUpdate(String ticketNumber, String plate) {
    UUID companyId = SecurityUtils.requireCompanyId();
    if (ticketNumber != null && !ticketNumber.isBlank() && plate != null && !plate.isBlank()) {
      ParkingSession s = parkingSessionPort
          .findActiveByTicketForUpdate(SessionStatus.ACTIVE, ticketNumber.trim(), companyId)
          .orElseThrow(() -> new EntityNotFoundException("Sesion activa", ticketNumber));
      if (!s.getVehicle().getPlate().equalsIgnoreCase(plate.trim().toUpperCase(Locale.ROOT))) {
        throw new BusinessValidationException("Placa no coincide");
      }
      return s;
    }
    if (ticketNumber != null && !ticketNumber.isBlank()) {
      return parkingSessionPort.findActiveByTicketForUpdate(SessionStatus.ACTIVE, ticketNumber.trim(), companyId)
          .orElseThrow(() -> new EntityNotFoundException("Sesion activa", ticketNumber));
    }
    if (plate != null && !plate.isBlank()) {
      return parkingSessionPort.findActiveByPlateForUpdate(
              SessionStatus.ACTIVE, plate.trim().toUpperCase(Locale.ROOT), companyId)
          .orElseThrow(() -> new EntityNotFoundException("Sesion activa para placa", plate));
    }
    throw new BusinessValidationException("ticketNumber o plate es obligatorio");
  }

  private void assertExitPaymentPolicy(ParkingSession session, PaymentMethod paymentMethod,
      PriceBreakdown price) {
    BigDecimal due = price.total();
    boolean allowWaive = due.compareTo(BigDecimal.ZERO) == 0 || isAllowExitWithoutPayment(session);
    if (!allowWaive && paymentMethod == null) {
      throw new BusinessValidationException("Registre medio de pago");
    }
  }

  private boolean isAllowExitWithoutPayment(ParkingSession session) {
    return resolveOperationalParameter(session)
        .map(OperationalParameter::isAllowExitWithoutPayment).orElse(false);
  }

  private void assertExitPhotoIfRequired(ParkingSession session, String exitImageUrl) {
    if (resolveOperationalParameter(session).map(OperationalParameter::isRequirePhotoExit).orElse(false)) {
      if (blankToNull(exitImageUrl) == null) {
        throw new BusinessValidationException("La sede exige foto en salida");
      }
    }
  }

  private Optional<OperationalParameter> resolveOperationalParameter(ParkingSession session) {
    String siteKey = session.getSite();
    if (siteKey == null || siteKey.isBlank()) return Optional.empty();
    return parkingSiteRepository.findByCode(siteKey.trim())
        .or(() -> parkingSiteRepository.findByNameIgnoreCase(siteKey.trim()))
        .flatMap(site -> operationalParameterRepository.findBySite_Id(site.getId()));
  }

  private Optional<OperationResultResponse> tryReplay(String idempotencyKey, IdempotentOperationType expected) {
    if (idempotencyKey == null || idempotencyKey.isBlank()) return Optional.empty();
    return operationIdempotencyPort.findByIdempotencyKey(idempotencyKey.trim())
        .map(row -> {
          if (row.getOperationType() != expected) {
            throw new ConcurrentOperationException("Clave de idempotencia ya usada");
          }
          ParkingSession session = row.getSession();
          if (session.getStatus() != SessionStatus.LOST_TICKET) {
             throw new BusinessValidationException("Estado invalido para idempotencia");
          }
          OffsetDateTime exitAt = session.getExitAt() != null ? session.getExitAt() : OffsetDateTime.now();
          var dur = Duration.between(session.getEntryAt(), exitAt).toMinutes();
          return new OperationResultResponse(session.getId().toString(),
              toReceipt(session, dur, "0h 0m"), "Ticket perdido (idempotente)",
              null, null, null, session.getAppliedPrepaidMinutes(), session.getTotalAmount());
        });
  }

  private void safeRecordIdempotency(String idempotencyKey, IdempotentOperationType type, ParkingSession session) {
    if (idempotencyKey == null || idempotencyKey.isBlank()) return;
    OperationIdempotency row = new OperationIdempotency();
    row.setIdempotencyKey(idempotencyKey.trim());
    row.setOperationType(type);
    row.setSession(session);
    row.setCreatedAt(OffsetDateTime.now());
    try {
      operationIdempotencyPort.save(row);
    } catch (DataIntegrityViolationException ex) {
      // handled
    }
  }

  private ReceiptResponse toReceipt(ParkingSession session, long totalMinutes, String duration) {
    return new ReceiptResponse(
        session.getTicketNumber(), session.getPlate(),
        session.getVehicle().getType(),
        session.getSite(), session.getLane(), session.getBooth(), session.getTerminal(),
        session.getEntryOperator() != null ? session.getEntryOperator().getName() : null,
        session.getExitOperator() != null ? session.getExitOperator().getName() : null,
        session.getEntryAt(), session.getExitAt(), totalMinutes, duration,
        session.getTotalAmount(),
        session.getRate() != null ? session.getRate().getName() : null,
        session.getStatus(),
        session.isLostTicket() || session.getStatus() == SessionStatus.LOST_TICKET,
        session.getReprintCount(),
        session.getEntryImageUrl(), session.getExitImageUrl(), session.getSyncStatus(),
        session.getEntryMode() != null ? session.getEntryMode() : EntryMode.VISITOR,
        session.isMonthlySession(), session.getAgreementCode(), session.getAppliedPrepaidMinutes());
  }

  private String blankToNull(String s) { return s == null || s.isBlank() ? null : s.trim(); }
}
