package com.parkflow.modules.reports.infrastructure.persistence;

import com.parkflow.modules.cash.domain.CashMovement;
import com.parkflow.modules.cash.domain.CashSession;
import com.parkflow.modules.cash.infrastructure.persistence.CashMovementRepository;
import com.parkflow.modules.cash.infrastructure.persistence.CashSessionRepository;
import com.parkflow.modules.parking.operation.infrastructure.persistence.ParkingSessionRepository;
import com.parkflow.modules.parking.spaces.domain.ParkingSpaceStatus;
import com.parkflow.modules.parking.spaces.infrastructure.persistence.ParkingSpaceRepository;
import com.parkflow.modules.reports.application.port.out.CashReportReaderPort;
import com.parkflow.modules.reports.application.port.out.ParkingReportReaderPort;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class ReportReaderAdapter implements CashReportReaderPort, ParkingReportReaderPort {

  private final CashMovementRepository cashMovementRepo;
  private final CashSessionRepository cashSessionRepo;
  private final ParkingSessionRepository parkingSessionRepo;
  private final ParkingSpaceRepository parkingSpaceRepo;

  @Override
  public Page<CashSession> findCashSessionsByDateRange(UUID companyId, OffsetDateTime start, OffsetDateTime end, Pageable pageable) {
    return cashSessionRepo.findByCompanyIdAndOpenedAtBetweenOrderByOpenedAtDesc(companyId, start, end, pageable);
  }

  @Override
  public Optional<CashSession> findSessionById(UUID sessionId) {
    return cashSessionRepo.findById(sessionId);
  }

  @Override
  public List<com.parkflow.modules.cash.infrastructure.persistence.CashMovementSummaryProjection> getCashSessionSummary(UUID sessionId) {
    return cashMovementRepo.getSummaryBySessionId(sessionId);
  }

  @Override
  public Page<CashMovement> findPaidTicketsInPeriod(UUID companyId, OffsetDateTime start, OffsetDateTime end, Pageable pageable) {
    return cashMovementRepo.findPaidTicketsInPeriod(companyId, start, end, pageable);
  }

  @Override
  public List<CashMovement> findVoidedInPeriod(UUID companyId, OffsetDateTime start, OffsetDateTime end) {
    return cashMovementRepo.findVoidedInPeriod(companyId, start, end);
  }

  @Override
  public List<com.parkflow.modules.cash.infrastructure.persistence.MovementTypeSummaryProjection> sumPostedByMovementTypeInPeriod(UUID companyId, OffsetDateTime start, OffsetDateTime end) {
    return cashMovementRepo.sumPostedByMovementTypeInPeriod(companyId, start, end);
  }

  @Override
  public long countPostedBySessionId(UUID sessionId) {
    return cashMovementRepo.countPostedBySessionId(sessionId);
  }

  @Override
  public Map<String, BigDecimal> sumRevenueByPaymentMethodInPeriod(UUID companyId, OffsetDateTime start, OffsetDateTime end) {
    return cashMovementRepo.sumRevenueByPaymentMethodInPeriod(companyId, start, end);
  }

  @Override
  public List<Object[]> sumRevenueByVehicleTypeInPeriod(UUID companyId, OffsetDateTime start, OffsetDateTime end) {
    return cashMovementRepo.sumRevenueByVehicleTypeInPeriod(companyId, start, end);
  }

  @Override
  public List<Object[]> sumPostedByOperatorInPeriod(UUID companyId, OffsetDateTime start, OffsetDateTime end) {
    return cashMovementRepo.sumPostedByOperatorInPeriod(companyId, start, end);
  }

  @Override
  public List<Object[]> sumPostedByPaymentMethodInPeriod(UUID companyId, OffsetDateTime start, OffsetDateTime end) {
    return cashMovementRepo.sumPostedByPaymentMethodInPeriod(companyId, start, end);
  }

  @Override
  public long countEntriesInPeriod(OffsetDateTime start, OffsetDateTime end, UUID companyId) {
    return parkingSessionRepo.countEntriesInPeriod(start, end, companyId);
  }

  @Override
  public long countExitsInPeriod(OffsetDateTime start, OffsetDateTime end, UUID companyId) {
    return parkingSessionRepo.countExitsInPeriod(start, end, companyId);
  }

  @Override
  public long countLostTicketsInPeriod(OffsetDateTime start, OffsetDateTime end, UUID companyId) {
    return parkingSessionRepo.countLostTicketsInPeriod(start, end, companyId);
  }

  @Override
  public List<Object[]> countActiveByVehicleType(UUID companyId) {
    return parkingSessionRepo.countActiveByVehicleType(companyId);
  }

  @Override
  public List<Object[]> countEntriesByVehicleTypeInPeriod(UUID companyId, OffsetDateTime start, OffsetDateTime end) {
    return parkingSessionRepo.countEntriesByVehicleTypeInPeriod(companyId, start, end);
  }

  @Override
  public List<Object[]> countExitsByVehicleTypeInPeriod(UUID companyId, OffsetDateTime start, OffsetDateTime end) {
    return parkingSessionRepo.countExitsByVehicleTypeInPeriod(companyId, start, end);
  }

  @Override
  public long countActive(UUID companyId) {
    return parkingSessionRepo.countActive(companyId);
  }

  @Override
  public Page<Object[]> findPaidTicketsInPeriodRaw(UUID companyId, OffsetDateTime start, OffsetDateTime end, Pageable pageable) {
    return cashMovementRepo.findPaidTicketsInPeriod(companyId, start, end, pageable)
        .map(m -> new Object[]{
            m.getParkingSession() != null ? m.getParkingSession().getTicketNumber() : null,
            m.getCreatedAt(),
            m.getPaymentMethod(),
            m.getAmount(),
            m.getCashSession() != null && m.getCashSession().getOperator() != null ? m.getCashSession().getOperator().getName() : null
        });
  }

  @Override
  public long countByCompanyId(UUID companyId) {
    return parkingSpaceRepo.countByCompanyId(companyId);
  }

  @Override
  public long countByCompanyIdAndStatus(UUID companyId, ParkingSpaceStatus status) {
    return parkingSpaceRepo.countByCompanyIdAndStatus(companyId, status);
  }
}