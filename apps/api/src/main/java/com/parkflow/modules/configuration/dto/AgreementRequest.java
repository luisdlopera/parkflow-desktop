package com.parkflow.modules.configuration.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record AgreementRequest(
    @NotBlank @Size(max = 40) String code,
    @NotBlank @Size(max = 200) String companyName,
    @NotNull @DecimalMin("0.0") @Max(100) @Digits(integer = 3, fraction = 2)
        BigDecimal discountPercent,
    @Min(0) int maxHoursPerDay,
    @DecimalMin("0.0") @Digits(integer = 10, fraction = 2) BigDecimal flatAmount,
    UUID rateId,
    @Size(max = 80) String site,
    UUID siteId,
    LocalDate validFrom,
    LocalDate validTo,
    boolean active,
    @Size(max = 500) String notes) {}
