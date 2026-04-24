package com.parkflow.modules.cash.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record CashMovementResponse(
    UUID id,
    UUID cashSessionId,
    String movementType,
    String paymentMethod,
    BigDecimal amount,
    UUID parkingSessionId,
    String reason,
    String metadata,
    String status,
    OffsetDateTime voidedAt,
    String voidReason,
    UUID voidedById,
    String externalReference,
    UUID createdById,
    OffsetDateTime createdAt,
    String terminal,
    String idempotencyKey) {}
