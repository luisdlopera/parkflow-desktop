package com.parkflow.modules.parking.operation.domain.pricing;

import static org.assertj.core.api.Assertions.assertThat;

import com.parkflow.modules.parking.operation.domain.Rate;
import com.parkflow.modules.parking.operation.domain.RateType;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;

class PricingCalculatorTest {

  @Test
  void selects_hourly_strategy_for_hourly_rate() {
    PricingCalculator calculator = new PricingCalculator(List.of(new HourlyPricingStrategy(), new PerMinutePricingStrategy(), new DailyPricingStrategy()));
    Rate r = new Rate();
    r.setRateType(RateType.HOURLY);
    r.setAmount(BigDecimal.valueOf(2000));
    r.setFractionMinutes(60);
    var breakdown = calculator.calculate(r, 90, false);
    assertThat(breakdown.units()).isGreaterThan(0);
  }

  @Test
  void selects_per_minute_for_per_minute_rate() {
    PricingCalculator calculator = new PricingCalculator(List.of(new HourlyPricingStrategy(), new PerMinutePricingStrategy(), new DailyPricingStrategy()));
    Rate r = new Rate();
    r.setRateType(RateType.PER_MINUTE);
    r.setAmount(BigDecimal.valueOf(10));
    var breakdown = calculator.calculate(r, 10, false);
    assertThat(breakdown.units()).isEqualTo(10);
  }
}
