import { PRICING_RULE_EXECUTION_ORDER } from "../constants";
import type { ExportedPricingConfiguration, PricingConfiguration } from "../types";

function removeEmptyOverrides(config: PricingConfiguration) {
  return Object.fromEntries(
    Object.entries(config.rules.vehicleOverrides ?? {}).filter(([, override]) => {
      return Boolean(
        override.strategy ||
        Object.keys(override.rates ?? {}).length > 0 ||
        Object.keys(override.rules ?? {}).length > 0,
      );
    }).map(([vehicleType, override]) => [vehicleType, { inheritsBase: override.inheritsBase !== false, ...override }]),
  );
}

export function exportPricingConfiguration(config: PricingConfiguration): ExportedPricingConfiguration {
  const { vehicleOverrides: _vehicleOverrides, ...rules } = config.rules;
  return {
    version: "pricing_engine_v1",
    currency: config.currency,
    active: config.active,
    strategy: config.strategy,
    rates: config.rates,
    rules: {
      ...rules,
      executionOrder: PRICING_RULE_EXECUTION_ORDER,
    },
    overrides: removeEmptyOverrides(config),
  };
}

export function stringifyPricingConfiguration(config: PricingConfiguration) {
  return JSON.stringify(exportPricingConfiguration(config), null, 2);
}
