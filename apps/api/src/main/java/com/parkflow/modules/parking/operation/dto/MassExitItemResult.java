package com.parkflow.modules.parking.operation.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record MassExitItemResult(
    String ticketNumber,
    String plate,
    String vehicleType,
    String site,
    OffsetDateTime entryAt,
    MassExitItemStatus status,
    BigDecimal amountCharged,
    String errorMessage) {

  public enum MassExitItemStatus {
    SUCCESS,
    FAILED,
    SKIPPED
  }
}
