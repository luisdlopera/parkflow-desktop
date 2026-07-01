import type { ExplainablePricingPreview, PricingConfiguration, PricingPreview } from "./types";
import { formatMoney } from "./engine/format";
import { executePricingRules } from "./engine/execute-rules";
import { resolvePricingConfiguration } from "./engine/resolve-config";

export function calculateExplainablePricingPreview(
  config: PricingConfiguration,
  stayMinutes: number,
  context: { vehicleType?: string; at?: Date } = {},
): ExplainablePricingPreview {
  const resolvedConfig = resolvePricingConfiguration(config, context);
  return executePricingRules(resolvedConfig, { stayMinutes, ...context });
}

export function calculatePricingPreview(
  config: PricingConfiguration,
  stayMinutes: number,
  context: { vehicleType?: string; at?: Date } = {},
): PricingPreview {
  const explainable = calculateExplainablePricingPreview(config, stayMinutes, context);
  return {
    stayMinutes: explainable.stayMinutes,
    billableMinutes: explainable.billableMinutes,
    chargedUnits: explainable.chargedUnits,
    total: explainable.total,
    currency: explainable.currency,
    strategyLabel: explainable.strategyLabel,
    lines: explainable.executionSteps
      .filter((step) => step.id !== "INPUT" && step.id !== "OVERRIDE_RESOLUTION")
      .map((step) => ({ label: step.label, value: step.after })),
    executionSteps: explainable.executionSteps,
    appliedRules: explainable.appliedRules,
    skippedRules: explainable.skippedRules,
    reason: explainable.reason,
  };
}

export function formatPricingMoney(value: number, currency = "COP") {
  return formatMoney(value, currency);
}
