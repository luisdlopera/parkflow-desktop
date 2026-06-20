package com.parkflow.modules.reports.dto;

import java.math.BigDecimal;
import java.util.List;

public record IncomeExpenseResponse(
    BigDecimal incomeTotal,
    BigDecimal expenseTotal,
    BigDecimal netTotal,
    List<IncomeExpenseBreakdownItem> breakdown) {}
