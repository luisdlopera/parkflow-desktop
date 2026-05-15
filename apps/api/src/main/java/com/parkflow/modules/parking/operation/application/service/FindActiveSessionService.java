package com.parkflow.modules.parking.operation.application.service;

import com.parkflow.modules.parking.operation.application.port.in.ComplexPricingPort;
import com.parkflow.modules.parking.operation.application.port.in.FindActiveSessionUseCase;
import com.parkflow.modules.parking.operation.domain.*;
import com.parkflow.modules.parking.operation.dto.OperationResultResponse;
import com.parkflow.modules.parking.operation.dto.ReceiptResponse;
import com.parkflow.modules.parking.operation.domain.pricing.PriceBreakdown;
import com.parkflow.modules.parking.operation.exception.OperationException;
import com.parkflow.modules.parking.operation.domain.repository.ParkingSessionPort;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class FindActiveSessionService implements FindActiveSessionUseCase {

  private final ParkingSessionPort parkingSessionPort;
  private final ComplexPricingPort complexPricingPort;

  @Override
  @Transactional(readOnly = true)
  public OperationResultResponse execute(String ticketNumber, String plate, String agreementCode) {
    ParkingSession session = findActiveSession(ticketNumber, plate);
    PriceBreakdown estimated =
        complexPricingPort.calculate(session, OffsetDateTime.now(), agreementCode, false, true);
    estimated = complexPricingPort.applyCourtesy(session, estimated, false);

    return new OperationResultResponse(
        session.getId().toString(),
        toReceipt(session, Duration.between(session.getEntryAt(), OffsetDateTime.now()).toMinutes(), "0h 0m"),
        "Sesion activa",
        estimated.subtotal(), estimated.surcharge(), estimated.discount(),
        estimated.deductedMinutes(), estimated.total());
  }

  private ParkingSession findActiveSession(String ticketNumber, String plate) {
    if (ticketNumber != null && !ticketNumber.isBlank() && plate != null && !plate.isBlank()) {
      ParkingSession s = parkingSessionPort
          .findByStatusAndTicketNumberAndCompanyId(SessionStatus.ACTIVE, ticketNumber.trim(), com.parkflow.modules.auth.security.SecurityUtils.requireCompanyId())
          .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Sesion activa no encontrada"));
      if (!s.getVehicle().getPlate().equalsIgnoreCase(plate.trim().toUpperCase(Locale.ROOT))) {
        throw new OperationException(HttpStatus.CONFLICT, "Placa no coincide");
      }
      return s;
    }
    if (ticketNumber != null && !ticketNumber.isBlank()) {
      return parkingSessionPort.findByStatusAndTicketNumberAndCompanyId(SessionStatus.ACTIVE, ticketNumber.trim(), com.parkflow.modules.auth.security.SecurityUtils.requireCompanyId())
          .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Sesion activa no encontrada"));
    }
    if (plate != null && !plate.isBlank()) {
      return parkingSessionPort.findByStatusAndVehicle_PlateAndCompanyId(SessionStatus.ACTIVE, plate.trim().toUpperCase(java.util.Locale.ROOT), com.parkflow.modules.auth.security.SecurityUtils.requireCompanyId())
          .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Sesion activa no encontrada"));
    }
    throw new OperationException(HttpStatus.BAD_REQUEST, "ticketNumber o plate es obligatorio");
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
