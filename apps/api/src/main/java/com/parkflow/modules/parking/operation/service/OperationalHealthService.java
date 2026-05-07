package com.parkflow.modules.parking.operation.service;

import com.parkflow.modules.cash.domain.CashSessionStatus;
import com.parkflow.modules.cash.repository.CashSessionRepository;
import com.parkflow.modules.licensing.repository.LicensedDeviceRepository;
import com.parkflow.modules.parking.operation.dto.OperationalHealthResponse;
import com.parkflow.modules.sync.repository.SyncEventRepository;
import com.parkflow.modules.tickets.entity.PrintJobStatus;
import com.parkflow.modules.tickets.repository.PrintJobRepository;
import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class OperationalHealthService {
  private final PrintJobRepository printJobRepository;
  private final SyncEventRepository syncEventRepository;
  private final LicensedDeviceRepository licensedDeviceRepository;
  private final CashSessionRepository cashSessionRepository;

  @Transactional(readOnly = true)
  public OperationalHealthResponse getOperationalHealth() {
    long outboxPending = syncEventRepository.countBySyncedAtIsNull();
    long failedEvents =
        printJobRepository
            .findTop10ByStatusInOrderByUpdatedAtDesc(EnumSet.of(PrintJobStatus.FAILED))
            .size();
    long deadLetter =
        printJobRepository
            .findTop10ByStatusInOrderByUpdatedAtDesc(EnumSet.of(PrintJobStatus.DEAD_LETTER))
            .size();

    OffsetDateTime lastHeartbeat =
        licensedDeviceRepository.findAll().stream()
            .map(d -> d.getLastHeartbeatAt())
            .filter(v -> v != null)
            .max(Comparator.naturalOrder())
            .orElse(null);

    OffsetDateTime lastSync =
        syncEventRepository.findTopBySyncedAtIsNotNullOrderBySyncedAtDesc()
            .map(s -> s.getSyncedAt())
            .orElse(null);

    long openCashRegisters = cashSessionRepository.countByStatus(CashSessionStatus.OPEN);

    String printerStatus = deadLetter > 0 ? "CRITICAL" : failedEvents > 0 ? "WARNING" : "OK";
    String syncStatus = outboxPending > 50 ? "CRITICAL" : outboxPending > 0 ? "WARNING" : "OK";
    String heartbeatStatus =
        lastHeartbeat == null || lastHeartbeat.isBefore(OffsetDateTime.now().minusMinutes(10))
            ? "WARNING"
            : "OK";

    String overall =
        List.of(printerStatus, syncStatus, heartbeatStatus).contains("CRITICAL")
            ? "CRITICAL"
            : List.of(printerStatus, syncStatus, heartbeatStatus).contains("WARNING")
                ? "WARNING"
                : "OK";

    var recentErrors =
        printJobRepository
            .findTop10ByStatusInOrderByUpdatedAtDesc(EnumSet.of(PrintJobStatus.FAILED, PrintJobStatus.DEAD_LETTER))
            .stream()
            .map(
                p ->
                    new OperationalHealthResponse.OperationalErrorItem(
                        "PRINT",
                        p.getStatus().name(),
                        p.getLastError() != null ? p.getLastError() : "Error de impresión",
                        p.getUpdatedAt()))
            .toList();

    return new OperationalHealthResponse(
        overall,
        "OK",
        "OK",
        printerStatus,
        lastHeartbeat,
        outboxPending,
        failedEvents,
        deadLetter,
        lastSync,
        openCashRegisters,
        recentErrors);
  }
}
