package com.parkflow.modules.parking.operation.application.service;

import com.parkflow.modules.audit.domain.Auditable;

import com.parkflow.modules.audit.application.port.out.AuditPort;
import com.parkflow.modules.audit.domain.AuditAction;
import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.auth.domain.AuthPermission;
import com.parkflow.modules.auth.security.RolePermissions;
import com.parkflow.modules.auth.security.SecurityUtils;
import com.parkflow.modules.parking.operation.application.port.in.VoidSessionUseCase;
import com.parkflow.modules.parking.operation.domain.*;
import com.parkflow.modules.parking.operation.dto.OperationResultResponse;
import com.parkflow.modules.parking.operation.dto.ReceiptResponse;
import com.parkflow.modules.parking.operation.dto.VoidRequest;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.cash.domain.CashMovement;
import com.parkflow.modules.cash.domain.CashMovementStatus;
import com.parkflow.modules.cash.application.port.out.CashMovementPort;
import com.parkflow.modules.parking.operation.application.port.out.AppUserPort;
import com.parkflow.modules.parking.operation.application.port.out.OperationIdempotencyPort;
import com.parkflow.modules.parking.operation.application.port.out.ParkingSessionPort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class VoidSessionService implements VoidSessionUseCase {

  private final ParkingSessionPort parkingSessionPort;
  private final AppUserPort appUserPort;
  private final OperationIdempotencyPort operationIdempotencyPort;
  private final OperationAuditService auditService;
  private final AuditPort globalAuditService;
  private final CashMovementPort cashMovementPort;

  @Override
  @Transactional
  @Auditable(module = "OPERACION", action = "ANULAR_INGRESO", entityClass = ParkingSession.class)
  public OperationResultResponse execute(VoidRequest request) {
    Optional<OperationResultResponse> replay =
        tryReplay(request.idempotencyKey(), IdempotentOperationType.VOID);
    if (replay.isPresent()) return replay.get();

    ParkingSession session = requireActiveSessionForUpdate(request.ticketNumber(), request.plate());
    AppUser operator = findRequiredOperator(request.operatorUserId());

    if (!RolePermissions.permissionsFor(operator.getRole()).contains(AuthPermission.ANULACIONES_CREAR)) {
      throw new OperationException(HttpStatus.FORBIDDEN, "No tiene permisos para anular tickets");
    }

    session.setStatus(SessionStatus.CANCELED);
    session.setExitNotes(request.reason());
    session.setUpdatedAt(OffsetDateTime.now());
    session = parkingSessionPort.save(session);

    // Void any POSTED cash movements linked to this session to prevent phantom ledger income
    List<CashMovement> postedMovements = cashMovementPort.findPostedByParkingSessionId(session.getId());
    OffsetDateTime now = OffsetDateTime.now();
    for (CashMovement movement : postedMovements) {
      movement.setStatus(CashMovementStatus.VOIDED);
      movement.setVoidedAt(now);
      movement.setVoidedBy(operator);
      movement.setVoidReason("Sesión anulada: " + request.reason());
      cashMovementPort.save(movement);
    }

    auditService.recordEvent(session, SessionEventType.VOIDED, operator, request.reason());
    globalAuditService.record(AuditAction.ANULAR, operator,
        "Status: " + SessionStatus.ACTIVE, "Status: " + SessionStatus.CANCELED,
        "Ticket: " + session.getTicketNumber() + ", Reason: " + request.reason());

    safeRecordIdempotency(request.idempotencyKey(), IdempotentOperationType.VOID, session);

    return new OperationResultResponse(
        session.getId().toString(), toReceipt(session, 0L, "0h 0m"),
        "Ticket anulado", null, null, null, null, null);
  }

  private AppUser findRequiredOperator(UUID operatorUserId) {
    UUID effectiveId = operatorUserId != null ? operatorUserId : SecurityUtils.requireUserId();
    AppUser user = appUserPort.findById(effectiveId)
        .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Operador no encontrado"));
    if (!user.isActive()) throw new OperationException(HttpStatus.FORBIDDEN, "Operador inactivo");
    return user;
  }

  private ParkingSession requireActiveSessionForUpdate(String ticketNumber, String plate) {
    UUID companyId = SecurityUtils.requireCompanyId();
    if (ticketNumber != null && !ticketNumber.isBlank() && plate != null && !plate.isBlank()) {
      ParkingSession s = parkingSessionPort
          .findActiveByTicketForUpdate(SessionStatus.ACTIVE, ticketNumber.trim(), companyId)
          .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Sesion activa no encontrada"));
      if (!s.getVehicle().getPlate().equalsIgnoreCase(plate.trim().toUpperCase(Locale.ROOT))) {
        throw new OperationException(HttpStatus.CONFLICT, "Placa no coincide con el ticket");
      }
      return s;
    }
    if (ticketNumber != null && !ticketNumber.isBlank()) {
      return parkingSessionPort.findActiveByTicketForUpdate(SessionStatus.ACTIVE, ticketNumber.trim(), companyId)
          .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Sesion activa no encontrada"));
    }
    if (plate != null && !plate.isBlank()) {
      return parkingSessionPort.findActiveByPlateForUpdate(
              SessionStatus.ACTIVE, plate.trim().toUpperCase(Locale.ROOT), companyId)
          .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Sesion activa no encontrada"));
    }
    throw new OperationException(HttpStatus.BAD_REQUEST, "ticketNumber o plate es obligatorio");
  }

  private Optional<OperationResultResponse> tryReplay(String idempotencyKey, IdempotentOperationType expected) {
    if (idempotencyKey == null || idempotencyKey.isBlank()) return Optional.empty();
    return operationIdempotencyPort.findByIdempotencyKey(idempotencyKey.trim())
        .map(row -> {
          if (row.getOperationType() != expected) {
            throw new OperationException(HttpStatus.CONFLICT, "Clave de idempotencia ya usada con otra operacion");
          }
          ParkingSession session = row.getSession();
          return new OperationResultResponse(session.getId().toString(),
              toReceipt(session, 0L, "0h 0m"), "Anulacion (idempotente)", null, null, null, null, null);
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
      // already handled
    }
  }

  private ReceiptResponse toReceipt(ParkingSession session, long totalMinutes, String duration) {
    return new ReceiptResponse(
        session.getTicketNumber(), session.getPlate(),
        session.getVehicle().getType(),
        null, null, null, null,
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
        null, null, null, session.isHasHelmet(), null, null, null, null, null);
  }
}
