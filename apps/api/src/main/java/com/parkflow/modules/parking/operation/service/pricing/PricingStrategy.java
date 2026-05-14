package com.parkflow.modules.parking.operation.service.pricing;

import com.parkflow.modules.parking.operation.domain.Rate;
import com.parkflow.modules.parking.operation.domain.RateType;
import com.parkflow.modules.parking.operation.service.PricingCalculator.PriceBreakdown;

public interface PricingStrategy {
    boolean supports(RateType rateType);
    PriceBreakdown calculate(Rate rate, long billableMinutes, boolean lostTicket);
}
