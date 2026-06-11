package com.parkflow.modules.parking.operation.application.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.OffsetDateTime;
import org.junit.jupiter.api.Test;

class DurationCalculatorTest {

  @Test
  void calculates_total_and_billable_minutes_with_grace() {
    OffsetDateTime entry = OffsetDateTime.now().minusMinutes(90);
    OffsetDateTime exit = OffsetDateTime.now();

    var breakdown = DurationCalculator.calculate(entry, exit, 30);

    assertThat(breakdown.totalMinutes()).isEqualTo(90);
    assertThat(breakdown.billableMinutes()).isEqualTo(60); // 90 - 30
  }

  @Test
  void zero_when_exit_before_entry() {
    OffsetDateTime entry = OffsetDateTime.now();
    OffsetDateTime exit = entry.minusMinutes(10);

    var breakdown = DurationCalculator.calculate(entry, exit, 0);

    assertThat(breakdown.totalMinutes()).isEqualTo(0);
    assertThat(breakdown.billableMinutes()).isEqualTo(0);
  }
}
