package com.parkflow.modules.parking.operation.domain.pricing;

import com.parkflow.modules.parking.operation.domain.Rate;
import com.parkflow.modules.parking.operation.domain.RateType;
import com.parkflow.modules.parking.operation.exception.OperationException;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class PricingCalculator {

  private final List<PricingStrategy> strategies;

  public PriceBreakdown calculate(Rate rate, long billableMinutes, boolean lostTicket) {
    RateType type = rate.getRateType();

    return strategies.stream()
        .filter(strategy -> strategy.supports(type))
        .findFirst()
        .map(strategy -> strategy.calculate(rate, billableMinutes, lostTicket))
        .orElseThrow(
            () ->
                new OperationException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "No pricing strategy found for rate type: " + type));
  }
}
