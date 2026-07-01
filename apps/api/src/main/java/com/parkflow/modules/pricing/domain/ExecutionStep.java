package com.parkflow.modules.pricing.domain;

import java.math.BigDecimal;

public record ExecutionStep(
    String stepId,
    String ruleApplied,
    BigDecimal amountAffected,
    String description
) {}
