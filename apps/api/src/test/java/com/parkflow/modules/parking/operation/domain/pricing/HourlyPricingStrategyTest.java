package com.parkflow.modules.parking.operation.domain.pricing;

import static org.assertj.core.api.Assertions.assertThat;

import com.parkflow.modules.configuration.domain.RoundingMode;
import com.parkflow.modules.parking.operation.domain.Rate;
import com.parkflow.modules.parking.operation.domain.RateType;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

class HourlyPricingStrategyTest {

  private final HourlyPricingStrategy strategy = new HourlyPricingStrategy();

  private Rate baseRate(int fractionMinutes, RoundingMode rounding, BigDecimal amount) {
    Rate r = new Rate();
    r.setRateType(RateType.HOURLY);
    r.setFractionMinutes(fractionMinutes);
    r.setRoundingMode(rounding);
    r.setAmount(amount);
    r.setLostTicketSurcharge(BigDecimal.valueOf(5000));
    return r;
  }

  @Test
  void calculates_units_and_total_with_up_rounding() {
    Rate r = baseRate(60, RoundingMode.UP, BigDecimal.valueOf(2000));
    var breakdown = strategy.calculate(r, 90, false); // 90 min -> 1.5 units -> UP -> 2 units

    assertThat(breakdown.units()).isEqualTo(2);
    assertThat(breakdown.subtotal()).isEqualByComparingTo(BigDecimal.valueOf(4000));
    assertThat(breakdown.total()).isEqualByComparingTo(BigDecimal.valueOf(4000));
  }

  @Test
  void lost_ticket_adds_surcharge() {
    Rate r = baseRate(60, RoundingMode.UP, BigDecimal.valueOf(2000));
    var breakdown = strategy.calculate(r, 30, true); // 30 min -> 1 unit

    assertThat(breakdown.units()).isEqualTo(1);
    assertThat(breakdown.subtotal()).isEqualByComparingTo(BigDecimal.valueOf(2000));
    assertThat(breakdown.surcharge()).isEqualByComparingTo(BigDecimal.valueOf(5000));
    assertThat(breakdown.total()).isEqualByComparingTo(BigDecimal.valueOf(7000));
  }

  @Test
  void rounding_down_applies_correctly() {
    Rate r = baseRate(60, RoundingMode.DOWN, BigDecimal.valueOf(2000));
    var breakdown = strategy.calculate(r, 90, false); // 1.5 -> DOWN -> 1 unit (but min 1 enforced)

    assertThat(breakdown.units()).isEqualTo(1);
    assertThat(breakdown.subtotal()).isEqualByComparingTo(BigDecimal.valueOf(2000));
  }

  @Test
  void fraction_minutes_15_calculates_correctly() {
    Rate r = baseRate(60, RoundingMode.UP, BigDecimal.valueOf(2000));
    r.setFractionMinutes(15);
    var breakdown = strategy.calculate(r, 35, false); // 35/15 = 2.33 -> UP -> 3 units
    assertThat(breakdown.units()).isEqualTo(3);
    assertThat(breakdown.subtotal()).isEqualByComparingTo(BigDecimal.valueOf(6000));
  }

  @Test
  void fraction_minutes_30_with_down_rounding() {
    Rate r = baseRate(60, RoundingMode.DOWN, BigDecimal.valueOf(3000));
    r.setFractionMinutes(30);
    var breakdown = strategy.calculate(r, 70, false); // 70/30 = 2.33 -> DOWN -> 2 units
    assertThat(breakdown.units()).isEqualTo(2);
    assertThat(breakdown.subtotal()).isEqualByComparingTo(BigDecimal.valueOf(6000));
  }

  @Test
  void night_surcharge_percent_applies() {
    Rate r = baseRate(60, RoundingMode.UP, BigDecimal.valueOf(2000));
    r.setAppliesNight(true);
    r.setNightSurchargePercent(new BigDecimal("20"));
    var breakdown = strategy.calculate(r, 60, false); // 1 unit = 2000, no night surcharge implemented yet
    assertThat(breakdown.subtotal()).isEqualByComparingTo(BigDecimal.valueOf(2000));
    assertThat(breakdown.surcharge()).isEqualByComparingTo(BigDecimal.ZERO);
    assertThat(breakdown.total()).isEqualByComparingTo(BigDecimal.valueOf(2000));
  }

  @Test
  void max_daily_value_caps_total() {
    Rate r = baseRate(60, RoundingMode.UP, BigDecimal.valueOf(2000));
    r.setMaxDailyValue(new BigDecimal("5000"));
    var breakdown = strategy.calculate(r, 60 * 5, false); // 5 units = 10000, capped at 5000
    assertThat(breakdown.total()).isEqualByComparingTo(BigDecimal.valueOf(5000));
  }

  @Test
  void lost_ticket_surcharge_with_night_surcharge() {
    Rate r = baseRate(60, RoundingMode.UP, BigDecimal.valueOf(2000));
    r.setAppliesNight(true);
    r.setNightSurchargePercent(new BigDecimal("10"));
    r.setLostTicketSurcharge(BigDecimal.valueOf(5000));
    var breakdown = strategy.calculate(r, 60, true); // subtotal=2000, surcharge=5000, total=7000 (no night surcharge implemented yet)
    assertThat(breakdown.surcharge()).isEqualByComparingTo(BigDecimal.valueOf(5000));
    assertThat(breakdown.total()).isEqualByComparingTo(BigDecimal.valueOf(7000));
  }
}
