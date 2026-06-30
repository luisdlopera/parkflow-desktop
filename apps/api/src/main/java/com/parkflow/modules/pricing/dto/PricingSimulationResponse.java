package com.parkflow.modules.pricing.dto;

import java.math.BigDecimal;

public record PricingSimulationResponse(
    long stayMinutes,
    long billableMinutes,
    int chargedUnits,
    BigDecimal total,
    String currency) {}
