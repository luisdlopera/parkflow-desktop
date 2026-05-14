package com.parkflow.modules.settings.dto;

import com.parkflow.modules.parking.operation.domain.RateCategory;
import com.parkflow.modules.parking.operation.domain.RateType;
import com.parkflow.modules.parking.operation.domain.RoundingMode;
import java.math.BigDecimal;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.UUID;

public record RateResponse(
    // Identificación
    UUID id,
    String name,
    String vehicleType,
    RateCategory category,
    RateType rateType,

    // Valor base
    BigDecimal amount,

    // Tiempos
    int graceMinutes,
    int toleranceMinutes,
    int fractionMinutes,
    RoundingMode roundingMode,

    // Ticket perdido
    BigDecimal lostTicketSurcharge,

    // Estado y sede
    boolean active,
    String site,
    UUID siteId,

    // Estructura base + adicional
    BigDecimal baseValue,
    int baseMinutes,
    BigDecimal additionalValue,
    int additionalMinutes,

    // Topes
    BigDecimal minSessionValue,
    BigDecimal maxSessionValue,
    BigDecimal maxDailyValue,

    // Noche y festivos
    boolean appliesNight,
    BigDecimal nightSurchargePercent,
    boolean appliesHoliday,
    BigDecimal holidaySurchargePercent,

    // Días de la semana (bitmap)
    Integer appliesDaysBitmap,

    // Franja horaria
    LocalTime windowStart,
    LocalTime windowEnd,

    // Vigencia programada
    OffsetDateTime scheduledActiveFrom,
    OffsetDateTime scheduledActiveTo,

    // Auditoría
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt) {}
