package com.parkflow.modules.settings.dto;

import com.parkflow.modules.parking.operation.domain.RateType;
import com.parkflow.modules.parking.operation.domain.RoundingMode;
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
    String vehicleType,
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
    java.util.UUID siteId,
    @DecimalMin(value = "0.0", inclusive = true) @Digits(integer = 8, fraction = 2) java.math.BigDecimal baseValue,
    @Min(0) int baseMinutes,
    @DecimalMin(value = "0.0", inclusive = true) @Digits(integer = 8, fraction = 2) java.math.BigDecimal additionalValue,
    @Min(0) int additionalMinutes,
    @DecimalMin(value = "0.0", inclusive = true) @Digits(integer = 8, fraction = 2) java.math.BigDecimal maxDailyValue,
    boolean appliesNight,
    boolean appliesHoliday,
    LocalTime windowStart,
    LocalTime windowEnd,
    OffsetDateTime scheduledActiveFrom,
    OffsetDateTime scheduledActiveTo) {}
