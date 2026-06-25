package com.parkflow.modules.parking.operation.application.service;

import com.parkflow.modules.auth.security.SecurityUtils;
import com.parkflow.modules.parking.operation.application.port.in.ListActiveSessionsUseCase;
import com.parkflow.modules.parking.operation.domain.*;
import com.parkflow.modules.parking.operation.dto.ReceiptResponse;
import com.parkflow.modules.parking.operation.domain.repository.ParkingSessionPort;
import com.parkflow.modules.parking.operation.domain.repository.CustodiedItemPort;
import com.parkflow.modules.parking.spaces.application.service.ParkingSpaceService;
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
  private final CustodiedItemPort custodiedItemRepository;
  private final ParkingSpaceService parkingSpaceService;

  @Override
  @Transactional(readOnly = true)
  public com.parkflow.modules.parking.operation.dto.PaginatedResponse<ReceiptResponse> execute(int page, int limit, String search, String sortBy, String sortDir) {
    OffsetDateTime now = OffsetDateTime.now();
    org.springframework.data.domain.Sort.Direction direction = "asc".equalsIgnoreCase(sortDir) ? org.springframework.data.domain.Sort.Direction.ASC : org.springframework.data.domain.Sort.Direction.DESC;
    org.springframework.data.domain.Sort sort = org.springframework.data.domain.Sort.by(direction, sortBy != null && !sortBy.isEmpty() ? sortBy : "entryAt");
    Pageable pageable = org.springframework.data.domain.PageRequest.of(page > 0 ? page - 1 : 0, limit > 0 ? limit : 25, sort);
    
    org.springframework.data.domain.Page<ParkingSession> sessionPage;
    if (search != null && !search.trim().isEmpty()) {
      sessionPage = parkingSessionPort.searchActiveByPlateOrTicket(search.trim(), SecurityUtils.requireCompanyId(), pageable);
    } else {
      sessionPage = parkingSessionPort.findActiveWithAssociations(SessionStatus.ACTIVE, SecurityUtils.requireCompanyId(), pageable);
    }

    List<ReceiptResponse> responses = sessionPage.stream()
        .map(session -> {
          DurationCalculator.DurationBreakdown dur = DurationCalculator.calculate(
              session.getEntryAt(), now,
              session.getRate() != null ? session.getRate().getGraceMinutes() : 0);
          
          com.parkflow.modules.parking.spaces.domain.ParkingSpaceAssignment assignment =
              parkingSpaceService.findAssignmentBySessionId(session.getId());
          com.parkflow.modules.parking.spaces.domain.ParkingSpace space =
              assignment != null ? assignment.getParkingSpace() : null;

          return toReceipt(session, dur.totalMinutes(), dur.human(), space);
        }).toList();

    com.parkflow.modules.parking.operation.dto.PaginatedResponse.Meta meta = new com.parkflow.modules.parking.operation.dto.PaginatedResponse.Meta(
        sessionPage.getTotalElements(),
        page > 0 ? page : 1,
        limit > 0 ? limit : 25,
        sessionPage.getTotalPages()
    );

    return new com.parkflow.modules.parking.operation.dto.PaginatedResponse<>(responses, meta);
  }

  private ReceiptResponse toReceipt(ParkingSession session, long totalMinutes, String duration, com.parkflow.modules.parking.spaces.domain.ParkingSpace space) {
    java.util.List<com.parkflow.modules.parking.operation.dto.CustodiedItemResponse> items = custodiedItemRepository.findBySession(session).stream()
        .map(item -> new com.parkflow.modules.parking.operation.dto.CustodiedItemResponse(
            item.getId(), item.getSession().getId(), item.getItemType(), item.getIdentifier(),
            item.getStatus(), item.getObservations(), item.getPhotoUrl(),
            item.getReceivedBy() != null ? item.getReceivedBy().getName() : null,
            item.getReceivedAt(),
            item.getReturnedBy() != null ? item.getReturnedBy().getName() : null,
            item.getReturnedAt()))
        .toList();

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
        space != null ? space.getId() : null,
        space != null ? space.getCode() : null,
        space != null ? space.getLabel() : null,
        session.isHasHelmet(), items, null, null, null, null);
  }
}
