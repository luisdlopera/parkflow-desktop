package com.parkflow.modules.pricing.dto;

import java.math.BigDecimal;
import java.util.List;

public record PricingSimulationResponse(
    long stayMinutes,
    long billableMinutes,
    int chargedUnits,
    BigDecimal subtotal,
    BigDecimal total,
    String currency,
    String strategyLabel,
    List<PricingExecutionStepDto> executionSteps,
    List<String> appliedRules,
    List<String> skippedRules,
    String reason) {}
