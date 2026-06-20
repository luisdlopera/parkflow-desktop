package com.parkflow.modules.reports.dto;

import java.math.BigDecimal;

public record PaymentMethodRow(
    String paymentMethod,
    String displayName,
    long transactionCount,
    BigDecimal totalAmount,
    double percentage) {}
