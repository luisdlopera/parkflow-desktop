package com.parkflow.modules.parking.operation.domain.pricing;

import static org.assertj.core.api.Assertions.assertThat;

import com.parkflow.modules.configuration.domain.RateFraction;
import com.parkflow.modules.parking.operation.domain.Rate;
import com.parkflow.modules.parking.operation.domain.RateType;
import java.math.BigDecimal;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class FractionalPricingStrategyTest {

  private FractionalPricingStrategy strategy;

  @BeforeEach
  void setUp() {
    strategy = new FractionalPricingStrategy();
  }

  @Test
  void supports_Fractional() {
    assertThat(strategy.supports(RateType.FRACTIONAL)).isTrue();
    assertThat(strategy.supports(RateType.HOURLY)).isFalse();
  }

  @Test
  void calculate_ZeroMinutes_ReturnsZero() {
    Rate rate = buildRate(null, null, null);
    PriceBreakdown result = strategy.calculate(rate, 0, false);
    assertThat(result.total()).isEqualByComparingTo(BigDecimal.ZERO);
  }

  @Test
  void calculate_WithLostTicket_ZeroMinutes() {
    Rate rate = buildRate(null, null, null);
    rate.setLostTicketSurcharge(new BigDecimal("5000"));
    PriceBreakdown result = strategy.calculate(rate, 0, true);
    assertThat(result.total()).isEqualByComparingTo(new BigDecimal("5000"));
  }

  @Test
  void calculate_NoFractions_FallsBackToPerMinute() {
    Rate rate = buildRate(null, null, null);
    rate.setFractions(null);
    rate.setAmount(new BigDecimal("100"));
    PriceBreakdown result = strategy.calculate(rate, 30, false);
    assertThat(result.subtotal()).isEqualByComparingTo(new BigDecimal("3000")); // 30 * 100
  }

  @Test
  void calculate_EmptyFractions_FallsBackToPerMinute() {
    Rate rate = buildRate(null, null, null);
    rate.setFractions(List.of());
    rate.setAmount(new BigDecimal("50"));
    PriceBreakdown result = strategy.calculate(rate, 10, false);
    assertThat(result.subtotal()).isEqualByComparingTo(new BigDecimal("500")); // 10 * 50
  }

  @Test
  void calculate_FractionMatch_ReturnsCorrectTier() {
    RateFraction f1 = buildFraction(0, 30, new BigDecimal("1000"));
    RateFraction f2 = buildFraction(31, 60, new BigDecimal("2000"));
    RateFraction f3 = buildFraction(61, 120, new BigDecimal("3000"));

    Rate rate = buildRate(null, null, null);
    rate.setFractions(List.of(f1, f2, f3));

    // 45 minutes falls in tier 2 (31-60)
    PriceBreakdown result = strategy.calculate(rate, 45, false);
    assertThat(result.subtotal()).isEqualByComparingTo(new BigDecimal("2000"));
  }

  @Test
  void calculate_BeyondLastFraction_UsesLastTier() {
    RateFraction f1 = buildFraction(0, 30, new BigDecimal("1000"));
    RateFraction f2 = buildFraction(31, 60, new BigDecimal("2000"));

    Rate rate = buildRate(null, null, null);
    rate.setFractions(List.of(f1, f2));

    // 120 minutes beyond last tier (max 60)
    PriceBreakdown result = strategy.calculate(rate, 120, false);
    assertThat(result.subtotal()).isEqualByComparingTo(new BigDecimal("2000")); // last tier
  }

  @Test
  void calculate_AppliesMaxSessionValue() {
    RateFraction f1 = buildFraction(0, 120, new BigDecimal("10000"));
    Rate rate = buildRate(null, new BigDecimal("5000"), null);
    rate.setFractions(List.of(f1));

    PriceBreakdown result = strategy.calculate(rate, 60, false);
    assertThat(result.subtotal()).isEqualByComparingTo(new BigDecimal("5000")); // capped
  }

  @Test
  void calculate_AppliesMinSessionValue() {
    RateFraction f1 = buildFraction(0, 120, new BigDecimal("1000"));
    Rate rate = buildRate(new BigDecimal("2000"), null, null);
    rate.setFractions(List.of(f1));

    PriceBreakdown result = strategy.calculate(rate, 60, false);
    assertThat(result.subtotal()).isEqualByComparingTo(new BigDecimal("2000")); // raised to min
  }

  @Test
  void calculate_InactiveFractionsFiltered() {
    RateFraction active = buildFraction(0, 60, new BigDecimal("2000"));
    RateFraction inactive = buildFraction(0, 60, new BigDecimal("9000"));
    inactive.setActive(false);

    Rate rate = buildRate(null, null, null);
    rate.setFractions(List.of(active, inactive));

    PriceBreakdown result = strategy.calculate(rate, 30, false);
    assertThat(result.subtotal()).isEqualByComparingTo(new BigDecimal("2000")); // only active used
  }

  @Test
  void calculate_WithSurcharge() {
    RateFraction f1 = buildFraction(0, 60, new BigDecimal("2000"));
    Rate rate = buildRate(null, null, null);
    rate.setFractions(List.of(f1));
    rate.setLostTicketSurcharge(new BigDecimal("500"));

    PriceBreakdown result = strategy.calculate(rate, 30, true);
    assertThat(result.total()).isEqualByComparingTo(new BigDecimal("2500"));
  }

  // ---------- RateWindowResolver tests ----------

  @Test
  void window_NoWindowConfigured_AlwaysInWindow() {
    RateWindowResolver resolver = new RateWindowResolver();
    Rate rate = new Rate();
    rate.setWindowStart(null);
    rate.setWindowEnd(null);

    OffsetDateTime moment = OffsetDateTime.now(ZoneOffset.UTC);
    assertThat(resolver.isInWindow(rate, moment)).isTrue();
  }

  @Test
  void window_SameDayWindow_InsideRange() {
    RateWindowResolver resolver = new RateWindowResolver();
    Rate rate = new Rate();
    rate.setWindowStart(LocalTime.of(8, 0));
    rate.setWindowEnd(LocalTime.of(20, 0));

    OffsetDateTime moment = OffsetDateTime.of(2024, 1, 1, 12, 0, 0, 0, ZoneOffset.UTC);
    assertThat(resolver.isInWindow(rate, moment)).isTrue();
  }

  @Test
  void window_SameDayWindow_OutsideRange() {
    RateWindowResolver resolver = new RateWindowResolver();
    Rate rate = new Rate();
    rate.setWindowStart(LocalTime.of(8, 0));
    rate.setWindowEnd(LocalTime.of(20, 0));

    OffsetDateTime moment = OffsetDateTime.of(2024, 1, 1, 22, 0, 0, 0, ZoneOffset.UTC);
    assertThat(resolver.isInWindow(rate, moment)).isFalse();
  }

  @Test
  void window_OvernightWindow_InsideRange_AfterMidnight() {
    RateWindowResolver resolver = new RateWindowResolver();
    Rate rate = new Rate();
    rate.setWindowStart(LocalTime.of(22, 0));
    rate.setWindowEnd(LocalTime.of(6, 0));

    OffsetDateTime moment = OffsetDateTime.of(2024, 1, 1, 2, 0, 0, 0, ZoneOffset.UTC);
    assertThat(resolver.isInWindow(rate, moment)).isTrue();
  }

  @Test
  void window_OvernightWindow_OutsideRange() {
    RateWindowResolver resolver = new RateWindowResolver();
    Rate rate = new Rate();
    rate.setWindowStart(LocalTime.of(22, 0));
    rate.setWindowEnd(LocalTime.of(6, 0));

    OffsetDateTime moment = OffsetDateTime.of(2024, 1, 1, 12, 0, 0, 0, ZoneOffset.UTC);
    assertThat(resolver.isInWindow(rate, moment)).isFalse();
  }

  // Helpers

  private Rate buildRate(BigDecimal minSession, BigDecimal maxSession, BigDecimal lostTicket) {
    Rate rate = new Rate();
    rate.setRateType(RateType.FRACTIONAL);
    rate.setAmount(BigDecimal.TEN);
    rate.setMinSessionValue(minSession);
    rate.setMaxSessionValue(maxSession);
    rate.setLostTicketSurcharge(lostTicket != null ? lostTicket : BigDecimal.ZERO);
    return rate;
  }

  private RateFraction buildFraction(int from, int to, BigDecimal value) {
    RateFraction f = new RateFraction();
    f.setFromMinute(from);
    f.setToMinute(to);
    f.setValue(value);
    f.setActive(true);
    return f;
  }
}
