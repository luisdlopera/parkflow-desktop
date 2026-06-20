package com.parkflow.modules.cash.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record DenominationDto(
    @NotNull @Min(0) BigDecimal denomination,
    @NotNull @Min(0) Integer quantity
) {}
