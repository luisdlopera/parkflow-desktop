package com.parkflow.modules.pricing.application;

import com.parkflow.modules.common.dto.RateResponse;
import com.parkflow.modules.common.dto.RateUpsertRequest;
import com.parkflow.modules.configuration.domain.RoundingMode;
import com.parkflow.modules.parking.operation.domain.RateCategory;
import com.parkflow.modules.parking.operation.domain.RateType;
import com.parkflow.modules.pricing.dto.*;
import java.math.BigDecimal;
import java.time.LocalTime;
import org.springframework.stereotype.Component;

@Component
public class PricingConfigurationMapper {
  private static final BigDecimal ZERO = BigDecimal.ZERO;

  public RateUpsertRequest toRateUpsert(PricingConfigurationRequest request) {
    PricingStrategyDto.PricingStrategyType type = request.strategy().type();
    PricingRulesDto rules = request.rules();
    PricingRatesDto rates = request.rates();
    BigDecimal amount = amountFor(type, rates);
    int fractionMinutes = fractionMinutesFor(type, rules, rates);
    boolean specialHours = rules.specialHours() != null && rules.specialHours().enabled();

    return new RateUpsertRequest(
        request.name(),
        blankToNull(request.vehicleType()),
        RateCategory.STANDARD,
        rateTypeFor(type),
        amount,
        rules.graceMinutes(),
        0,
        fractionMinutes,
        roundingModeFor(rules.rounding()),
        ZERO,
        request.active() == null || request.active(),
        blankToDefault(request.site(), "DEFAULT"),
        request.siteId(),
        ZERO,
        0,
        ZERO,
        0,
        null,
        null,
        maxDailyValue(type, rules, rates),
        specialHours || type == PricingStrategyDto.PricingStrategyType.NIGHT || type == PricingStrategyDto.PricingStrategyType.MIXED,
        ZERO,
        rules.weekends() != null && rules.weekends().enabled(),
        rules.weekends() != null && rules.weekends().surchargePercent() != null
            ? rules.weekends().surchargePercent()
            : ZERO,
        null,
        specialHours ? parseTime(rules.specialHours().startTime()) : null,
        specialHours ? parseTime(rules.specialHours().endTime()) : null,
        null,
        null);
  }

  public PricingConfigurationResponse toPricingResponse(RateResponse rate) {
    PricingStrategyDto.PricingStrategyType type = strategyTypeFor(rate);
    PricingRulesDto rules =
        new PricingRulesDto(
            java.util.List.of("GRACE_PERIOD", "MINIMUM_CHARGE", "ROUNDING", "STRATEGY_PRICE", "DAILY_CAP"),
            rate.graceMinutes(),
            0,
            new PricingRulesDto.RoundingDto(
                rate.roundingMode() == null
                    ? PricingRulesDto.RoundingDto.RoundingMode.UP
                    : PricingRulesDto.RoundingDto.RoundingMode.valueOf(rate.roundingMode().name()),
                rate.fractionMinutes()),
            new PricingRulesDto.SpecialHoursDto(
                rate.appliesNight() || rate.windowStart() != null || rate.windowEnd() != null,
                rate.windowStart() != null ? rate.windowStart().toString().substring(0, 5) : "20:00",
                rate.windowEnd() != null ? rate.windowEnd().toString().substring(0, 5) : "06:00"),
            new PricingRulesDto.WeekendsDto(
                rate.appliesHoliday(), rate.holidaySurchargePercent(), null),
            new PricingRulesDto.DailyCapsDto(rate.maxDailyValue() != null, rate.maxDailyValue()),
            java.util.Map.of());

    PricingRatesDto rates =
        new PricingRatesDto(
            type == PricingStrategyDto.PricingStrategyType.HOURLY || type == PricingStrategyDto.PricingStrategyType.MIXED
                ? rate.amount()
                : null,
            rate.fractionMinutes(),
            type == PricingStrategyDto.PricingStrategyType.FRACTIONAL ? rate.amount() : null,
            type == PricingStrategyDto.PricingStrategyType.DAILY ? rate.amount() : rate.maxDailyValue(),
            rate.appliesNight() ? rate.amount() : null);

    return new PricingConfigurationResponse(
        rate.id(),
        rate.name(),
        "COP",
        rate.active(),
        rate.appliesNight() || rate.appliesHoliday() || rate.maxDailyValue() != null,
        rate.vehicleType(),
        rate.site(),
        rate.siteId(),
        new PricingStrategyDto(type, labelFor(type)),
        rules,
        rates);
  }

  private BigDecimal amountFor(PricingStrategyDto.PricingStrategyType type, PricingRatesDto rates) {
    return switch (type) {
      case FRACTIONAL -> nz(rates.fractionPrice());
      case DAILY -> nz(rates.dailyPrice());
      case NIGHT -> nz(rates.nightPrice());
      case MIXED, HOURLY -> nz(firstNonNull(rates.pricePerHour(), rates.dailyPrice(), rates.nightPrice()));
    };
  }

  private BigDecimal maxDailyValue(PricingStrategyDto.PricingStrategyType type, PricingRulesDto rules, PricingRatesDto rates) {
    if (rules.dailyCaps() != null && rules.dailyCaps().enabled()) {
      return rules.dailyCaps().maxDailyPrice();
    }
    return type == PricingStrategyDto.PricingStrategyType.MIXED ? rates.dailyPrice() : null;
  }

  private int fractionMinutesFor(PricingStrategyDto.PricingStrategyType type, PricingRulesDto rules, PricingRatesDto rates) {
    if (type == PricingStrategyDto.PricingStrategyType.DAILY) return 1440;
    if (type == PricingStrategyDto.PricingStrategyType.FRACTIONAL && rates.fractionMinutes() != null) {
      return rates.fractionMinutes();
    }
    if (rules.rounding() != null && rules.rounding().incrementMinutes() != null) {
      return rules.rounding().incrementMinutes();
    }
    return 60;
  }

  private RateType rateTypeFor(PricingStrategyDto.PricingStrategyType type) {
    return switch (type) {
      case FRACTIONAL -> RateType.FRACTIONAL;
      case DAILY -> RateType.DAILY;
      case NIGHT, MIXED, HOURLY -> RateType.HOURLY;
    };
  }

  private PricingStrategyDto.PricingStrategyType strategyTypeFor(RateResponse rate) {
    if (rate.rateType() == RateType.FRACTIONAL) return PricingStrategyDto.PricingStrategyType.FRACTIONAL;
    if (rate.rateType() == RateType.DAILY || rate.rateType() == RateType.FLAT) return PricingStrategyDto.PricingStrategyType.DAILY;
    if (rate.appliesNight() && rate.maxDailyValue() != null) return PricingStrategyDto.PricingStrategyType.MIXED;
    if (rate.appliesNight()) return PricingStrategyDto.PricingStrategyType.NIGHT;
    return PricingStrategyDto.PricingStrategyType.HOURLY;
  }

  private RoundingMode roundingModeFor(PricingRulesDto.RoundingDto rounding) {
    if (rounding == null || rounding.mode() == null || rounding.mode() == PricingRulesDto.RoundingDto.RoundingMode.NONE) {
      return RoundingMode.UP;
    }
    return RoundingMode.valueOf(rounding.mode().name());
  }

  private LocalTime parseTime(String raw) {
    return raw == null || raw.isBlank() ? null : LocalTime.parse(raw.length() == 5 ? raw : raw.substring(0, 5));
  }

  private String labelFor(PricingStrategyDto.PricingStrategyType type) {
    return switch (type) {
      case HOURLY -> "Por hora";
      case FRACTIONAL -> "Por fracción";
      case DAILY -> "Diaria";
      case NIGHT -> "Nocturna";
      case MIXED -> "Mixta";
    };
  }

  private BigDecimal nz(BigDecimal value) {
    return value == null ? ZERO : value;
  }

  private BigDecimal firstNonNull(BigDecimal... values) {
    for (BigDecimal value : values) {
      if (value != null) return value;
    }
    return ZERO;
  }

  private String blankToNull(String value) {
    return value == null || value.isBlank() ? null : value;
  }

  private String blankToDefault(String value, String fallback) {
    return value == null || value.isBlank() ? fallback : value;
  }
}
