package com.parkflow.modules.configuration.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record PrepaidBalanceResponse(
    UUID id,
    UUID packageId,
    String packageName,
    String plate,
    String holderName,
    int remainingMinutes,
    OffsetDateTime purchasedAt,
    OffsetDateTime expiresAt,
    boolean active,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt) {}
