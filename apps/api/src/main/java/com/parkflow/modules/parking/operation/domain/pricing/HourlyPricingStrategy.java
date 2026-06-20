package com.parkflow.modules.parking.operation.domain.pricing;

import com.parkflow.modules.parking.operation.domain.Rate;
import com.parkflow.modules.parking.operation.domain.RateType;
import com.parkflow.modules.configuration.domain.RoundingMode;
import java.math.BigDecimal;
import org.springframework.stereotype.Component;

@Component
public class HourlyPricingStrategy implements PricingStrategy {

  @Override
  public boolean supports(RateType rateType) {
    return rateType == RateType.HOURLY;
  }

  @Override
  public PriceBreakdown calculate(Rate rate, long billableMinutes, boolean lostTicket) {
    if (billableMinutes <= 0) {
      BigDecimal surcharge = lostTicket ? rate.getLostTicketSurcharge() : BigDecimal.ZERO;
      return new PriceBreakdown(0, BigDecimal.ZERO, surcharge, BigDecimal.ZERO, 0, surcharge);
    }

    int units = 0;
    BigDecimal subtotal = BigDecimal.ZERO;

    if (rate.getBaseMinutes() > 0) {
      subtotal = rate.getBaseValue() != null ? rate.getBaseValue() : BigDecimal.ZERO;
      units = 1;
      
      long remainingMinutes = Math.max(0, billableMinutes - rate.getBaseMinutes());
      if (remainingMinutes > 0) {
        int addFraction = Math.max(1, rate.getAdditionalMinutes() > 0 ? rate.getAdditionalMinutes() : rate.getFractionMinutes());
        
        long adjustedRemaining = remainingMinutes;
        if (adjustedRemaining % addFraction <= rate.getToleranceMinutes() && adjustedRemaining % addFraction > 0) {
           adjustedRemaining -= (adjustedRemaining % addFraction);
        }
        
        if (adjustedRemaining > 0) {
          BigDecimal addBase =
              BigDecimal.valueOf(adjustedRemaining)
                  .divide(
                      BigDecimal.valueOf(addFraction),
                      8,
                      java.math.RoundingMode.HALF_UP);
                      
          int addUnits = Math.max(1, applyRounding(addBase, rate.getRoundingMode()));
          units += addUnits;
          
          BigDecimal addVal = (rate.getAdditionalValue() != null && rate.getAdditionalValue().compareTo(BigDecimal.ZERO) > 0) 
              ? rate.getAdditionalValue() : rate.getAmount();
          subtotal = subtotal.add(addVal.multiply(BigDecimal.valueOf(addUnits)));
        }
      }
    } else {
      long adjustedMinutes = billableMinutes;
      int fraction = Math.max(1, rate.getFractionMinutes());
      if (adjustedMinutes % fraction <= rate.getToleranceMinutes() && adjustedMinutes % fraction > 0) {
         adjustedMinutes -= (adjustedMinutes % fraction);
      }
      
      if (adjustedMinutes > 0) {
        BigDecimal base =
            BigDecimal.valueOf(adjustedMinutes)
                .divide(
                    BigDecimal.valueOf(fraction),
                    8,
                    java.math.RoundingMode.HALF_UP);
    
        units = Math.max(1, applyRounding(base, rate.getRoundingMode()));
        subtotal = rate.getAmount().multiply(BigDecimal.valueOf(units));
      }
    }

    if (rate.getMaxDailyValue() != null && rate.getMaxDailyValue().compareTo(BigDecimal.ZERO) > 0) {
        long completeDays = billableMinutes / (24L * 60L);
        long remainingMinutes = billableMinutes % (24L * 60L);
        BigDecimal dailyMax = rate.getMaxDailyValue();
        BigDecimal costPerFullDay = rate.getAmount().multiply(BigDecimal.valueOf(24L * 60L)).min(dailyMax);
        BigDecimal costForRemaining = rate.getAmount().multiply(BigDecimal.valueOf(remainingMinutes)).min(dailyMax);
        BigDecimal cappedSubtotal = costPerFullDay.multiply(BigDecimal.valueOf(completeDays)).add(costForRemaining);
        subtotal = subtotal.min(cappedSubtotal);
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

  private int applyRounding(BigDecimal value, RoundingMode mode) {
    if (mode == RoundingMode.DOWN) {
      return value.setScale(0, java.math.RoundingMode.DOWN).intValue();
    }
    if (mode == RoundingMode.NEAREST) {
      return value.setScale(0, java.math.RoundingMode.HALF_UP).intValue();
    }
    return value.setScale(0, java.math.RoundingMode.UP).intValue();
  }
}
