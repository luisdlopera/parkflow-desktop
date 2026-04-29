package com.parkflow.modules.parking.operation.dto;

import com.parkflow.modules.parking.operation.domain.SessionStatus;
import com.parkflow.modules.parking.operation.domain.SessionSyncStatus;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record ReceiptResponse(
    String ticketNumber,
    String plate,
    String vehicleType,
    String site,
    String lane,
    String booth,
    String terminal,
    String entryOperatorName,
    String exitOperatorName,
    OffsetDateTime entryAt,
    OffsetDateTime exitAt,
    long totalMinutes,
    String duration,
    BigDecimal totalAmount,
    String rateName,
    SessionStatus status,
    boolean lostTicket,
    int reprintCount,
    String entryImageUrl,
    String exitImageUrl,
    SessionSyncStatus syncStatus) {}
