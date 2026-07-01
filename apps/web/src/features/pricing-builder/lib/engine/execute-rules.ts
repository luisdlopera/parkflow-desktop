import { PRICING_RULE_EXECUTION_ORDER } from "../constants";
import { ROUNDING_LABELS, labelVehicle } from "../display";
import type {
  ExplainablePricingPreview,
  PricingCalculationInput,
  PricingExecutionStep,
  PricingRuleId,
  ResolvedPricingConfiguration,
} from "../types";
import { formatMinutes, formatMoney } from "./format";
import { calculateStrategyPrice } from "./strategy-pricing";

function applyRounding(minutes: number, mode: string, increment = 1) {
  if (mode === "NONE") return minutes;
  const units = minutes / Math.max(1, increment);
  if (mode === "DOWN") return Math.floor(units) * increment;
  if (mode === "NEAREST") return Math.round(units) * increment;
  return Math.ceil(units) * increment;
}

export function executePricingRules(
  resolvedConfig: ResolvedPricingConfiguration,
  input: PricingCalculationInput,
): ExplainablePricingPreview {
  const realMinutes = Math.max(0, Math.round(input.stayMinutes));
  let billableMinutes = realMinutes;
  let subtotal = 0;
  let total = 0;
  let chargedUnits = 0;
  const executionSteps: PricingExecutionStep[] = [
    {
      id: "INPUT",
      label: "Entrada",
      before: "Sin estancia",
      after: `Estancia: ${formatMinutes(realMinutes)}`,
      applied: true,
      reason: "Se normaliza la estancia real a minutos enteros.",
    },
    {
      id: "OVERRIDE_RESOLUTION",
      label: "Ajuste por vehículo",
      before: "Configuración base",
      after: resolvedConfig.overrideApplied ? `Ajuste ${labelVehicle(resolvedConfig.sourceVehicleType ?? "")}` : "Configuración base",
      applied: resolvedConfig.overrideApplied,
      reason: resolvedConfig.overrideApplied
        ? `Se heredó la configuración base y se aplicaron ${resolvedConfig.overrideDiff.length} cambio(s).`
        : "No hay ajuste propio para el tipo de vehículo seleccionado.",
    },
  ];
  const appliedRules: PricingRuleId[] = [];
  const skippedRules: PricingRuleId[] = [];

  PRICING_RULE_EXECUTION_ORDER.forEach((ruleId) => {
    if (ruleId === "GRACE_PERIOD") {
      const before = billableMinutes;
      const grace = Math.max(0, resolvedConfig.rules.graceMinutes || 0);
      billableMinutes = Math.max(0, billableMinutes - grace);
      const applied = grace > 0 && before !== billableMinutes;
      (applied ? appliedRules : skippedRules).push(ruleId);
      executionSteps.push({
        id: ruleId,
        label: "Cortesía",
        before: formatMinutes(before),
        after: formatMinutes(billableMinutes),
        applied,
        reason: applied ? `Se descuentan ${formatMinutes(grace)} de cortesía.` : "No hay minutos de cortesía configurados o la estancia ya era cero.",
      });
      return;
    }

    if (ruleId === "MINIMUM_CHARGE") {
      const before = billableMinutes;
      const minimum = Math.max(0, resolvedConfig.rules.minimumChargeMinutes || 0);
      billableMinutes = minimum > 0 ? Math.max(billableMinutes, minimum) : billableMinutes;
      const applied = minimum > 0 && before !== billableMinutes;
      (applied ? appliedRules : skippedRules).push(ruleId);
      executionSteps.push({
        id: ruleId,
        label: "Mínimo",
        before: formatMinutes(before),
        after: formatMinutes(billableMinutes),
        applied,
        reason: applied ? `Se eleva al mínimo de ${formatMinutes(minimum)}.` : "El mínimo no cambia los minutos cobrables.",
      });
      return;
    }

    if (ruleId === "ROUNDING") {
      const before = billableMinutes;
      const rounded = applyRounding(
        billableMinutes,
        resolvedConfig.rules.rounding.mode,
        resolvedConfig.rules.rounding.incrementMinutes,
      );
      billableMinutes = rounded;
      const applied = before !== rounded;
      (applied ? appliedRules : skippedRules).push(ruleId);
      executionSteps.push({
        id: ruleId,
        label: "Redondeo",
        before: formatMinutes(before),
        after: formatMinutes(billableMinutes),
        applied,
        reason: resolvedConfig.rules.rounding.mode === "NONE"
          ? "El redondeo está desactivado."
          : `${ROUNDING_LABELS[resolvedConfig.rules.rounding.mode]} cada ${resolvedConfig.rules.rounding.incrementMinutes || 1} min.`,
      });
      return;
    }

    if (ruleId === "STRATEGY_PRICE") {
      const price = calculateStrategyPrice(resolvedConfig.strategy, resolvedConfig.rates, billableMinutes, resolvedConfig.currency);
      subtotal = price.subtotal;
      total = subtotal;
      chargedUnits = price.chargedUnits;
      appliedRules.push(ruleId);
      executionSteps.push({
        id: ruleId,
        label: "Precio",
        before: formatMinutes(billableMinutes),
        after: formatMoney(subtotal, resolvedConfig.currency),
        applied: true,
        reason: price.reason,
      });
      return;
    }

    if (ruleId === "DAILY_CAP") {
      const before = total;
      const cap = resolvedConfig.rules.dailyCaps?.enabled ? resolvedConfig.rules.dailyCaps.maxDailyPrice : undefined;
      if (cap && total > cap) total = cap;
      const applied = Boolean(cap && before !== total);
      (applied ? appliedRules : skippedRules).push(ruleId);
      executionSteps.push({
        id: ruleId,
        label: "Tope diario",
        before: formatMoney(before, resolvedConfig.currency),
        after: formatMoney(total, resolvedConfig.currency),
        applied,
        reason: applied ? `El total se limita al tope diario de ${formatMoney(cap || 0, resolvedConfig.currency)}.` : "No aplica tope diario al resultado.",
      });
    }
  });

  executionSteps.push({
    id: "RESULT",
    label: "Resultado",
    before: formatMoney(subtotal, resolvedConfig.currency),
    after: formatMoney(total, resolvedConfig.currency),
    applied: true,
    reason: appliedRules.includes("DAILY_CAP")
      ? "Total final con tope diario aplicado."
      : "Total final sin tope diario aplicado.",
  });

  return {
    input,
    resolvedConfig,
    executionSteps,
    appliedRules,
    skippedRules,
    stayMinutes: realMinutes,
    billableMinutes,
    chargedUnits,
    subtotal,
    total,
    currency: resolvedConfig.currency,
    strategyLabel: resolvedConfig.strategy.label,
    reason: executionSteps[executionSteps.length - 1].reason,
  };
}
