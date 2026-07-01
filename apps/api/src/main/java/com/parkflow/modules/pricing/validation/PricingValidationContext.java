package com.parkflow.modules.pricing.validation;

import java.math.BigDecimal;

public record PricingValidationContext(
    String strategy,           // billingModel
    boolean isNightEnabled,    // hasNightRate
    String nightStartTime,
    String nightEndTime,
    BigDecimal nightPrice,
    BigDecimal basePrice
) {}
