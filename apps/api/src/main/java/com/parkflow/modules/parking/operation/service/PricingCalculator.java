package com.parkflow.modules.parking.operation.service;

import com.parkflow.modules.parking.operation.domain.Rate;
import com.parkflow.modules.parking.operation.domain.RateType;
import com.parkflow.modules.parking.operation.domain.RoundingMode;
import java.math.BigDecimal;

public final class PricingCalculator {
  private PricingCalculator() {}

  public static PriceBreakdown calculate(Rate rate, long billableMinutes, boolean lostTicket) {
    int units = 1;

    if (rate.getRateType() == RateType.HOURLY) {
      BigDecimal base = BigDecimal.valueOf(billableMinutes)
          .divide(
            BigDecimal.valueOf(Math.max(1, rate.getFractionMinutes())),
            8,
            java.math.RoundingMode.HALF_UP);
      units = Math.max(1, applyRounding(base, rate.getRoundingMode()));
    }

    if (rate.getRateType() == RateType.DAILY) {
      units = (int) Math.max(1, Math.ceil((double) billableMinutes / (60d * 24d)));
    }

    BigDecimal subtotal = rate.getAmount().multiply(BigDecimal.valueOf(units));
    BigDecimal surcharge = lostTicket ? rate.getLostTicketSurcharge() : BigDecimal.ZERO;
    BigDecimal total = subtotal.add(surcharge);
    return new PriceBreakdown(units, subtotal, surcharge, total);
  }

  private static int applyRounding(BigDecimal value, RoundingMode mode) {
    if (mode == RoundingMode.DOWN) {
      return value.setScale(0, java.math.RoundingMode.DOWN).intValue();
    }

    if (mode == RoundingMode.NEAREST) {
      return value.setScale(0, java.math.RoundingMode.HALF_UP).intValue();
    }

    return value.setScale(0, java.math.RoundingMode.UP).intValue();
  }

  public record PriceBreakdown(int units, BigDecimal subtotal, BigDecimal surcharge, BigDecimal total) {}
}
