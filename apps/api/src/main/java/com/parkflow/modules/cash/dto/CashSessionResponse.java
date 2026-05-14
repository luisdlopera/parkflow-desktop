package com.parkflow.modules.cash.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record CashSessionResponse(
    UUID id,
    CashRegisterInfoResponse register,
    UUID operatorId,
    String operatorName,
    String status,
    BigDecimal openingAmount,
    OffsetDateTime openedAt,
    OffsetDateTime closedAt,
    UUID closedById,
    String closedByName,
    BigDecimal expectedAmount,
    BigDecimal countedAmount,
    BigDecimal differenceAmount,
    BigDecimal countCash,
    BigDecimal countCard,
    BigDecimal countTransfer,
    BigDecimal countOther,
    String notes,
    String closingNotes,
    String closingWitnessName,
    String supportDocumentNumber,
    OffsetDateTime countedAt,
    UUID countOperatorId,
    String countOperatorName) {}
