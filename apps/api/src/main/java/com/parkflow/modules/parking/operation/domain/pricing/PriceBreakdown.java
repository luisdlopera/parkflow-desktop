package com.parkflow.modules.parking.operation.domain.pricing;

import java.math.BigDecimal;

public record PriceBreakdown(
    int units,
    BigDecimal subtotal,
    BigDecimal surcharge,
    BigDecimal discount,
    int deductedMinutes,
    BigDecimal total) {}
