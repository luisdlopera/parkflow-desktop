package com.parkflow.modules.parking.operation.domain.pricing;

import com.parkflow.modules.parking.operation.domain.Rate;
import com.parkflow.modules.parking.operation.domain.RateType;
import java.math.BigDecimal;
import org.springframework.stereotype.Component;

@Component
public class PerMinutePricingStrategy implements PricingStrategy {

  @Override
  public boolean supports(RateType rateType) {
    return rateType == RateType.PER_MINUTE;
  }

  @Override
  public PriceBreakdown calculate(Rate rate, long billableMinutes, boolean lostTicket) {
    if (billableMinutes <= 0) {
      BigDecimal surcharge = lostTicket ? rate.getLostTicketSurcharge() : BigDecimal.ZERO;
      return new PriceBreakdown(0, BigDecimal.ZERO, surcharge, BigDecimal.ZERO, 0, surcharge);
    }

    int units = (int) billableMinutes;
    BigDecimal subtotal = rate.getAmount().multiply(BigDecimal.valueOf(units));
    
    if (rate.getMaxDailyValue() != null && rate.getMaxDailyValue().compareTo(BigDecimal.ZERO) > 0) {
        // Cap each 24-hour block independently: complete days get the daily cap applied,
        // remaining minutes are billed at per-minute rate (also capped at daily max if exceeded).
        long completeDays = billableMinutes / (24L * 60L);
        long remainingMinutes = billableMinutes % (24L * 60L);
        BigDecimal ratePerMinute = rate.getAmount();
        BigDecimal dailyMax = rate.getMaxDailyValue();
        BigDecimal costPerFullDay = ratePerMinute.multiply(BigDecimal.valueOf(24L * 60L)).min(dailyMax);
        BigDecimal costForRemaining = ratePerMinute.multiply(BigDecimal.valueOf(remainingMinutes)).min(dailyMax);
        subtotal = costPerFullDay.multiply(BigDecimal.valueOf(completeDays)).add(costForRemaining);
    }
    
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
