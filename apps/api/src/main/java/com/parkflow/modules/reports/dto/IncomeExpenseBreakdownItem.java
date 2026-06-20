package com.parkflow.modules.reports.dto;

import java.math.BigDecimal;

public record IncomeExpenseBreakdownItem(
    String movementType,
    String displayName,
    BigDecimal amount,
    long count) {}
