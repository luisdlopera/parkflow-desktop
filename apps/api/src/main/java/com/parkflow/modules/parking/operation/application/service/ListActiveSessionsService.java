package com.parkflow.modules.parking.operation.application.service;

import com.parkflow.modules.auth.security.SecurityUtils;
import com.parkflow.modules.parking.operation.application.port.in.ListActiveSessionsUseCase;
import com.parkflow.modules.parking.operation.domain.*;
import com.parkflow.modules.parking.operation.dto.ReceiptResponse;
import com.parkflow.modules.parking.operation.domain.repository.ParkingSessionPort;
import com.parkflow.modules.parking.operation.application.service.DurationCalculator;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ListActiveSessionsService implements ListActiveSessionsUseCase {

  private final ParkingSessionPort parkingSessionPort;

  @Override
  @Transactional(readOnly = true)
  public List<ReceiptResponse> execute() {
    OffsetDateTime now = OffsetDateTime.now();
    return parkingSessionPort
        .findActiveWithAssociations(SessionStatus.ACTIVE, SecurityUtils.requireCompanyId(), Pageable.unpaged()).stream()
        .map(session -> {
          DurationCalculator.DurationBreakdown dur = DurationCalculator.calculate(
              session.getEntryAt(), now,
              session.getRate() != null ? session.getRate().getGraceMinutes() : 0);
          return toReceipt(session, dur.totalMinutes(), dur.human());
        }).toList();
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
