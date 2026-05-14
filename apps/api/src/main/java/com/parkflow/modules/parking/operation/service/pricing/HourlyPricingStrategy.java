package com.parkflow.modules.parking.operation.service.pricing;

import com.parkflow.modules.parking.operation.domain.Rate;
import com.parkflow.modules.parking.operation.domain.RateType;
import com.parkflow.modules.parking.operation.domain.RoundingMode;
import com.parkflow.modules.parking.operation.service.PricingCalculator.PriceBreakdown;
import org.springframework.stereotype.Component;
import java.math.BigDecimal;

@Component
public class HourlyPricingStrategy implements PricingStrategy {
    
    @Override
    public boolean supports(RateType rateType) {
        return rateType == RateType.HOURLY;
    }

    @Override
    public PriceBreakdown calculate(Rate rate, long billableMinutes, boolean lostTicket) {
        BigDecimal base = BigDecimal.valueOf(billableMinutes)
            .divide(
                BigDecimal.valueOf(Math.max(1, rate.getFractionMinutes())),
                8,
                java.math.RoundingMode.HALF_UP);
        
        int units = Math.max(1, applyRounding(base, rate.getRoundingMode()));
        
        BigDecimal subtotal = rate.getAmount().multiply(BigDecimal.valueOf(units));
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
