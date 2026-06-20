package com.parkflow.modules.reports.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record VoidedTicketRow(
    UUID id,
    String movementType,
    String displayName,
    String paymentMethod,
    BigDecimal amount,
    String reason,
    String voidReason,
    String voidedByName,
    OffsetDateTime voidedAt,
    OffsetDateTime createdAt,
    UUID cashSessionId) {}
