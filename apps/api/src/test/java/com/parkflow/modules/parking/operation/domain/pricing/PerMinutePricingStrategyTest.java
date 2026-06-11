package com.parkflow.modules.parking.operation.domain.pricing;

import static org.assertj.core.api.Assertions.assertThat;

import com.parkflow.modules.parking.operation.domain.Rate;
import com.parkflow.modules.parking.operation.domain.RateType;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

class PerMinutePricingStrategyTest {

  private final PerMinutePricingStrategy strategy = new PerMinutePricingStrategy();

  private Rate baseRate(BigDecimal amount) {
    Rate r = new Rate();
    r.setRateType(RateType.PER_MINUTE);
    r.setAmount(amount);
    r.setLostTicketSurcharge(BigDecimal.valueOf(3000));
    return r;
  }

  @Test
  void per_minute_calculation_matches_minutes() {
    Rate r = baseRate(BigDecimal.valueOf(50));
    var breakdown = strategy.calculate(r, 45, false);

    assertThat(breakdown.units()).isEqualTo(45);
    assertThat(breakdown.subtotal()).isEqualByComparingTo(BigDecimal.valueOf(2250));
    assertThat(breakdown.total()).isEqualByComparingTo(BigDecimal.valueOf(2250));
  }

  @Test
  void lost_ticket_surcharge_applies() {
    Rate r = baseRate(BigDecimal.valueOf(50));
    var breakdown = strategy.calculate(r, 10, true);

    assertThat(breakdown.units()).isEqualTo(10);
    assertThat(breakdown.surcharge()).isEqualByComparingTo(BigDecimal.valueOf(3000));
    assertThat(breakdown.total()).isEqualByComparingTo(BigDecimal.valueOf(3000 + 500));
  }
}
