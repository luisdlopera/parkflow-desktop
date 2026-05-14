package com.parkflow.modules.parking.operation.service;

import com.parkflow.modules.parking.operation.domain.Rate;
import com.parkflow.modules.parking.operation.domain.RateType;
import com.parkflow.modules.parking.operation.service.pricing.PricingStrategy;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import com.parkflow.modules.parking.operation.exception.OperationException;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PricingCalculator {

  private final List<PricingStrategy> strategies;

  public PriceBreakdown calculate(Rate rate, long billableMinutes, boolean lostTicket) {
    RateType type = rate.getRateType();
    
    return strategies.stream()
        .filter(s -> s.supports(type))
        .findFirst()
        .map(s -> s.calculate(rate, billableMinutes, lostTicket))
        .orElseThrow(() -> new OperationException(
            HttpStatus.INTERNAL_SERVER_ERROR, 
            "No pricing strategy found for rate type: " + type));
  }

  public record PriceBreakdown(int units, BigDecimal subtotal, BigDecimal surcharge, BigDecimal discount, int deductedMinutes, BigDecimal total) {}
}

