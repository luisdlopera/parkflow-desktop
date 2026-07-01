import { createPricingConfiguration } from "../adapters";
import type {
  PricingCalculationInput,
  PricingConfiguration,
  PricingOverrideDiff,
  PricingRates,
  PricingRules,
  ResolvedPricingConfiguration,
} from "../types";

const labels: Record<string, string> = {
  "rates.pricePerHour": "valor por hora",
  "rates.dailyPrice": "tarifa diaria",
  "rates.nightPrice": "tarifa nocturna",
  "rates.fractionMinutes": "minutos por fracción",
  "rates.fractionPrice": "valor por fracción",
  "rules.graceMinutes": "minutos de cortesía",
  "rules.minimumChargeMinutes": "mínimo de cobro",
  "rules.rounding.mode": "tipo de redondeo",
  "rules.rounding.incrementMinutes": "minutos de redondeo",
  "strategy.type": "estrategia",
};

function display(value: unknown) {
  if (value === undefined || value === null || value === "") return "Sin configurar";
  return String(value);
}

function buildDiff(
  base: PricingConfiguration,
  rates?: Partial<PricingRates>,
  rules?: Partial<PricingRules>,
  strategy?: PricingConfiguration["strategy"],
): PricingOverrideDiff[] {
  const diff: PricingOverrideDiff[] = [];
  Object.entries(rates ?? {}).forEach(([key, overrideValue]) => {
    const baseValue = base.rates[key as keyof PricingRates];
    if (overrideValue !== undefined && overrideValue !== baseValue) {
      const path = `rates.${key}`;
      diff.push({ path, label: labels[path] ?? path, baseValue: display(baseValue), overrideValue: display(overrideValue) });
    }
  });

  const ruleEntries: Array<[string, unknown, unknown]> = [
    ["rules.graceMinutes", base.rules.graceMinutes, rules?.graceMinutes],
    ["rules.minimumChargeMinutes", base.rules.minimumChargeMinutes, rules?.minimumChargeMinutes],
    ["rules.rounding.mode", base.rules.rounding.mode, rules?.rounding?.mode],
    ["rules.rounding.incrementMinutes", base.rules.rounding.incrementMinutes, rules?.rounding?.incrementMinutes],
  ];
  ruleEntries.forEach(([path, baseValue, overrideValue]) => {
    if (overrideValue !== undefined && overrideValue !== baseValue) {
      diff.push({ path, label: labels[path] ?? path, baseValue: display(baseValue), overrideValue: display(overrideValue) });
    }
  });

  if (strategy && strategy.type !== base.strategy.type) {
    diff.push({ path: "strategy.type", label: labels["strategy.type"], baseValue: base.strategy.label, overrideValue: strategy.label });
  }
  return diff;
}

function mergeRules(base: PricingRules, override?: Partial<PricingRules>): PricingRules {
  return {
    ...base,
    ...(override ?? {}),
    rounding: { ...base.rounding, ...(override?.rounding ?? {}) },
    specialHours: { enabled: false, startTime: "20:00", endTime: "06:00", ...base.specialHours, ...(override?.specialHours ?? {}) },
    weekends: { enabled: false, ...base.weekends, ...(override?.weekends ?? {}) },
    dailyCaps: { enabled: false, ...base.dailyCaps, ...(override?.dailyCaps ?? {}) },
    vehicleOverrides: base.vehicleOverrides,
  };
}

export function resolvePricingConfiguration(
  base: PricingConfiguration,
  context: Pick<PricingCalculationInput, "vehicleType"> = {},
): ResolvedPricingConfiguration {
  const normalized = createPricingConfiguration(base);
  const override = context.vehicleType ? normalized.rules.vehicleOverrides?.[context.vehicleType] : undefined;
  if (!override) {
    return {
      ...normalized,
      sourceVehicleType: context.vehicleType,
      overrideApplied: false,
      overrideDiff: [],
    };
  }

  const inheritsBase = override.inheritsBase !== false;
  const seed = inheritsBase
    ? {
        ...normalized,
        strategy: override.strategy ?? normalized.strategy,
        rates: { ...normalized.rates, ...(override.rates ?? {}) },
        rules: mergeRules(normalized.rules, override.rules),
      }
    : createPricingConfiguration({
        ...normalized,
        strategy: override.strategy ?? normalized.strategy,
        rates: override.rates ?? {},
        rules: override.rules ?? normalized.rules,
      });

  return {
    ...createPricingConfiguration(seed),
    sourceVehicleType: context.vehicleType,
    overrideApplied: true,
    overrideDiff: buildDiff(normalized, override.rates, override.rules, override.strategy),
  };
}
