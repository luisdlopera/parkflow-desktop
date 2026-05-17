package com.parkflow.modules.parking.operation.application.service;

import com.parkflow.modules.parking.operation.application.port.in.ComplexPricingPort;
import com.parkflow.modules.parking.operation.application.port.in.GetTicketUseCase;
import com.parkflow.modules.parking.operation.domain.*;
import com.parkflow.modules.parking.operation.dto.OperationResultResponse;
import com.parkflow.modules.parking.operation.dto.ReceiptResponse;
import com.parkflow.modules.parking.operation.domain.pricing.PriceBreakdown;
import com.parkflow.modules.common.exception.domain.EntityNotFoundException;
import com.parkflow.modules.parking.operation.domain.repository.ParkingSessionPort;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class GetTicketService implements GetTicketUseCase {

  private final ParkingSessionPort parkingSessionPort;
  private final ComplexPricingPort complexPricingPort;

  @Override
  @Transactional(readOnly = true)
  public OperationResultResponse execute(String ticketNumber) {
    ParkingSession session =
        parkingSessionPort.findByTicketNumberAndCompanyId(ticketNumber, com.parkflow.modules.auth.security.SecurityUtils.requireCompanyId())
            .orElseThrow(() -> new EntityNotFoundException("Ticket", ticketNumber));

    int graceMinutes = session.getRate() != null ? session.getRate().getGraceMinutes() : 0;
    DurationCalculator.DurationBreakdown duration = DurationCalculator.calculate(
        session.getEntryAt(),
        Optional.ofNullable(session.getExitAt()).orElse(OffsetDateTime.now()),
        graceMinutes);

    PriceBreakdown estimated = null;
    if (session.getStatus() == SessionStatus.ACTIVE && session.getRate() != null) {
      OffsetDateTime ref = Optional.ofNullable(session.getExitAt()).orElse(OffsetDateTime.now());
      estimated = complexPricingPort.calculate(session, ref, null, false, true);
      estimated = complexPricingPort.applyCourtesy(session, estimated, false);
    }

    return new OperationResultResponse(
        session.getId().toString(),
        toReceipt(session, duration.totalMinutes(), duration.human()),
        "Ticket encontrado",
        estimated != null ? estimated.subtotal() : null,
        estimated != null ? estimated.surcharge() : null,
        estimated != null ? estimated.discount() : null,
        estimated != null ? estimated.deductedMinutes() : session.getAppliedPrepaidMinutes(),
        estimated != null ? estimated.total() : session.getTotalAmount());
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
