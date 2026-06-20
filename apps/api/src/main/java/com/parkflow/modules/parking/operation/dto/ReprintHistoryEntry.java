package com.parkflow.modules.parking.operation.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record ReprintHistoryEntry(
    UUID eventId,
    String operatorName,
    UUID operatorId,
    String reason,
    int reprintNumber,
    OffsetDateTime reprintedAt) {}
