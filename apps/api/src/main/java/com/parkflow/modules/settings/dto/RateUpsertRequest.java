package com.parkflow.modules.settings.dto;

import com.parkflow.modules.parking.operation.domain.RateType;
import com.parkflow.modules.parking.operation.domain.RoundingMode;
import com.parkflow.modules.parking.operation.domain.VehicleType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalTime;
import java.time.OffsetDateTime;

public record RateUpsertRequest(
    @NotBlank @Size(max = 120) String name,
    VehicleType vehicleType,
    @NotNull RateType rateType,
    @NotNull @DecimalMin(value = "0.0", inclusive = true) @Digits(integer = 8, fraction = 2)
        BigDecimal amount,
    @Min(0) int graceMinutes,
    @Min(0) int toleranceMinutes,
    @Min(1) int fractionMinutes,
    @NotNull RoundingMode roundingMode,
    @NotNull @DecimalMin(value = "0.0", inclusive = true) @Digits(integer = 8, fraction = 2)
        BigDecimal lostTicketSurcharge,
    boolean active,
    @NotBlank @Size(max = 80) String site,
    LocalTime windowStart,
    LocalTime windowEnd,
    OffsetDateTime scheduledActiveFrom,
    OffsetDateTime scheduledActiveTo) {}
