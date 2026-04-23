package com.parkflow.modules.parking.operation.dto;

import java.time.OffsetDateTime;

public record OperationsSummaryResponse(
    long activeVehicles,
    long entriesSinceMidnight,
    long exitsSinceMidnight,
    long reprintsSinceMidnight,
    long lostTicketSinceMidnight,
    long printFailedSinceMidnight,
    long printDeadLetterSinceMidnight,
    long syncQueuePending,
    OffsetDateTime generatedAt) {}
