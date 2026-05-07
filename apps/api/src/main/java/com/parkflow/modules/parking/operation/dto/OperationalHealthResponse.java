package com.parkflow.modules.parking.operation.dto;

import java.time.OffsetDateTime;
import java.util.List;

public record OperationalHealthResponse(
    String overallStatus,
    String apiStatus,
    String databaseStatus,
    String printerStatus,
    OffsetDateTime lastHeartbeat,
    long outboxPending,
    long failedEvents,
    long deadLetter,
    OffsetDateTime lastSuccessfulSync,
    long openCashRegisters,
    List<OperationalErrorItem> recentErrors) {
  public record OperationalErrorItem(
      String source,
      String status,
      String message,
      OffsetDateTime occurredAt) {}
}
