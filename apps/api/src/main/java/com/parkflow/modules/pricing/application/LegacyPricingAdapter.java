package com.parkflow.modules.pricing.application;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.parkflow.modules.configuration.domain.RoundingMode;
import com.parkflow.modules.parking.operation.domain.Rate;
import com.parkflow.modules.parking.operation.domain.RateCategory;
import com.parkflow.modules.parking.operation.domain.RateType;
import com.parkflow.modules.pricing.dto.*;
import java.math.BigDecimal;
import java.time.LocalTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class LegacyPricingAdapter {
  private static final BigDecimal ZERO = BigDecimal.ZERO;
  private static final String VERSION = "pricing_engine_v1";
  private static final List<String> DEFAULT_EXECUTION_ORDER =
      List.of("GRACE_PERIOD", "MINIMUM_CHARGE", "ROUNDING", "STRATEGY_PRICE", "DAILY_CAP");

  private final ObjectMapper objectMapper;

  public LegacyPricingAdapter(ObjectMapper objectMapper) {
    this.objectMapper = objectMapper;
  }

  public PricingEngineV1Request normalize(PricingEngineV1Request request) {
    return new PricingEngineV1Request(
        request.name(),
        blankToDefault(request.currency(), "COP"),
        request.active() == null || request.active(),
        request.advancedMode() != null && request.advancedMode(),
        blankToNull(request.vehicleType()),
        blankToDefault(request.site(), "DEFAULT"),
        request.siteId(),
        normalizeStrategy(request.strategy()),
        normalizeRules(request.rules()),
        normalizeRates(request.strategy(), request.rates()));
  }

  public Rate toRate(PricingEngineV1Request request, Rate target) {
    PricingEngineV1Request normalized = normalize(request);
    target.setName(normalized.name().trim());
    target.setVehicleType(normalized.vehicleType());
    target.setCategory(RateCategory.STANDARD);
    target.setRateType(rateTypeFor(normalized.strategy().type()));
    target.setAmount(amountFor(normalized.strategy().type(), normalized.rates()));
    target.setGraceMinutes(Math.max(0, normalized.rules().graceMinutes()));
    target.setToleranceMinutes(0);
    target.setFractionMinutes(fractionMinutesFor(normalized.strategy().type(), normalized.rules(), normalized.rates()));
    target.setRoundingMode(roundingModeFor(normalized.rules().rounding()));
    target.setLostTicketSurcharge(ZERO);
    target.setActive(normalized.active());
    target.setBaseValue(ZERO);
    target.setBaseMinutes(0);
    target.setAdditionalValue(ZERO);
    target.setAdditionalMinutes(0);
    target.setMinSessionValue(null);
    target.setMaxSessionValue(null);
    target.setMaxDailyValue(maxDailyValue(normalized));
    boolean specialHours = normalized.rules().specialHours() != null && normalized.rules().specialHours().enabled();
    target.setAppliesNight(specialHours || normalized.strategy().type() == PricingStrategyDto.PricingStrategyType.NIGHT || normalized.strategy().type() == PricingStrategyDto.PricingStrategyType.MIXED);
    target.setNightSurchargePercent(ZERO);
    target.setAppliesHoliday(normalized.rules().weekends() != null && normalized.rules().weekends().enabled());
    target.setHolidaySurchargePercent(
        normalized.rules().weekends() != null && normalized.rules().weekends().surchargePercent() != null
            ? normalized.rules().weekends().surchargePercent()
            : ZERO);
    target.setAppliesDaysBitmap(null);
    target.setWindowStart(specialHours ? parseTime(normalized.rules().specialHours().startTime()) : null);
    target.setWindowEnd(specialHours ? parseTime(normalized.rules().specialHours().endTime()) : null);
    target.setScheduledActiveFrom(null);
    target.setScheduledActiveTo(null);
    target.setPricingEngineVersion(VERSION);
    target.setPricingConfiguration(objectMapper.convertValue(normalized, new TypeReference<Map<String, Object>>() {}));
    return target;
  }

  public PricingEngineV1Response toResponse(Rate rate) {
    PricingEngineV1Request request = fromRate(rate);
    return new PricingEngineV1Response(
        rate.getId(),
        rate.getPricingEngineVersion() == null ? VERSION : rate.getPricingEngineVersion(),
        request.name(),
        request.currency(),
        request.active(),
        request.advancedMode(),
        request.vehicleType(),
        request.site(),
        request.siteId(),
        request.strategy(),
        request.rules(),
        request.rates());
  }

  public PricingEngineV1Request fromRate(Rate rate) {
    if (rate.getPricingConfiguration() != null && !rate.getPricingConfiguration().isEmpty()) {
      try {
        return normalize(objectMapper.convertValue(rate.getPricingConfiguration(), PricingEngineV1Request.class));
      } catch (IllegalArgumentException ignored) {
        // fall through to legacy projection
      }
    }

    PricingStrategyDto.PricingStrategyType type = legacyType(rate);
    PricingStrategyDto strategy = new PricingStrategyDto(type, labelFor(type));
    PricingRulesDto rules =
        new PricingRulesDto(
            DEFAULT_EXECUTION_ORDER,
            rate.getGraceMinutes(),
            0,
            new PricingRulesDto.RoundingDto(
                rate.getRoundingMode() == null ? PricingRulesDto.RoundingDto.RoundingMode.UP : PricingRulesDto.RoundingDto.RoundingMode.valueOf(rate.getRoundingMode().name()),
                rate.getFractionMinutes() > 0 ? rate.getFractionMinutes() : 60),
            new PricingRulesDto.SpecialHoursDto(
                rate.isAppliesNight() || rate.getWindowStart() != null || rate.getWindowEnd() != null,
                rate.getWindowStart() != null ? rate.getWindowStart().toString().substring(0, 5) : "20:00",
                rate.getWindowEnd() != null ? rate.getWindowEnd().toString().substring(0, 5) : "06:00"),
            new PricingRulesDto.WeekendsDto(rate.isAppliesHoliday(), rate.getHolidaySurchargePercent(), null),
            new PricingRulesDto.DailyCapsDto(rate.getMaxDailyValue() != null, rate.getMaxDailyValue()),
            Map.of());
    PricingRatesDto rates =
        new PricingRatesDto(
            type == PricingStrategyDto.PricingStrategyType.HOURLY || type == PricingStrategyDto.PricingStrategyType.MIXED ? rate.getAmount() : null,
            rate.getFractionMinutes() > 0 ? rate.getFractionMinutes() : null,
            type == PricingStrategyDto.PricingStrategyType.FRACTIONAL ? rate.getAmount() : null,
            type == PricingStrategyDto.PricingStrategyType.DAILY ? rate.getAmount() : rate.getMaxDailyValue(),
            type == PricingStrategyDto.PricingStrategyType.NIGHT ? rate.getAmount() : null);

    return normalize(new PricingEngineV1Request(
        rate.getName(),
        "COP",
        rate.isActive(),
        rate.isAppliesNight() || rate.isAppliesHoliday() || rate.getMaxDailyValue() != null,
        rate.getVehicleType(),
        rate.getSiteRef() != null ? rate.getSiteRef().getCode() : "DEFAULT",
        rate.getSiteRef() != null ? rate.getSiteRef().getId() : null,
        strategy,
        rules,
        rates));
  }

  PricingStrategyDto normalizeStrategy(PricingStrategyDto strategy) {
    if (strategy == null || strategy.type() == null) {
      return new PricingStrategyDto(PricingStrategyDto.PricingStrategyType.HOURLY, "Por hora");
    }
    return new PricingStrategyDto(strategy.type(), blankToDefault(strategy.label(), labelFor(strategy.type())));
  }

  PricingRulesDto normalizeRules(PricingRulesDto rules) {
    if (rules == null) {
      return new PricingRulesDto(DEFAULT_EXECUTION_ORDER, 0, 0, new PricingRulesDto.RoundingDto(PricingRulesDto.RoundingDto.RoundingMode.NONE, 60), null, null, null, Map.of());
    }
    return new PricingRulesDto(
        rules.executionOrder() == null || rules.executionOrder().isEmpty() ? DEFAULT_EXECUTION_ORDER : rules.executionOrder(),
        Math.max(0, rules.graceMinutes()),
        Math.max(0, rules.minimumChargeMinutes()),
        rules.rounding() == null ? new PricingRulesDto.RoundingDto(PricingRulesDto.RoundingDto.RoundingMode.NONE, null) : rules.rounding(),
        rules.specialHours(),
        rules.weekends(),
        rules.dailyCaps(),
        rules.vehicleOverrides() == null ? Map.of() : rules.vehicleOverrides());
  }

  PricingRatesDto normalizeRates(PricingStrategyDto strategy, PricingRatesDto rates) {
    if (rates == null) {
      return new PricingRatesDto(null, null, null, null, null);
    }
    return switch (strategy.type()) {
      case HOURLY -> new PricingRatesDto(rates.pricePerHour(), null, null, null, null);
      case FRACTIONAL -> new PricingRatesDto(null, Math.max(1, rates.fractionMinutes() == null ? 15 : rates.fractionMinutes()), rates.fractionPrice(), null, null);
      case DAILY -> new PricingRatesDto(null, null, null, rates.dailyPrice(), null);
      case NIGHT -> new PricingRatesDto(null, null, null, null, rates.nightPrice());
      case MIXED -> new PricingRatesDto(
          rates.pricePerHour(),
          rates.fractionMinutes(),
          rates.fractionPrice(),
          rates.dailyPrice(),
          rates.nightPrice());
    };
  }

  private RateType rateTypeFor(PricingStrategyDto.PricingStrategyType type) {
    return switch (type) {
      case FRACTIONAL -> RateType.FRACTIONAL;
      case DAILY -> RateType.DAILY;
      case HOURLY, NIGHT, MIXED -> RateType.HOURLY;
    };
  }

  private PricingStrategyDto.PricingStrategyType legacyType(Rate rate) {
    if (rate.getRateType() == RateType.FRACTIONAL) return PricingStrategyDto.PricingStrategyType.FRACTIONAL;
    if (rate.getRateType() == RateType.DAILY || rate.getRateType() == RateType.FLAT) return PricingStrategyDto.PricingStrategyType.DAILY;
    if (rate.isAppliesNight() && rate.getMaxDailyValue() != null) return PricingStrategyDto.PricingStrategyType.MIXED;
    if (rate.isAppliesNight()) return PricingStrategyDto.PricingStrategyType.NIGHT;
    return PricingStrategyDto.PricingStrategyType.HOURLY;
  }

  private BigDecimal amountFor(PricingStrategyDto.PricingStrategyType type, PricingRatesDto rates) {
    return switch (type) {
      case FRACTIONAL -> nz(rates.fractionPrice());
      case DAILY -> nz(rates.dailyPrice());
      case NIGHT -> nz(rates.nightPrice());
      case HOURLY, MIXED -> nz(firstNonNull(rates.pricePerHour(), rates.dailyPrice(), rates.nightPrice(), rates.fractionPrice()));
    };
  }

  private BigDecimal maxDailyValue(PricingEngineV1Request request) {
    if (request.rules() != null && request.rules().dailyCaps() != null && request.rules().dailyCaps().enabled()) {
      return request.rules().dailyCaps().maxDailyPrice();
    }
    return request.rates().dailyPrice();
  }

  private int fractionMinutesFor(PricingStrategyDto.PricingStrategyType type, PricingRulesDto rules, PricingRatesDto rates) {
    if (type == PricingStrategyDto.PricingStrategyType.DAILY) return 1440;
    if (type == PricingStrategyDto.PricingStrategyType.FRACTIONAL && rates.fractionMinutes() != null) return rates.fractionMinutes();
    if (rules.rounding() != null && rules.rounding().incrementMinutes() != null) return rules.rounding().incrementMinutes();
    return 60;
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
      case MIXED -> "Hora + día + horario especial";
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

  private String blankToDefault(String value, String fallback) {
    return value == null || value.isBlank() ? fallback : value;
  }

  private String blankToNull(String value) {
    return value == null || value.isBlank() ? null : value;
  }
}
