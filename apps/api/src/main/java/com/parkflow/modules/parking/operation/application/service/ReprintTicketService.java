package com.parkflow.modules.parking.operation.application.service;

import com.parkflow.modules.audit.application.port.out.AuditPort;
import com.parkflow.modules.audit.domain.AuditAction;
import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.auth.domain.UserRole;
import com.parkflow.modules.auth.security.SecurityUtils;
import com.parkflow.modules.parking.operation.application.port.in.ReprintTicketUseCase;
import com.parkflow.modules.parking.operation.domain.*;
import com.parkflow.modules.parking.operation.dto.OperationResultResponse;
import com.parkflow.modules.parking.operation.dto.ReceiptResponse;
import com.parkflow.modules.parking.operation.dto.ReprintRequest;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.parking.operation.domain.repository.AppUserPort;
import com.parkflow.modules.parking.operation.domain.repository.OperationIdempotencyPort;
import com.parkflow.modules.parking.operation.domain.repository.ParkingSessionPort;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReprintTicketService implements ReprintTicketUseCase {

  private final ParkingSessionPort parkingSessionPort;
  private final AppUserPort appUserPort;
  private final OperationIdempotencyPort operationIdempotencyPort;
  private final MeterRegistry meterRegistry;
  private final AuditPort globalAuditService;

  // Mass reprint threshold: max 10 reprints per operator in a 5-minute window
  private static final int MASS_REPRINT_THRESHOLD = 10;
  private static final int MASS_REPRINT_WINDOW_MINUTES = 5;

  @Override
  @Transactional
  public OperationResultResponse execute(ReprintRequest request) {
    Optional<OperationResultResponse> replay =
        tryReplay(request.idempotencyKey(), IdempotentOperationType.REPRINT);
    if (replay.isPresent()) return replay.get();

    UUID companyId = SecurityUtils.requireCompanyId();

    ParkingSession session =
        parkingSessionPort
            .findByTicketNumberForUpdate(request.ticketNumber().trim(), companyId)
            .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Ticket no encontrado"));

    AppUser operator = findRequiredOperator(request.operatorUserId());

    // Mass reprint detection: count recent reprints by this operator
    OffsetDateTime windowStart = OffsetDateTime.now().minus(MASS_REPRINT_WINDOW_MINUTES, ChronoUnit.MINUTES);
    long recentReprints = parkingSessionPort.countReprintsByOperatorInPeriod(
        windowStart, OffsetDateTime.now(), operator.getId(), companyId);
    if (recentReprints >= MASS_REPRINT_THRESHOLD) {
      log.warn("SECURITY: Mass reprint detected for operator={}, count={} in {}min window",
          operator.getId(), recentReprints, MASS_REPRINT_WINDOW_MINUTES);
      throw new OperationException(HttpStatus.TOO_MANY_REQUESTS,
          "Demasiadas reimpresiones en poco tiempo. Intente mas tarde.");
    }

    int maxReprints = maxReprintsForRole(operator.getRole());
    if (session.getReprintCount() >= maxReprints) {
      throw new OperationException(HttpStatus.FORBIDDEN, "Limite de reimpresion alcanzado");
    }

    session.incrementReprint(operator, request.reason());
    session = parkingSessionPort.save(session);

    safeRecordIdempotency(request.idempotencyKey(), IdempotentOperationType.REPRINT, session);
    meterRegistry.counter("parkflow.operations", "operation", "reprint").increment();

    globalAuditService.record(
        AuditAction.REIMPRIMIR, operator,
        "Reprint count: " + (session.getReprintCount() - 1),
        "Reprint count: " + session.getReprintCount(),
        "Ticket: " + session.getTicketNumber() + ", Reprint #" + session.getReprintCount()
            + ", Reason: " + request.reason());

    DurationCalculator.DurationBreakdown duration = DurationCalculator.calculate(
        session.getEntryAt(),
        Optional.ofNullable(session.getExitAt()).orElse(OffsetDateTime.now()), 0);

    return new OperationResultResponse(
        session.getId().toString(), toReceipt(session, duration.totalMinutes(), duration.human()),
        "Ticket reimpreso", null, null, null, session.getAppliedPrepaidMinutes(), session.getTotalAmount());
  }

  private AppUser findRequiredOperator(UUID operatorUserId) {
    UUID authenticatedUserId = SecurityUtils.requireUserId();
    UUID effectiveId = operatorUserId != null ? operatorUserId : authenticatedUserId;
    if (!effectiveId.equals(authenticatedUserId)) {
      throw new OperationException(HttpStatus.FORBIDDEN,
          "El operador especificado no coincide con el usuario autenticado");
    }
    AppUser user = appUserPort.findById(effectiveId)
        .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Operador no encontrado"));
    if (!user.isActive()) throw new OperationException(HttpStatus.FORBIDDEN, "Operador inactivo");
    if (!user.isCanReprintTickets()) {
      throw new OperationException(HttpStatus.FORBIDDEN, "El operador no tiene permiso para reimprimir tickets");
    }
    return user;
  }

  private int maxReprintsForRole(UserRole role) {
    if (role == UserRole.SUPER_ADMIN || role == UserRole.ADMIN) return Integer.MAX_VALUE;
    if (role == UserRole.OPERADOR) return 3;
    return 1;
  }

  private Optional<OperationResultResponse> tryReplay(String idempotencyKey, IdempotentOperationType expected) {
    if (idempotencyKey == null || idempotencyKey.isBlank()) return Optional.empty();
    return operationIdempotencyPort.findByIdempotencyKey(idempotencyKey.trim())
        .map(row -> {
          if (row.getOperationType() != expected) {
            throw new OperationException(HttpStatus.CONFLICT, "Clave de idempotencia ya usada con otra operacion");
          }
          // Re-validate permissions for idempotent replay
          SecurityUtils.requireUserId();
          ParkingSession session = row.getSession();
          DurationCalculator.DurationBreakdown duration = DurationCalculator.calculate(
              session.getEntryAt(), Optional.ofNullable(session.getExitAt()).orElse(OffsetDateTime.now()), 0);
          return new OperationResultResponse(session.getId().toString(),
              toReceipt(session, duration.totalMinutes(), duration.human()),
              "Reimpresion (idempotente)", null, null, null,
              session.getAppliedPrepaidMinutes(), session.getTotalAmount());
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
       // already handled by replay check
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
        session.isMonthlySession(), session.getAgreementCode(), session.getAppliedPrepaidMinutes(),
        null, null, null, session.isHasHelmet(), null,
        session.getPaymentMethod(), session.getTaxAmount(),
        session.getDiscountAmount(), session.getNetAmount());
  }
}
