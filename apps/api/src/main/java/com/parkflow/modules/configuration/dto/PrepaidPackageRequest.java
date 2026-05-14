package com.parkflow.modules.configuration.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.UUID;

public record PrepaidPackageRequest(
    @NotBlank @Size(max = 120) String name,
    @Min(1) int hoursIncluded,
    @NotNull @DecimalMin("0.01") @Digits(integer = 10, fraction = 2) BigDecimal amount,
    @Size(max = 30) String vehicleType,
    @Size(max = 80) String site,
    UUID siteId,
    @Min(1) int expiresDays,
    boolean active) {}
