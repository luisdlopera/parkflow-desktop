package com.parkflow.modules.reports.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record OperatorRow(
    UUID operatorId,
    String operatorName,
    long transactionCount,
    BigDecimal totalAmount,
    BigDecimal cashAmount,
    BigDecimal cardAmount,
    BigDecimal transferAmount,
    BigDecimal otherAmount) {}
