package com.parkflow.modules.settings.dto;

import com.parkflow.modules.configuration.domain.RateCategory;
import com.parkflow.modules.configuration.domain.RateType;
import com.parkflow.modules.configuration.domain.RoundingMode;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.UUID;

public record RateUpsertRequest(
    // -----------------------------------------------------------------------
    // Identificación
    // -----------------------------------------------------------------------
    @NotBlank @Size(max = 120) String name,
    String vehicleType,
    RateCategory category,                 // null → STANDARD
    @NotNull RateType rateType,

    // -----------------------------------------------------------------------
    // Valor base
    // -----------------------------------------------------------------------
    @NotNull @DecimalMin(value = "0.0", inclusive = true) @Digits(integer = 8, fraction = 2)
        BigDecimal amount,

    // -----------------------------------------------------------------------
    // Tiempos operativos
    // -----------------------------------------------------------------------
    @Min(0) int graceMinutes,
    @Min(0) int toleranceMinutes,
    @Min(1) int fractionMinutes,
    @NotNull RoundingMode roundingMode,

    // -----------------------------------------------------------------------
    // Recargo ticket perdido
    // -----------------------------------------------------------------------
    @NotNull @DecimalMin(value = "0.0", inclusive = true) @Digits(integer = 8, fraction = 2)
        BigDecimal lostTicketSurcharge,

    // -----------------------------------------------------------------------
    // Estado y sede
    // -----------------------------------------------------------------------
    boolean active,
    @NotBlank @Size(max = 80) String site,
    UUID siteId,

    // -----------------------------------------------------------------------
    // Estructura base + adicional
    // -----------------------------------------------------------------------
    @DecimalMin(value = "0.0", inclusive = true) @Digits(integer = 8, fraction = 2)
        BigDecimal baseValue,
    @Min(0) int baseMinutes,
    @DecimalMin(value = "0.0", inclusive = true) @Digits(integer = 8, fraction = 2)
        BigDecimal additionalValue,
    @Min(0) int additionalMinutes,

    // -----------------------------------------------------------------------
    // Topes
    // -----------------------------------------------------------------------
    @DecimalMin(value = "0.0", inclusive = true) @Digits(integer = 8, fraction = 2)
        BigDecimal minSessionValue,

    @DecimalMin(value = "0.0", inclusive = true) @Digits(integer = 8, fraction = 2)
        BigDecimal maxSessionValue,

    @DecimalMin(value = "0.0", inclusive = true) @Digits(integer = 8, fraction = 2)
        BigDecimal maxDailyValue,

    // -----------------------------------------------------------------------
    // Noche y festivos
    // -----------------------------------------------------------------------
    boolean appliesNight,
    @DecimalMin(value = "0.0", inclusive = true) @Digits(integer = 3, fraction = 2)
        BigDecimal nightSurchargePercent,

    boolean appliesHoliday,
    @DecimalMin(value = "0.0", inclusive = true) @Digits(integer = 3, fraction = 2)
        BigDecimal holidaySurchargePercent,

    // -----------------------------------------------------------------------
    // Días de la semana (bitmap: bit0=Lun … bit6=Dom; null = todos)
    // -----------------------------------------------------------------------
    @Min(0) @Max(127) Integer appliesDaysBitmap,

    // -----------------------------------------------------------------------
    // Franja horaria
    // -----------------------------------------------------------------------
    LocalTime windowStart,
    LocalTime windowEnd,

    // -----------------------------------------------------------------------
    // Vigencia programada
    // -----------------------------------------------------------------------
    OffsetDateTime scheduledActiveFrom,
    OffsetDateTime scheduledActiveTo) {}
