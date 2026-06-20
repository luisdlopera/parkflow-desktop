package com.parkflow.modules.parking.operation.domain.pricing;

import com.parkflow.modules.parking.operation.domain.Rate;
import com.parkflow.modules.parking.operation.domain.RateType;
import java.math.BigDecimal;
import org.springframework.stereotype.Component;

@Component
public class DailyPricingStrategy implements PricingStrategy {

  @Override
  public boolean supports(RateType rateType) {
    return rateType == RateType.DAILY;
  }

  @Override
  public PriceBreakdown calculate(Rate rate, long billableMinutes, boolean lostTicket) {
    if (billableMinutes <= 0) {
      BigDecimal surcharge = lostTicket ? rate.getLostTicketSurcharge() : BigDecimal.ZERO;
      return new PriceBreakdown(0, BigDecimal.ZERO, surcharge, BigDecimal.ZERO, 0, surcharge);
    }
    
    long adjustedMinutes = billableMinutes;
    int fraction = 60 * 24;
    if (adjustedMinutes % fraction <= rate.getToleranceMinutes() && adjustedMinutes % fraction > 0) {
       adjustedMinutes -= (adjustedMinutes % fraction);
    }
    
    if (adjustedMinutes <= 0) {
      BigDecimal surcharge = lostTicket ? rate.getLostTicketSurcharge() : BigDecimal.ZERO;
      return new PriceBreakdown(0, BigDecimal.ZERO, surcharge, BigDecimal.ZERO, 0, surcharge);
    }

    BigDecimal minutesInDay = BigDecimal.valueOf(fraction);
    int units =
        BigDecimal.valueOf(adjustedMinutes)
            .divide(minutesInDay, 0, java.math.RoundingMode.CEILING)
            .max(BigDecimal.ONE)
            .intValue();

    BigDecimal subtotal = rate.getAmount().multiply(BigDecimal.valueOf(units));
    
    if (rate.getMaxSessionValue() != null && rate.getMaxSessionValue().compareTo(BigDecimal.ZERO) > 0) {
        subtotal = subtotal.min(rate.getMaxSessionValue());
    }

    if (rate.getMinSessionValue() != null && rate.getMinSessionValue().compareTo(BigDecimal.ZERO) > 0) {
        subtotal = subtotal.max(rate.getMinSessionValue());
    }

    BigDecimal surcharge = lostTicket ? rate.getLostTicketSurcharge() : BigDecimal.ZERO;
    BigDecimal total = subtotal.add(surcharge);

    return new PriceBreakdown(units, subtotal, surcharge, BigDecimal.ZERO, 0, total);
  }
}
