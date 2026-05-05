package com.parkflow.modules.configuration.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record RateFractionRequest(
    @Min(0) int fromMinute,
    @Min(1) int toMinute,
    @NotNull @DecimalMin(value = "0.0", inclusive = true) @Digits(integer = 8, fraction = 2) BigDecimal value,
    boolean roundUp,
    boolean isActive) {}
