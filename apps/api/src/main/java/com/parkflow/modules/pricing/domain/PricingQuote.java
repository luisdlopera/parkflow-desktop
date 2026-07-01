package com.parkflow.modules.pricing.domain;

import com.parkflow.modules.parking.operation.domain.pricing.PriceBreakdown;
import java.util.List;

public record PricingQuote(
    PriceBreakdown breakdown,
    List<ExecutionStep> trace
) {}
