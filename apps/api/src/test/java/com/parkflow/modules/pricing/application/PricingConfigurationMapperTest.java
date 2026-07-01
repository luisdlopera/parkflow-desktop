package com.parkflow.modules.pricing.application;

import static org.assertj.core.api.Assertions.assertThat;

import com.parkflow.modules.parking.operation.domain.RateType;
import com.parkflow.modules.pricing.dto.*;
import java.math.BigDecimal;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("PricingConfigurationMapper")
class PricingConfigurationMapperTest {
  private final PricingConfigurationMapper mapper = new PricingConfigurationMapper();

  @Test
  void mapsHourlyConfigurationToLegacyRateRequest() {
    var request = request(
        PricingStrategyDto.PricingStrategyType.HOURLY,
        new PricingRatesDto(BigDecimal.valueOf(5000), null, null, null, null));

    var legacy = mapper.toRateUpsert(request);

    assertThat(legacy.rateType()).isEqualTo(RateType.HOURLY);
    assertThat(legacy.amount()).isEqualByComparingTo("5000");
    assertThat(legacy.fractionMinutes()).isEqualTo(60);
  }

  @Test
  void mapsFractionalConfigurationToFractionalLegacyRateRequest() {
    var request = request(
        PricingStrategyDto.PricingStrategyType.FRACTIONAL,
        new PricingRatesDto(null, 15, BigDecimal.valueOf(1500), null, null));

    var legacy = mapper.toRateUpsert(request);

    assertThat(legacy.rateType()).isEqualTo(RateType.FRACTIONAL);
    assertThat(legacy.amount()).isEqualByComparingTo("1500");
    assertThat(legacy.fractionMinutes()).isEqualTo(15);
  }

  @Test
  void mapsMixedConfigurationToHourlyWithDailyCapAndNightFlag() {
    var request = request(
        PricingStrategyDto.PricingStrategyType.MIXED,
        new PricingRatesDto(BigDecimal.valueOf(5000), null, null, BigDecimal.valueOf(30000), BigDecimal.valueOf(8000)));

    var legacy = mapper.toRateUpsert(request);

    assertThat(legacy.rateType()).isEqualTo(RateType.HOURLY);
    assertThat(legacy.maxDailyValue()).isEqualByComparingTo("30000");
    assertThat(legacy.appliesNight()).isTrue();
  }

  private PricingConfigurationRequest request(
      PricingStrategyDto.PricingStrategyType type,
      PricingRatesDto rates) {
    return new PricingConfigurationRequest(
        "Tarifa estándar",
        "COP",
        true,
        true,
        null,
        "DEFAULT",
        null,
        new PricingStrategyDto(type, type.name()),
        new PricingRulesDto(
            java.util.List.of("GRACE_PERIOD", "MINIMUM_CHARGE", "ROUNDING", "STRATEGY_PRICE", "DAILY_CAP"),
            15,
            0,
            new PricingRulesDto.RoundingDto(PricingRulesDto.RoundingDto.RoundingMode.UP, 60),
            new PricingRulesDto.SpecialHoursDto(true, "20:00", "06:00"),
            new PricingRulesDto.WeekendsDto(false, null, null),
            new PricingRulesDto.DailyCapsDto(false, null),
            Map.of()),
        rates);
  }
}
