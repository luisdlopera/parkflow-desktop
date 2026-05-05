package com.parkflow.modules.configuration.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record RateFractionResponse(
    UUID id,
    UUID rateId,
    int fromMinute,
    int toMinute,
    BigDecimal value,
    boolean roundUp,
    boolean isActive,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt) {}
