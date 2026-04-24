package com.parkflow.modules.settings.dto;

import com.parkflow.modules.parking.operation.domain.RateType;
import com.parkflow.modules.parking.operation.domain.RoundingMode;
import com.parkflow.modules.parking.operation.domain.VehicleType;
import java.math.BigDecimal;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.UUID;

public record RateResponse(
    UUID id,
    String name,
    VehicleType vehicleType,
    RateType rateType,
    BigDecimal amount,
    int graceMinutes,
    int toleranceMinutes,
    int fractionMinutes,
    RoundingMode roundingMode,
    BigDecimal lostTicketSurcharge,
    boolean active,
    String site,
    LocalTime windowStart,
    LocalTime windowEnd,
    OffsetDateTime scheduledActiveFrom,
    OffsetDateTime scheduledActiveTo,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt) {}
