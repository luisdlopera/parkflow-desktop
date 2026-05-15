package com.parkflow.modules.parking.operation.application.service;

import com.parkflow.modules.parking.operation.dto.OperationsSummaryResponse;
import com.parkflow.modules.parking.operation.domain.repository.ParkingSessionPort;
import com.parkflow.modules.sync.domain.repository.SyncEventPort;
import com.parkflow.modules.tickets.domain.PrintJobStatus;
import com.parkflow.modules.tickets.domain.repository.PrintJobPort;
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

  private final ParkingSessionPort parkingSessionPort;
  private final PrintJobPort printJobRepository;
  private final SyncEventPort syncEventRepository;

  @Transactional(readOnly = true)
  public OperationsSummaryResponse buildSummary(ZoneId siteZone) {
    ZoneId z = siteZone != null ? siteZone : ZoneId.of("America/Bogota");
    ZonedDateTime startOfDay = ZonedDateTime.now(z).toLocalDate().atStartOfDay(z);
    OffsetDateTime dayStart = startOfDay.toOffsetDateTime();
    OffsetDateTime nextDayStart = startOfDay.plusDays(1).toOffsetDateTime();
    OffsetDateTime now = OffsetDateTime.now();

    UUID companyId = SecurityUtils.requireCompanyId();
    long active = parkingSessionPort.countActive(companyId);
    long entries = parkingSessionPort.countEntriesInPeriod(dayStart, nextDayStart, companyId);
    long exits = parkingSessionPort.countExitsInPeriod(dayStart, nextDayStart, companyId);
    long reprints = parkingSessionPort.countReprintsInPeriod(dayStart, nextDayStart, companyId);
    long lost = parkingSessionPort.countLostTicketsInPeriod(dayStart, nextDayStart, companyId);
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
