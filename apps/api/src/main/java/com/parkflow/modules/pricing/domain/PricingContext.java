package com.parkflow.modules.pricing.domain;

import com.parkflow.modules.parking.operation.domain.EntryMode;
import com.parkflow.modules.parking.operation.domain.Rate;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record PricingContext(
    OffsetDateTime entryAt,
    OffsetDateTime exitAt,
    Rate rate,
    String vehicleType,
    String agreementCode,
    boolean lostTicket,
    EntryMode entryMode,
    Integer availablePrepaidMinutes,
    boolean hasActiveMonthlyContract,
    BigDecimal agreementFlatAmount,
    BigDecimal agreementDiscountPercent
) {}
