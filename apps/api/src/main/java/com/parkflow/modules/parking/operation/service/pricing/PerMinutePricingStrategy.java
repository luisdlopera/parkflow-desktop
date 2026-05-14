package com.parkflow.modules.parking.operation.service.pricing;

import com.parkflow.modules.parking.operation.domain.Rate;
import com.parkflow.modules.parking.operation.domain.RateType;
import com.parkflow.modules.parking.operation.service.PricingCalculator.PriceBreakdown;
import org.springframework.stereotype.Component;
import java.math.BigDecimal;

@Component
public class PerMinutePricingStrategy implements PricingStrategy {
    
    @Override
    public boolean supports(RateType rateType) {
        return rateType == RateType.PER_MINUTE;
    }

    @Override
    public PriceBreakdown calculate(Rate rate, long billableMinutes, boolean lostTicket) {
        int units = (int) billableMinutes;
        BigDecimal subtotal = rate.getAmount().multiply(BigDecimal.valueOf(units));
        BigDecimal surcharge = lostTicket ? rate.getLostTicketSurcharge() : BigDecimal.ZERO;
        BigDecimal total = subtotal.add(surcharge);
        
        return new PriceBreakdown(units, subtotal, surcharge, BigDecimal.ZERO, 0, total);
    }
}
