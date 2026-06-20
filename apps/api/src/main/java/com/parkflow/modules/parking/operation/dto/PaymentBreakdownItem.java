package com.parkflow.modules.parking.operation.dto;

import com.parkflow.modules.parking.operation.domain.PaymentMethod;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;

public record PaymentBreakdownItem(
    @NotNull(message = "Payment method is required in breakdown") PaymentMethod method,
    @NotNull(message = "Amount is required in breakdown") @Positive(message = "Amount must be positive") BigDecimal amount
) {}
