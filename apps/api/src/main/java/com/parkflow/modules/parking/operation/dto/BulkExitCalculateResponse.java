package com.parkflow.modules.parking.operation.dto;

import java.math.BigDecimal;
import java.util.List;

public record BulkExitCalculateResponse(
    BigDecimal totalSubtotal,
    BigDecimal totalSurcharge,
    BigDecimal totalDiscount,
    BigDecimal finalTotal,
    int totalVehicles,
    List<VehicleCalculationItem> items,
    List<String> errors
) {
    public record VehicleCalculationItem(
        String locator,
        String plate,
        String ticketNumber,
        BigDecimal subtotal,
        BigDecimal discount,
        BigDecimal total,
        String errorMessage
    ) {}
}
