package com.parkflow.modules.parking.operation.domain.pricing;

import com.parkflow.modules.parking.operation.domain.Rate;
import com.parkflow.modules.parking.operation.domain.RateType;

public interface PricingStrategy {
  boolean supports(RateType rateType);

  PriceBreakdown calculate(Rate rate, long billableMinutes, boolean lostTicket);
}
