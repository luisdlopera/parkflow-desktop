package com.parkflow.modules.parking.operation.domain.pricing;

import java.math.BigDecimal;

public record PriceBreakdown(
    int units,
    BigDecimal subtotal,
    BigDecimal surcharge,
    BigDecimal discount,
    int deductedMinutes,
    BigDecimal total,
    BigDecimal taxPercentage,
    BigDecimal taxAmount,
    BigDecimal netAmount) {

    public PriceBreakdown(int units, BigDecimal subtotal, BigDecimal surcharge, BigDecimal discount, int deductedMinutes, BigDecimal total) {
        this(units, subtotal, surcharge, discount, deductedMinutes, total, BigDecimal.ZERO, BigDecimal.ZERO, total);
    }
}
