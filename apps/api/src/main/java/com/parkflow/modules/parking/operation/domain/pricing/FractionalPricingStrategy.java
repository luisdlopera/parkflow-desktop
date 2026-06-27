package com.parkflow.modules.parking.operation.domain.pricing;

import com.parkflow.modules.configuration.domain.RateFraction;
import com.parkflow.modules.parking.operation.domain.Rate;
import com.parkflow.modules.parking.operation.domain.RateType;
import java.math.BigDecimal;
import java.util.Comparator;
import java.util.List;
import org.springframework.stereotype.Component;

/**
 * Stepped pricing: cost is determined by the RateFraction tier in which the stay falls.
 *
 * Each fraction defines a [fromMinute, toMinute] range and a flat value for that block.
 * The billable minutes are matched against the tiers in order; the first tier whose
 * toMinute >= billableMinutes wins. If no tier covers the duration, the last tier's value
 * is used (open-ended cap behaviour).
 *
 * Example configuration:
 *   0–30 min  → $1,000
 *   31–60 min → $2,000
 *   61–120 min → $3,000
 * A 45-minute stay falls in the 31–60 tier → $2,000.
 */
@Component
public class FractionalPricingStrategy implements PricingStrategy {

  @Override
  public boolean supports(RateType rateType) {
    return rateType == RateType.FRACTIONAL;
  }

  @Override
  public PriceBreakdown calculate(Rate rate, long billableMinutes, boolean lostTicket) {
    BigDecimal surcharge = lostTicket ? rate.getLostTicketSurcharge() : BigDecimal.ZERO;

    if (billableMinutes <= 0) {
      return new PriceBreakdown(0, BigDecimal.ZERO, surcharge, BigDecimal.ZERO, 0, surcharge);
    }

    List<RateFraction> fractions = rate.getFractions();
    if (fractions == null || fractions.isEmpty()) {
      // Fallback to per-minute with rate.amount when no fractions configured
      BigDecimal subtotal = rate.getAmount().multiply(BigDecimal.valueOf(billableMinutes));
      BigDecimal total = subtotal.add(surcharge);
      return new PriceBreakdown((int) billableMinutes, subtotal, surcharge, BigDecimal.ZERO, 0, total);
    }

    List<RateFraction> active = fractions.stream()
        .filter(com.parkflow.modules.configuration.domain.RateFraction::isActive)
        .sorted(Comparator.comparingInt(RateFraction::getFromMinute))
        .toList();

    BigDecimal subtotal = resolveSteppedCost(active, billableMinutes);

    if (rate.getMaxSessionValue() != null && rate.getMaxSessionValue().compareTo(BigDecimal.ZERO) > 0) {
      subtotal = subtotal.min(rate.getMaxSessionValue());
    }
    if (rate.getMinSessionValue() != null && rate.getMinSessionValue().compareTo(BigDecimal.ZERO) > 0) {
      subtotal = subtotal.max(rate.getMinSessionValue());
    }

    BigDecimal total = subtotal.add(surcharge);
    return new PriceBreakdown((int) billableMinutes, subtotal, surcharge, BigDecimal.ZERO, 0, total);
  }

  private BigDecimal resolveSteppedCost(List<RateFraction> fractions, long billableMinutes) {
    for (RateFraction fraction : fractions) {
      if (billableMinutes >= fraction.getFromMinute() && billableMinutes <= fraction.getToMinute()) {
        return fraction.getValue();
      }
    }
    // Beyond the last tier — use the last tier's value
    if (!fractions.isEmpty()) {
      return fractions.get(fractions.size() - 1).getValue();
    }
    return BigDecimal.ZERO;
  }
}
