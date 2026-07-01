package com.parkflow.modules.pricing.application;

import com.parkflow.modules.pricing.dto.PricingEngineV1Request;
import com.parkflow.modules.pricing.dto.PricingExecutionStepDto;
import com.parkflow.modules.pricing.dto.PricingRulesDto;
import com.parkflow.modules.pricing.dto.PricingSimulationResponse;
import com.parkflow.modules.pricing.dto.PricingStrategyDto;
import com.parkflow.modules.pricing.dto.PricingVehicleOverrideDto;
import java.math.BigDecimal;
import java.text.NumberFormat;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.springframework.stereotype.Service;

@Service
public class PricingEngineService {
  private final LegacyPricingAdapter adapter;

  public PricingEngineService(LegacyPricingAdapter adapter) {
    this.adapter = adapter;
  }

  public PricingEngineV1Request resolvePricingConfiguration(PricingEngineV1Request base, String vehicleType) {
    return resolve(base, vehicleType).value();
  }

  public PricingSimulationResponse simulate(PricingEngineV1Request request, long stayMinutes, String vehicleType) {
    ResolvedConfiguration resolved = resolve(request, vehicleType);
    PricingEngineV1Request config = resolved.value();

    long realMinutes = Math.max(0, stayMinutes);
    long billableMinutes = realMinutes;
    List<PricingExecutionStepDto> steps = new ArrayList<>();
    List<String> appliedRules = new ArrayList<>();
    List<String> skippedRules = new ArrayList<>();

    steps.add(new PricingExecutionStepDto(
        "INPUT",
        "Entrada",
        "Sin estancia",
        "Estancia: " + formatMinutes(realMinutes),
        true,
        "Se normaliza la estancia real a minutos enteros."));

    steps.add(new PricingExecutionStepDto(
        "OVERRIDE_RESOLUTION",
        "Ajuste por vehículo",
        "Configuración base",
        resolved.overrideApplied() ? "Ajuste " + vehicleType : "Configuración base",
        resolved.overrideApplied(),
        resolved.overrideApplied()
            ? "Se heredó la configuración base y se aplicó el ajuste por tipo de vehículo."
            : "No hay ajuste propio para el tipo de vehículo seleccionado."));

    billableMinutes = applyGrace(config, billableMinutes, steps, appliedRules, skippedRules);
    billableMinutes = applyMinimumCharge(config, billableMinutes, steps, appliedRules, skippedRules);
    billableMinutes = applyRounding(config, billableMinutes, steps, appliedRules, skippedRules);

    PricingPriceResult price = calculateStrategyPrice(config.strategy(), config.rates(), billableMinutes, config.currency());
    appliedRules.add("STRATEGY_PRICE");
    steps.add(new PricingExecutionStepDto(
        "STRATEGY_PRICE",
        "Precio",
        formatMinutes(billableMinutes),
        formatMoney(price.subtotal(), config.currency()),
        true,
        price.reason()));

    BigDecimal total = price.subtotal();
    BigDecimal cap = config.rules().dailyCaps() != null && config.rules().dailyCaps().enabled()
        ? config.rules().dailyCaps().maxDailyPrice()
        : null;
    boolean capApplied = cap != null && total.compareTo(cap) > 0;
    if (capApplied) {
      total = cap;
      appliedRules.add("DAILY_CAP");
    } else {
      skippedRules.add("DAILY_CAP");
    }
    steps.add(new PricingExecutionStepDto(
        "DAILY_CAP",
        "Tope diario",
        formatMoney(price.subtotal(), config.currency()),
        formatMoney(total, config.currency()),
        capApplied,
        capApplied
            ? "El total se limita al tope diario de " + formatMoney(cap, config.currency()) + "."
            : "No aplica tope diario al resultado."));

    steps.add(new PricingExecutionStepDto(
        "RESULT",
        "Resultado",
        formatMoney(price.subtotal(), config.currency()),
        formatMoney(total, config.currency()),
        true,
        capApplied ? "Total final con tope diario aplicado." : "Total final sin tope diario aplicado."));

    return new PricingSimulationResponse(
        realMinutes,
        billableMinutes,
        price.chargedUnits(),
        price.subtotal(),
        total,
        config.currency(),
        config.strategy().label(),
        steps,
        appliedRules,
        skippedRules,
        capApplied ? "Total final con tope diario aplicado." : "Total final sin tope diario aplicado.");
  }

  public PricingPriceResult calculateStrategyPrice(
      PricingStrategyDto strategy,
      com.parkflow.modules.pricing.dto.PricingRatesDto rates,
      long billableMinutes,
      String currency) {
    if (billableMinutes <= 0) {
      return new PricingPriceResult(BigDecimal.ZERO, 0, "La estancia queda en cero minutos cobrables.");
    }

    return switch (strategy.type()) {
      case HOURLY -> {
        int chargedUnits = Math.max(1, (int) Math.ceil(billableMinutes / 60.0));
        BigDecimal unitPrice = nz(rates.pricePerHour());
        yield new PricingPriceResult(
            unitPrice.multiply(BigDecimal.valueOf(chargedUnits)),
            chargedUnits,
            chargedUnits + " hora(s) x " + formatMoney(unitPrice, currency) + ".");
      }
      case FRACTIONAL -> {
        int fractionMinutes = Math.max(1, rates.fractionMinutes() == null ? 1 : rates.fractionMinutes());
        int chargedUnits = Math.max(1, (int) Math.ceil(billableMinutes / (double) fractionMinutes));
        BigDecimal unitPrice = nz(rates.fractionPrice());
        yield new PricingPriceResult(
            unitPrice.multiply(BigDecimal.valueOf(chargedUnits)),
            chargedUnits,
            chargedUnits + " fracción(es) x " + formatMoney(unitPrice, currency) + ".");
      }
      case DAILY -> {
        int chargedUnits = Math.max(1, (int) Math.ceil(billableMinutes / 1440.0));
        BigDecimal unitPrice = nz(rates.dailyPrice());
        yield new PricingPriceResult(
            unitPrice.multiply(BigDecimal.valueOf(chargedUnits)),
            chargedUnits,
            chargedUnits + " día(s) x " + formatMoney(unitPrice, currency) + ".");
      }
      case NIGHT -> {
        int chargedUnits = Math.max(1, (int) Math.ceil(billableMinutes / 60.0));
        BigDecimal unitPrice = nz(rates.nightPrice());
        yield new PricingPriceResult(
            unitPrice.multiply(BigDecimal.valueOf(chargedUnits)),
            chargedUnits,
            chargedUnits + " bloque(s) nocturno(s) x " + formatMoney(unitPrice, currency) + ".");
      }
      case MIXED -> {
        int fullDays = (int) (billableMinutes / 1440);
        long remainingMinutes = billableMinutes % 1440;
        int hourlyUnits = remainingMinutes > 0 ? Math.max(1, (int) Math.ceil(remainingMinutes / 60.0)) : 0;
        BigDecimal dailyTotal = nz(rates.dailyPrice()).multiply(BigDecimal.valueOf(fullDays));
        BigDecimal hourlyTotal = nz(rates.pricePerHour()).multiply(BigDecimal.valueOf(hourlyUnits));
        yield new PricingPriceResult(
            dailyTotal.add(hourlyTotal),
            fullDays + hourlyUnits,
            fullDays + " día(s) + " + hourlyUnits + " hora(s).");
      }
    };
  }

  public record PricingPriceResult(BigDecimal subtotal, int chargedUnits, String reason) {}

  private ResolvedConfiguration resolve(PricingEngineV1Request base, String vehicleType) {
    PricingEngineV1Request normalized = adapter.normalize(base);
    if (vehicleType == null || vehicleType.isBlank()) {
      return new ResolvedConfiguration(normalized, false, vehicleType);
    }

    PricingVehicleOverrideDto override = normalized.rules().vehicleOverrides().get(vehicleType);
    if (override == null) {
      return new ResolvedConfiguration(normalized, false, vehicleType);
    }

    boolean inheritsBase = override.inheritsBase() == null || override.inheritsBase();
    PricingStrategyDto strategy = override.strategy() != null ? override.strategy() : normalized.strategy();
    PricingRulesDto rules = inheritsBase
        ? adapter.normalizeRules(override.rules() != null ? override.rules() : normalized.rules())
        : adapter.normalizeRules(override.rules() != null ? override.rules() : normalized.rules());
    com.parkflow.modules.pricing.dto.PricingRatesDto rates = inheritsBase
        ? adapter.normalizeRates(strategy, override.rates() != null ? override.rates() : normalized.rates())
        : adapter.normalizeRates(strategy, override.rates() != null ? override.rates() : normalized.rates());

    PricingEngineV1Request merged = new PricingEngineV1Request(
        normalized.name(),
        normalized.currency(),
        normalized.active(),
        normalized.advancedMode(),
        normalized.vehicleType(),
        normalized.site(),
        normalized.siteId(),
        strategy,
        rules,
        rates);
    return new ResolvedConfiguration(adapter.normalize(merged), true, vehicleType);
  }

  private long applyGrace(
      PricingEngineV1Request config,
      long billableMinutes,
      List<PricingExecutionStepDto> steps,
      List<String> appliedRules,
      List<String> skippedRules) {
    long before = billableMinutes;
    long grace = Math.max(0, config.rules().graceMinutes());
    long after = Math.max(0, before - grace);
    boolean applied = grace > 0 && after != before;
    addRuleResult(steps, appliedRules, skippedRules, "GRACE_PERIOD", "Cortesía", before, after, applied,
        applied ? "Se descuentan " + formatMinutes(grace) + " de cortesía." : "No hay minutos de cortesía configurados o la estancia ya era cero.");
    return after;
  }

  private long applyMinimumCharge(
      PricingEngineV1Request config,
      long billableMinutes,
      List<PricingExecutionStepDto> steps,
      List<String> appliedRules,
      List<String> skippedRules) {
    long before = billableMinutes;
    long minimum = Math.max(0, config.rules().minimumChargeMinutes());
    long after = minimum > 0 ? Math.max(before, minimum) : before;
    boolean applied = minimum > 0 && after != before;
    addRuleResult(steps, appliedRules, skippedRules, "MINIMUM_CHARGE", "Mínimo", before, after, applied,
        applied ? "Se eleva al mínimo de " + formatMinutes(minimum) + "." : "El mínimo no cambia los minutos cobrables.");
    return after;
  }

  private long applyRounding(
      PricingEngineV1Request config,
      long billableMinutes,
      List<PricingExecutionStepDto> steps,
      List<String> appliedRules,
      List<String> skippedRules) {
    long before = billableMinutes;
    PricingRulesDto.RoundingDto rounding = config.rules().rounding();
    long after = applyRounding(before,
        rounding == null ? PricingRulesDto.RoundingDto.RoundingMode.NONE : rounding.mode(),
        rounding == null ? null : rounding.incrementMinutes());
    boolean applied = before != after;
    addRuleResult(steps, appliedRules, skippedRules, "ROUNDING", "Redondeo", before, after, applied,
        rounding == null || rounding.mode() == PricingRulesDto.RoundingDto.RoundingMode.NONE
            ? "El redondeo está desactivado."
            : rounding.mode().name() + " cada " + (rounding.incrementMinutes() == null ? 1 : rounding.incrementMinutes()) + " min.");
    return after;
  }

  private void addRuleResult(
      List<PricingExecutionStepDto> steps,
      List<String> appliedRules,
      List<String> skippedRules,
      String id,
      String label,
      long before,
      long after,
      boolean applied,
      String reason) {
    if (applied) {
      appliedRules.add(id);
    } else {
      skippedRules.add(id);
    }
    steps.add(new PricingExecutionStepDto(
        id,
        label,
        formatMinutes(before),
        formatMinutes(after),
        applied,
        reason));
  }

  private long applyRounding(long minutes, PricingRulesDto.RoundingDto.RoundingMode mode, Integer increment) {
    if (mode == null || mode == PricingRulesDto.RoundingDto.RoundingMode.NONE) {
      return minutes;
    }
    long step = Math.max(1, increment == null ? 1 : increment);
    double units = minutes / (double) step;
    return switch (mode) {
      case DOWN -> (long) Math.floor(units) * step;
      case NEAREST -> Math.round(units) * step;
      case UP -> (long) Math.ceil(units) * step;
      case NONE -> minutes;
    };
  }

  private String formatMinutes(long minutes) {
    long safe = Math.max(0, minutes);
    long hours = safe / 60;
    long rest = safe % 60;
    if (hours == 0) return rest + " min";
    if (rest == 0) return hours + "h";
    return hours + "h " + rest + "m";
  }

  private String formatMoney(BigDecimal value, String currencyCode) {
    NumberFormat format = NumberFormat.getCurrencyInstance(Locale.forLanguageTag("es-CO"));
    try {
      format.setCurrency(java.util.Currency.getInstance(currencyCode == null || currencyCode.isBlank() ? "COP" : currencyCode));
    } catch (Exception ignored) {
      format.setCurrency(java.util.Currency.getInstance("COP"));
    }
    format.setMaximumFractionDigits(0);
    return format.format(value == null ? BigDecimal.ZERO : value);
  }

  private BigDecimal nz(BigDecimal value) {
    return value == null ? BigDecimal.ZERO : value;
  }

  private record ResolvedConfiguration(PricingEngineV1Request value, boolean overrideApplied, String sourceVehicleType) {}
}
