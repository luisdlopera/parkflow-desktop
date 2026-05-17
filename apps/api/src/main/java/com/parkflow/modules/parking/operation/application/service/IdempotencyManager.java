package com.parkflow.modules.parking.operation.application.service;

import com.parkflow.modules.parking.operation.domain.IdempotentOperationType;
import com.parkflow.modules.parking.operation.domain.OperationIdempotency;
import com.parkflow.modules.parking.operation.domain.ParkingSession;
import com.parkflow.modules.parking.operation.domain.repository.OperationIdempotencyPort;
import com.parkflow.modules.parking.operation.dto.OperationResultResponse;
import com.parkflow.modules.parking.operation.dto.ReceiptResponse;
import com.parkflow.modules.common.exception.domain.ConcurrentOperationException;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class IdempotencyManager {
  private final OperationIdempotencyPort operationIdempotencyPort;

  public Optional<OperationResultResponse> tryReplay(String key, IdempotentOperationType type) {
    if (key == null || key.isBlank()) return Optional.empty();
    return operationIdempotencyPort.findByIdempotencyKey(key)
        .map(i -> {
           if (i.getOperationType() != type) {
             throw new ConcurrentOperationException("Clave de idempotencia ya usada con otra operacion");
           }
            ParkingSession session = i.getSession();
            ReceiptResponse receipt = new ReceiptResponse(
                session.getTicketNumber(), session.getPlate(),
                session.getVehicle() != null ? session.getVehicle().getType() : null,
                session.getSite(), session.getLane(), session.getBooth(), session.getTerminal(),
                session.getEntryOperator() != null ? session.getEntryOperator().getName() : null,
                session.getExitOperator() != null ? session.getExitOperator().getName() : null,
                session.getEntryAt(), session.getExitAt(), 0, "0h 0m",
                session.getTotalAmount(),
                session.getRate() != null ? session.getRate().getName() : null,
                session.getStatus(), session.isLostTicket(), session.getReprintCount(),
                session.getEntryImageUrl(), session.getExitImageUrl(),
                session.getSyncStatus(), session.getEntryMode(), session.isMonthlySession(),
                session.getAgreementCode(), session.getAppliedPrepaidMinutes());

            return new OperationResultResponse(
                session.getId().toString(),
                receipt,
                "Operacion (idempotente)",
                null, null, null, session.getAppliedPrepaidMinutes(), session.getTotalAmount());
        });
  }

  public void record(String key, IdempotentOperationType type, ParkingSession session, UUID companyId) {
    if (key == null || key.isBlank()) return;
    OperationIdempotency i = new OperationIdempotency();
    i.setIdempotencyKey(key);
    i.setOperationType(type);
    i.setSession(session);
    i.setCreatedAt(OffsetDateTime.now());
    operationIdempotencyPort.save(i);
  }
}
