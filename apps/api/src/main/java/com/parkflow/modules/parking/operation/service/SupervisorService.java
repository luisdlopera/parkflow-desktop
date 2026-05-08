package com.parkflow.modules.parking.operation.service;

import com.parkflow.modules.parking.operation.domain.SessionEventType;
import com.parkflow.modules.parking.operation.domain.SessionStatus;
import com.parkflow.modules.parking.operation.dto.OperationsSummaryResponse;
import com.parkflow.modules.parking.operation.repository.ParkingSessionRepository;
import com.parkflow.modules.parking.operation.repository.SessionEventRepository;
import com.parkflow.modules.sync.repository.SyncEventRepository;
import com.parkflow.modules.tickets.entity.PrintJobStatus;
import com.parkflow.modules.tickets.repository.PrintJobRepository;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.EnumSet;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SupervisorService {

  private final ParkingSessionRepository parkingSessionRepository;
  private final SessionEventRepository sessionEventRepository;
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
    long printFailed =
      printJobRepository.countByStatusInAndCreatedAtBetween(
        EnumSet.of(PrintJobStatus.FAILED), dayStart, nextDayStart);
    long deadLetter =
        printJobRepository.countByStatusInAndCreatedAtAfter(
            EnumSet.of(PrintJobStatus.DEAD_LETTER), dayStart);
    long syncPending = syncEventRepository.countBySyncedAtIsNull();
    return new OperationsSummaryResponse(
        active, entries, exits, reprints, lost, printFailed, deadLetter, syncPending, now);
  }
}
