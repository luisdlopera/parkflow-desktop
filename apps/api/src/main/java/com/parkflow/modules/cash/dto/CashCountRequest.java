package com.parkflow.modules.cash.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record CashCountRequest(
    @NotNull @DecimalMin("0.00") BigDecimal countCash,
    @NotNull @DecimalMin("0.00") BigDecimal countCard,
    @NotNull @DecimalMin("0.00") BigDecimal countTransfer,
    @NotNull @DecimalMin("0.00") BigDecimal countOther,
    @Size(max = 4000) String observations) {}
