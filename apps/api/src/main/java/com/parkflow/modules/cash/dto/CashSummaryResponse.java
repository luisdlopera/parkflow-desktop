package com.parkflow.modules.cash.dto;

import java.math.BigDecimal;
import java.util.Map;

public record CashSummaryResponse(
    BigDecimal openingAmount,
    BigDecimal expectedLedgerTotal,
    BigDecimal countedTotal,
    BigDecimal difference,
    Map<String, BigDecimal> totalsByPaymentMethod,
    Map<String, BigDecimal> totalsByMovementType,
    long movementCount) {}
