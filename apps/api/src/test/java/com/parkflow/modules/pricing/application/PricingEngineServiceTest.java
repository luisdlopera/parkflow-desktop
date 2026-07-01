package com.parkflow.modules.pricing.application;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.parkflow.modules.pricing.dto.PricingEngineV1Request;
import com.parkflow.modules.pricing.dto.PricingExecutionStepDto;
import com.parkflow.modules.pricing.dto.PricingRatesDto;
import com.parkflow.modules.pricing.dto.PricingRulesDto;
import com.parkflow.modules.pricing.dto.PricingSimulationResponse;
import com.parkflow.modules.pricing.dto.PricingStrategyDto;
import com.parkflow.modules.pricing.dto.PricingVehicleOverrideDto;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("PricingEngineService")
class PricingEngineServiceTest {
  private final PricingEngineService service =
      new PricingEngineService(new LegacyPricingAdapter(new ObjectMapper()));

  @Test
  void appliesGraceBeforeMinimumAndRounding() {
    PricingSimulationResponse response = service.simulate(baseHourlyConfig(), 61, null);

    assertThat(response.billableMinutes()).isEqualTo(60);
    assertThat(response.total()).isEqualByComparingTo("5000");
    assertThat(stepIds(response.executionSteps())).containsSubsequence(
        "INPUT",
        "OVERRIDE_RESOLUTION",
        "GRACE_PERIOD",
        "MINIMUM_CHARGE",
        "ROUNDING",
        "STRATEGY_PRICE",
        "DAILY_CAP",
        "RESULT");
  }

  @Test
  void appliesDailyCapAtTheEnd() {
    PricingEngineV1Request request = new PricingEngineV1Request(
        "Tarifa diaria",
        "COP",
        true,
        false,
        null,
        "DEFAULT",
        null,
        new PricingStrategyDto(PricingStrategyDto.PricingStrategyType.DAILY, "Diaria"),
        new PricingRulesDto(
            List.of("GRACE_PERIOD", "MINIMUM_CHARGE", "ROUNDING", "STRATEGY_PRICE", "DAILY_CAP"),
            0,
            0,
            new PricingRulesDto.RoundingDto(PricingRulesDto.RoundingDto.RoundingMode.NONE, 60),
            null,
            null,
            new PricingRulesDto.DailyCapsDto(true, BigDecimal.valueOf(20000)),
            Map.of()),
        new PricingRatesDto(null, null, null, BigDecimal.valueOf(30000), null));

    PricingSimulationResponse response = service.simulate(request, 1440, null);

    assertThat(response.subtotal()).isEqualByComparingTo("30000");
    assertThat(response.total()).isEqualByComparingTo("20000");
    assertThat(response.appliedRules()).contains("DAILY_CAP");
  }

  @Test
  void resolvesVehicleOverrideWithInheritedBase() {
    PricingEngineV1Request request = new PricingEngineV1Request(
        "Tarifa base",
        "COP",
        true,
        true,
        null,
        "DEFAULT",
        null,
        new PricingStrategyDto(PricingStrategyDto.PricingStrategyType.HOURLY, "Por hora"),
        new PricingRulesDto(
            List.of("GRACE_PERIOD", "MINIMUM_CHARGE", "ROUNDING", "STRATEGY_PRICE", "DAILY_CAP"),
            0,
            0,
            new PricingRulesDto.RoundingDto(PricingRulesDto.RoundingDto.RoundingMode.NONE, 60),
            null,
            null,
            null,
            Map.of(
                "MOTORCYCLE",
                new PricingVehicleOverrideDto(
                    true,
                    null,
                    null,
                    new PricingRatesDto(BigDecimal.valueOf(2500), null, null, null, null)))),
        new PricingRatesDto(BigDecimal.valueOf(5000), null, null, null, null));

    PricingSimulationResponse response = service.simulate(request, 60, "MOTORCYCLE");

    assertThat(response.total()).isEqualByComparingTo("2500");
    assertThat(response.executionSteps())
        .anySatisfy(step -> {
          assertThat(step.id()).isEqualTo("OVERRIDE_RESOLUTION");
          assertThat(step.applied()).isTrue();
        });
  }

  private PricingEngineV1Request baseHourlyConfig() {
    return new PricingEngineV1Request(
        "Tarifa base",
        "COP",
        true,
        false,
        null,
        "DEFAULT",
        null,
        new PricingStrategyDto(PricingStrategyDto.PricingStrategyType.HOURLY, "Por hora"),
        new PricingRulesDto(
            List.of("GRACE_PERIOD", "MINIMUM_CHARGE", "ROUNDING", "STRATEGY_PRICE", "DAILY_CAP"),
            15,
            60,
            new PricingRulesDto.RoundingDto(PricingRulesDto.RoundingDto.RoundingMode.UP, 15),
            null,
            null,
            null,
            Map.of()),
        new PricingRatesDto(BigDecimal.valueOf(5000), null, null, null, null));
  }

  private List<String> stepIds(List<PricingExecutionStepDto> steps) {
    return steps.stream().map(PricingExecutionStepDto::id).toList();
  }
}
