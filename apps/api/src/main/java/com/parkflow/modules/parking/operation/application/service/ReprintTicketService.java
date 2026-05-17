package com.parkflow.modules.parking.operation.application.service;

import com.parkflow.modules.auth.security.SecurityUtils;
import com.parkflow.modules.parking.operation.application.port.in.ReprintTicketUseCase;
import com.parkflow.modules.parking.operation.domain.*;
import com.parkflow.modules.parking.operation.dto.OperationResultResponse;
import com.parkflow.modules.parking.operation.dto.ReceiptResponse;
import com.parkflow.modules.parking.operation.dto.ReprintRequest;
import com.parkflow.modules.common.exception.domain.*;
import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.auth.domain.UserRole;
import com.parkflow.modules.auth.domain.repository.AppUserPort;
import com.parkflow.modules.parking.operation.domain.repository.OperationIdempotencyPort;
import com.parkflow.modules.parking.operation.domain.repository.ParkingSessionPort;

import io.micrometer.core.instrument.MeterRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
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

  @Override
  @Transactional
  public OperationResultResponse execute(ReprintRequest request) {
    Optional<OperationResultResponse> replay =
        tryReplay(request.idempotencyKey(), IdempotentOperationType.REPRINT);
    if (replay.isPresent()) return replay.get();

    ParkingSession session =
        parkingSessionPort
            .findByTicketNumberForUpdate(request.ticketNumber().trim(), SecurityUtils.requireCompanyId())
            .orElseThrow(() -> new EntityNotFoundException("Ticket", request.ticketNumber()));

    AppUser operator = findRequiredOperator(request.operatorUserId());
    int maxReprints = maxReprintsForRole(operator.getRole());
    
    session.reprintTicket(operator, maxReprints, request.reason());
    session = parkingSessionPort.save(session);

    safeRecordIdempotency(request.idempotencyKey(), IdempotentOperationType.REPRINT, session);
    meterRegistry.counter("parkflow.operations", "operation", "reprint").increment();

    DurationCalculator.DurationBreakdown duration = DurationCalculator.calculate(
        session.getEntryAt(),
        Optional.ofNullable(session.getExitAt()).orElse(OffsetDateTime.now()), 0);
    
    return new OperationResultResponse(
        session.getId().toString(), toReceipt(session, duration.totalMinutes(), duration.human()),
        "Ticket reimpreso", null, null, null, session.getAppliedPrepaidMinutes(), session.getTotalAmount());
  }

  private AppUser findRequiredOperator(UUID operatorUserId) {
    UUID effectiveId = operatorUserId != null ? operatorUserId : SecurityUtils.requireUserId();
    AppUser user = appUserPort.findById(effectiveId)
        .orElseThrow(() -> new EntityNotFoundException("Operador", effectiveId.toString()));
    if (!user.isActive()) throw new BusinessValidationException("OPERATOR_INACTIVE", "Operador inactivo");
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
            throw new ConcurrentOperationException("Clave de idempotencia ya usada con otra operacion");
          }
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
        session.isMonthlySession(), session.getAgreementCode(), session.getAppliedPrepaidMinutes());
  }
}
