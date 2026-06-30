import { DEFAULT_PRICING_CONFIGURATION, STRATEGY_LABELS } from "./constants";
import type { PricingConfiguration, PricingStrategyType } from "./types";

type RateLike = Record<string, any>;

const num = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export function createPricingConfiguration(seed: Partial<PricingConfiguration> = {}): PricingConfiguration {
  return {
    ...DEFAULT_PRICING_CONFIGURATION,
    ...seed,
    strategy: {
      ...DEFAULT_PRICING_CONFIGURATION.strategy,
      ...(seed.strategy ?? {}),
      label: seed.strategy?.label ?? STRATEGY_LABELS[seed.strategy?.type ?? DEFAULT_PRICING_CONFIGURATION.strategy.type],
    },
    rules: {
      ...DEFAULT_PRICING_CONFIGURATION.rules,
      ...(seed.rules ?? {}),
      rounding: {
        ...DEFAULT_PRICING_CONFIGURATION.rules.rounding,
        ...(seed.rules?.rounding ?? {}),
      },
      specialHours: {
        ...DEFAULT_PRICING_CONFIGURATION.rules.specialHours,
        ...(seed.rules?.specialHours ?? {}),
      },
      weekends: {
        ...DEFAULT_PRICING_CONFIGURATION.rules.weekends,
        ...(seed.rules?.weekends ?? {}),
      },
      dailyCaps: {
        ...DEFAULT_PRICING_CONFIGURATION.rules.dailyCaps,
        ...(seed.rules?.dailyCaps ?? {}),
      },
      vehicleOverrides: seed.rules?.vehicleOverrides ?? DEFAULT_PRICING_CONFIGURATION.rules.vehicleOverrides,
    },
    rates: {
      ...DEFAULT_PRICING_CONFIGURATION.rates,
      ...(seed.rates ?? {}),
    },
  };
}

export function stepDataToPricingConfiguration(stepData: Record<string, unknown>): PricingConfiguration {
  if (stepData.pricingConfiguration && typeof stepData.pricingConfiguration === "object") {
    return createPricingConfiguration(stepData.pricingConfiguration as Partial<PricingConfiguration>);
  }

  const legacyModel = String(stepData.billingModel || "HOURLY");
  const strategyType: PricingStrategyType =
    legacyModel === "FRACTION" ? "FRACTIONAL" :
    legacyModel === "FULL_DAY" || legacyModel === "FLAT" ? "DAILY" :
    legacyModel === "MIXED" ? "MIXED" : "HOURLY";

  return createPricingConfiguration({
    strategy: { type: strategyType, label: STRATEGY_LABELS[strategyType] },
    rates: {
      pricePerHour: num(stepData.baseValue, undefined as unknown as number),
      fractionMinutes: num(stepData.minFractionMinutes, 15),
      fractionPrice: num(stepData.fractionValue, undefined as unknown as number),
      dailyPrice: num(stepData.fullDayRate ?? stepData.flatRate, undefined as unknown as number),
      nightPrice: num(stepData.nightRate, undefined as unknown as number),
    },
    rules: {
      graceMinutes: num(stepData.graceMinutes),
      minimumChargeMinutes: 0,
      rounding: legacyRoundingToPricing(String(stepData.rounding || "EXACT")),
      specialHours: {
        enabled: Boolean(stepData.hasNightRate),
        startTime: String(stepData.nightStartTime || "20:00"),
        endTime: String(stepData.nightEndTime || "06:00"),
      },
      weekends: {
        enabled: Boolean(stepData.hasWeekendRate),
        fixedPrice: num(stepData.weekendRate, undefined as unknown as number),
      },
      dailyCaps: {
        enabled: Boolean(stepData.hasFullDayRate),
        maxDailyPrice: num(stepData.fullDayRate, undefined as unknown as number),
      },
      vehicleOverrides: ratesByTypeToOverrides(stepData.ratesByType as Record<string, unknown> | undefined),
    },
    advancedMode: Boolean(stepData.hasNightRate || stepData.hasWeekendRate || stepData.enableRateByType),
  });
}

export function pricingConfigurationToStepData(config: PricingConfiguration): Record<string, unknown> {
  const model = config.strategy.type === "FRACTIONAL" ? "FRACTION" :
    config.strategy.type === "DAILY" ? "FULL_DAY" :
    config.strategy.type === "NIGHT" ? "MIXED" :
    config.strategy.type;

  return {
    pricingConfiguration: config,
    billingModel: model,
    baseValue: config.rates.pricePerHour ?? config.rates.fractionPrice ?? config.rates.nightPrice ?? "",
    flatRate: config.rates.dailyPrice ?? "",
    hasNightRate: Boolean(config.rules.specialHours?.enabled || config.strategy.type === "NIGHT" || config.strategy.type === "MIXED"),
    nightStartTime: config.rules.specialHours?.startTime ?? "20:00",
    nightEndTime: config.rules.specialHours?.endTime ?? "06:00",
    nightRate: config.rates.nightPrice ?? "",
    hasFullDayRate: Boolean(config.rates.dailyPrice || config.rules.dailyCaps?.enabled),
    fullDayRate: config.rates.dailyPrice ?? config.rules.dailyCaps?.maxDailyPrice ?? "",
    hasWeekendRate: Boolean(config.rules.weekends?.enabled),
    weekendRate: config.rules.weekends?.fixedPrice ?? "",
    hasFractions: config.strategy.type === "FRACTIONAL",
    minFractionMinutes: config.rates.fractionMinutes ?? "",
    fractionValue: config.rates.fractionPrice ?? "",
    hasCourtesy: config.rules.graceMinutes > 0,
    graceMinutes: config.rules.graceMinutes,
    rounding: pricingRoundingToLegacy(config.rules.rounding),
    enableRateByType: Object.keys(config.rules.vehicleOverrides ?? {}).length > 0,
    ratesByType: overridesToRatesByType(config.rules.vehicleOverrides),
  };
}

export function rateRowToPricingConfiguration(rate: RateLike): PricingConfiguration {
  const strategyType = legacyRateTypeToStrategy(rate.rateType, rate);
  return createPricingConfiguration({
    id: rate.id,
    name: rate.name || "Tarifa estándar",
    site: rate.site || "DEFAULT",
    siteId: rate.siteId ?? null,
    vehicleType: rate.vehicleType ?? null,
    active: rate.active ?? true,
    strategy: { type: strategyType, label: STRATEGY_LABELS[strategyType] },
    rates: {
      pricePerHour: strategyType === "HOURLY" || strategyType === "MIXED" ? num(rate.amount) : undefined,
      fractionMinutes: num(rate.fractionMinutes, 15),
      fractionPrice: strategyType === "FRACTIONAL" ? num(rate.amount) : undefined,
      dailyPrice: strategyType === "DAILY" ? num(rate.amount) : num(rate.maxDailyValue, undefined as unknown as number),
      nightPrice: rate.appliesNight ? num(rate.amount) : undefined,
    },
    rules: {
      graceMinutes: num(rate.graceMinutes),
      minimumChargeMinutes: num(rate.minSessionValue) > 0 ? num(rate.fractionMinutes) : 0,
      rounding: {
        mode: rate.roundingMode ?? "UP",
        incrementMinutes: num(rate.fractionMinutes, 60),
      },
      specialHours: {
        enabled: Boolean(rate.appliesNight || rate.windowStart || rate.windowEnd),
        startTime: String(rate.windowStart || "20:00").slice(0, 5),
        endTime: String(rate.windowEnd || "06:00").slice(0, 5),
      },
      weekends: {
        enabled: Boolean(rate.appliesHoliday),
        surchargePercent: num(rate.holidaySurchargePercent, undefined as unknown as number),
      },
      dailyCaps: {
        enabled: Boolean(rate.maxDailyValue),
        maxDailyPrice: num(rate.maxDailyValue, undefined as unknown as number),
      },
      vehicleOverrides: {},
    },
    advancedMode: Boolean(rate.appliesNight || rate.appliesHoliday || rate.maxDailyValue || rate.windowStart),
  });
}

export function pricingConfigurationToRatePayload(config: PricingConfiguration) {
  const strategy = config.strategy.type;
  const amount =
    strategy === "FRACTIONAL" ? config.rates.fractionPrice :
    strategy === "DAILY" ? config.rates.dailyPrice :
    strategy === "NIGHT" ? config.rates.nightPrice :
    config.rates.pricePerHour ?? config.rates.dailyPrice ?? config.rates.nightPrice ?? config.rates.fractionPrice ?? 0;

  const fractionMinutes =
    strategy === "DAILY" ? 1440 :
    strategy === "FRACTIONAL" ? config.rates.fractionMinutes || 15 :
    config.rules.rounding.incrementMinutes || 60;

  return {
    name: config.name.trim(),
    vehicleType: config.vehicleType || null,
    category: "STANDARD",
    rateType: strategy === "FRACTIONAL" ? "FRACTIONAL" : strategy === "DAILY" ? "DAILY" : "HOURLY",
    amount: Number(amount || 0),
    graceMinutes: Number(config.rules.graceMinutes || 0),
    toleranceMinutes: 0,
    fractionMinutes,
    roundingMode: config.rules.rounding.mode === "NONE" ? "UP" : config.rules.rounding.mode,
    lostTicketSurcharge: 0,
    active: config.active,
    site: config.site || "DEFAULT",
    siteId: config.siteId ?? null,
    baseValue: 0,
    baseMinutes: 0,
    additionalValue: 0,
    additionalMinutes: 0,
    minSessionValue: null,
    maxSessionValue: null,
    maxDailyValue: config.rules.dailyCaps?.enabled ? config.rules.dailyCaps.maxDailyPrice ?? null : config.rates.dailyPrice ?? null,
    appliesNight: Boolean(config.rules.specialHours?.enabled || strategy === "NIGHT" || strategy === "MIXED"),
    nightSurchargePercent: 0,
    appliesHoliday: Boolean(config.rules.weekends?.enabled),
    holidaySurchargePercent: config.rules.weekends?.surchargePercent ?? 0,
    appliesDaysBitmap: null,
    windowStart: config.rules.specialHours?.enabled ? `${config.rules.specialHours.startTime}:00` : null,
    windowEnd: config.rules.specialHours?.enabled ? `${config.rules.specialHours.endTime}:00` : null,
    scheduledActiveFrom: null,
    scheduledActiveTo: null,
  };
}

function legacyRateTypeToStrategy(rateType: string, rate: RateLike): PricingStrategyType {
  if (rateType === "FRACTIONAL" || rateType === "FRACTION") return "FRACTIONAL";
  if (rateType === "DAILY" || rateType === "FLAT") return "DAILY";
  if (rate.appliesNight && !rate.maxDailyValue) return "NIGHT";
  if (rate.appliesNight || rate.maxDailyValue) return "MIXED";
  return "HOURLY";
}

function legacyRoundingToPricing(rounding: string) {
  if (rounding === "EXACT") return { mode: "NONE" as const };
  if (rounding === "15_MIN") return { mode: "UP" as const, incrementMinutes: 15 };
  if (rounding === "30_MIN") return { mode: "UP" as const, incrementMinutes: 30 };
  if (rounding === "1_HOUR") return { mode: "UP" as const, incrementMinutes: 60 };
  return { mode: "UP" as const, incrementMinutes: 60 };
}

function pricingRoundingToLegacy(rounding: { mode: string; incrementMinutes?: number }) {
  if (rounding.mode === "NONE") return "EXACT";
  if (rounding.incrementMinutes === 15) return "15_MIN";
  if (rounding.incrementMinutes === 30) return "30_MIN";
  if (rounding.incrementMinutes === 60) return "1_HOUR";
  return "EXACT";
}

function ratesByTypeToOverrides(rates?: Record<string, unknown>) {
  if (!rates) return {};
  return Object.fromEntries(Object.entries(rates).map(([vehicleType, price]) => [vehicleType, { rates: { pricePerHour: num(price) } }]));
}

function overridesToRatesByType(overrides?: PricingConfiguration["rules"]["vehicleOverrides"]) {
  if (!overrides) return {};
  return Object.fromEntries(Object.entries(overrides).map(([vehicleType, override]) => [vehicleType, override.rates?.pricePerHour ?? ""]));
}
