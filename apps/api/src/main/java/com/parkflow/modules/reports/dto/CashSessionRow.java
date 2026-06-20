package com.parkflow.modules.reports.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record CashSessionRow(
    UUID id,
    OffsetDateTime openedAt,
    OffsetDateTime closedAt,
    String operatorName,
    String status,
    BigDecimal openingAmount,
    BigDecimal expectedAmount,
    BigDecimal countedAmount,
    BigDecimal difference,
    long movementCount) {}
