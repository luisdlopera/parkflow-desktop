package com.parkflow.modules.cash.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record CashAuditEntryResponse(
    UUID id,
    String action,
    UUID actorUserId,
    String actorName,
    String terminalId,
    String clientIp,
    String oldValue,
    String newValue,
    String reason,
    String metadata,
    OffsetDateTime createdAt) {}
