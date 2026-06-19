package com.parkflow.modules.parking.operation.application.service;

import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.parking.operation.application.port.in.RegisterExitUseCase;
import com.parkflow.modules.parking.operation.domain.ParkingSession;
import com.parkflow.modules.parking.operation.dto.ExitRequest;
import com.parkflow.modules.parking.operation.dto.MassExitFilterRequest;
import com.parkflow.modules.parking.operation.dto.MassExitItemResult;
import com.parkflow.modules.parking.operation.dto.MassExitItemResult.MassExitItemStatus;
import com.parkflow.modules.parking.operation.dto.OperationResultResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Slf4j
@Service
@RequiredArgsConstructor
public class MassExitItemProcessor {

  private final RegisterExitUseCase registerExitUseCase;

  @Transactional(propagation = Propagation.REQUIRES_NEW)
  public MassExitItemResult processOne(
      ParkingSession session,
      MassExitFilterRequest request,
      AppUser operator,
      String batchId) {
    try {
      ExitRequest exitReq = buildExitRequest(session, request, operator, batchId);
      OperationResultResponse res = registerExitUseCase.execute(exitReq);
      boolean isFree = request.chargeMode() == MassExitFilterRequest.ChargeMode.FREE;
      BigDecimal charged = isFree ? BigDecimal.ZERO : (res.total() != null ? res.total() : BigDecimal.ZERO);
      return new MassExitItemResult(
          session.getTicketNumber(),
          session.getPlate(),
          session.getVehicle() != null ? session.getVehicle().getType() : null,
          session.getSite(),
          session.getEntryAt(),
          MassExitItemStatus.SUCCESS,
          charged,
          null);
    } catch (Exception e) {
      log.warn("Mass exit failed for ticket {}: {}", session.getTicketNumber(), e.getMessage());
      return new MassExitItemResult(
          session.getTicketNumber(),
          session.getPlate(),
          session.getVehicle() != null ? session.getVehicle().getType() : null,
          session.getSite(),
          session.getEntryAt(),
          MassExitItemStatus.FAILED,
          BigDecimal.ZERO,
          e.getMessage());
    }
  }

  private ExitRequest buildExitRequest(
      ParkingSession session,
      MassExitFilterRequest request,
      AppUser operator,
      String batchId) {
    boolean isFree = request.chargeMode() == MassExitFilterRequest.ChargeMode.FREE;
    return new ExitRequest(
        "MASS-" + batchId + "-" + session.getTicketNumber(),
        session.getTicketNumber(),
        null,
        operator.getId(),
        isFree ? null : request.paymentMethod(),
        null,
        null,
        request.reason(),
        null,
        null,
        null,
        null,
        null,
        null,
        request.cashSessionId(),
        isFree);
  }
}
