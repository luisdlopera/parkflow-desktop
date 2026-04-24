package com.parkflow.modules.cash.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.UUID;

public record OpenCashRequest(
    @NotBlank @Size(max = 80) String site,
    @NotBlank @Size(max = 80) String terminal,
    @Size(max = 120) String registerLabel,
    @NotNull @DecimalMin("0.00") BigDecimal openingAmount,
    @NotNull UUID operatorUserId,
    @Size(max = 120) String openIdempotencyKey,
    @Size(max = 2000) String notes) {}
