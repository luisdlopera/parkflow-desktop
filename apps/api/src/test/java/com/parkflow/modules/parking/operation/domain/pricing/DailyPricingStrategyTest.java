package com.parkflow.modules.parking.operation.domain.pricing;

import static org.assertj.core.api.Assertions.assertThat;

import com.parkflow.modules.parking.operation.domain.Rate;
import com.parkflow.modules.parking.operation.domain.RateType;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

class DailyPricingStrategyTest {

  private final DailyPricingStrategy strategy = new DailyPricingStrategy();

  private Rate baseRate(BigDecimal amount) {
    Rate r = new Rate();
    r.setRateType(RateType.DAILY);
    r.setAmount(amount);
    r.setLostTicketSurcharge(BigDecimal.valueOf(10000));
    return r;
  }

  @Test
  void one_day_or_less_counts_as_one_unit() {
    Rate r = baseRate(BigDecimal.valueOf(20000));
    var breakdown = strategy.calculate(r, 60 * 12, false); // 12 hours
    assertThat(breakdown.units()).isEqualTo(1);
    assertThat(breakdown.total()).isEqualByComparingTo(BigDecimal.valueOf(20000));
  }

  @Test
  void multiple_days_rounds_up() {
    Rate r = baseRate(BigDecimal.valueOf(20000));
    var breakdown = strategy.calculate(r, 60 * 25, false); // 25 hours -> 2 days
    assertThat(breakdown.units()).isEqualTo(2);
    assertThat(breakdown.total()).isEqualByComparingTo(BigDecimal.valueOf(40000));
  }
}
