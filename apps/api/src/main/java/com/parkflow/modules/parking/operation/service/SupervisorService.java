package com.parkflow.modules.parking.operation.service;

import com.parkflow.modules.parking.operation.dto.OperationsSummaryResponse;
import com.parkflow.modules.parking.operation.repository.ParkingSessionRepository;
import com.parkflow.modules.sync.repository.SyncEventRepository;
import com.parkflow.modules.tickets.entity.PrintJobStatus;
import com.parkflow.modules.tickets.repository.PrintJobRepository;
import com.parkflow.modules.auth.security.SecurityUtils;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.EnumSet;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SupervisorService {

  private final ParkingSessionRepository parkingSessionRepository;
  private final PrintJobRepository printJobRepository;
  private final SyncEventRepository syncEventRepository;

  @Transactional(readOnly = true)
  public OperationsSummaryResponse buildSummary(ZoneId siteZone) {
    ZoneId z = siteZone != null ? siteZone : ZoneId.of("America/Bogota");
    ZonedDateTime startOfDay = ZonedDateTime.now(z).toLocalDate().atStartOfDay(z);
    OffsetDateTime dayStart = startOfDay.toOffsetDateTime();
    OffsetDateTime nextDayStart = startOfDay.plusDays(1).toOffsetDateTime();
    OffsetDateTime now = OffsetDateTime.now();

    long active = parkingSessionRepository.countActive();
    long entries = parkingSessionRepository.countEntriesInPeriod(dayStart, nextDayStart);
    long exits = parkingSessionRepository.countExitsInPeriod(dayStart, nextDayStart);
    long reprints = parkingSessionRepository.countReprintsInPeriod(dayStart, nextDayStart);
    long lost = parkingSessionRepository.countLostTicketsInPeriod(dayStart, nextDayStart);
    
    UUID companyId = SecurityUtils.requireCompanyId();
    long printFailed =
      printJobRepository.countByCompanyIdAndStatusInAndCreatedAtBetween(
        companyId, EnumSet.of(PrintJobStatus.FAILED), dayStart, nextDayStart);
    long deadLetter =
        printJobRepository.countByCompanyIdAndStatusInAndCreatedAtAfter(
            companyId, EnumSet.of(PrintJobStatus.DEAD_LETTER), dayStart);
    long syncPending = syncEventRepository.countByCompanyIdAndSyncedAtIsNull(companyId);
    return new OperationsSummaryResponse(
        active, entries, exits, reprints, lost, printFailed, deadLetter, syncPending, now);
  }
}
