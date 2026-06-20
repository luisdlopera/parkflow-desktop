package com.parkflow.modules.reports.dto;

import java.math.BigDecimal;

public record VehicleTypeRow(
    String vehicleType,
    long activeCount,
    long entriesToday,
    long exitsToday,
    BigDecimal revenueToday) {}
