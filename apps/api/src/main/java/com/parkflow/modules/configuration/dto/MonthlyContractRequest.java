package com.parkflow.modules.configuration.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record MonthlyContractRequest(
    @NotNull UUID rateId,
    @NotBlank @Size(max = 20) String plate,
    @Size(max = 30) String vehicleType,
    @NotBlank @Size(max = 120) String holderName,
    @Size(max = 40) String holderDocument,
    @Size(max = 30) String holderPhone,
    @Email @Size(max = 120) String holderEmail,
    @NotBlank @Size(max = 80) String site,
    UUID siteId,
    @NotNull LocalDate startDate,
    @NotNull LocalDate endDate,
    @NotNull @DecimalMin("0.0") @Digits(integer = 10, fraction = 2) BigDecimal amount,
    boolean active,
    @Size(max = 500) String notes) {}
