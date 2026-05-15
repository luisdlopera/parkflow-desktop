package com.parkflow.modules.parking.operation.application.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.parkflow.modules.parking.operation.domain.Rate;
import com.parkflow.modules.parking.operation.domain.RateType;
import com.parkflow.modules.parking.operation.domain.RoundingMode;
import java.math.BigDecimal;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import org.junit.jupiter.api.Test;

class RateApplicabilityTest {

  private static final ZoneId Z = ZoneId.of("America/Bogota");

  @Test
  void inactiveNeverApplies() {
    Rate r = baseRate();
    r.setActive(false);
    assertThat(RateApplicability.isApplicable(r, OffsetDateTime.parse("2026-04-24T10:00:00-05:00"), Z))
        .isFalse();
  }

  @Test
  void rejectsOutsideScheduledWindow() {
    Rate r = baseRate();
    r.setScheduledActiveFrom(OffsetDateTime.parse("2026-05-01T00:00:00Z"));
    r.setScheduledActiveTo(OffsetDateTime.parse("2026-05-31T23:59:59Z"));
    assertThat(RateApplicability.isApplicable(r, OffsetDateTime.parse("2026-04-24T10:00:00-05:00"), Z))
        .isFalse();
  }

  @Test
  void acceptsInsideScheduledWindow() {
    Rate r = baseRate();
    r.setScheduledActiveFrom(OffsetDateTime.parse("2026-04-01T00:00:00Z"));
    r.setScheduledActiveTo(OffsetDateTime.parse("2026-12-31T23:59:59Z"));
    assertThat(RateApplicability.isApplicable(r, OffsetDateTime.parse("2026-04-24T10:00:00-05:00"), Z))
        .isTrue();
  }

  @Test
  void rejectsOutsideDailyWindow() {
    Rate r = baseRate();
    r.setWindowStart(LocalTime.of(8, 0));
    r.setWindowEnd(LocalTime.of(12, 0));
    assertThat(RateApplicability.isApplicable(r, OffsetDateTime.parse("2026-04-24T14:00:00-05:00"), Z))
        .isFalse();
  }

  @Test
  void acceptsInsideDailyWindow() {
    Rate r = baseRate();
    r.setWindowStart(LocalTime.of(8, 0));
    r.setWindowEnd(LocalTime.of(18, 0));
    assertThat(RateApplicability.isApplicable(r, OffsetDateTime.parse("2026-04-24T10:00:00-05:00"), Z))
        .isTrue();
  }

  private static Rate baseRate() {
    Rate r = new Rate();
    r.setActive(true);
    r.setName("T");
    r.setSite("DEFAULT");
    r.setRateType(RateType.HOURLY);
    r.setVehicleType("CAR");
    r.setAmount(new BigDecimal("1000.00"));
    r.setRoundingMode(RoundingMode.UP);
    return r;
  }
}

