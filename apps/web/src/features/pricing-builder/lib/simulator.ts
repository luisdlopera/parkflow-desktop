import type { PricingConfiguration, PricingPreview, PricingRates } from "./types";

const money = (value: number, currency: string) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);

function applyRounding(minutes: number, mode: string, increment = 1) {
  if (mode === "NONE") return minutes;
  const units = minutes / Math.max(1, increment);
  if (mode === "DOWN") return Math.floor(units) * increment;
  if (mode === "NEAREST") return Math.round(units) * increment;
  return Math.ceil(units) * increment;
}

function mergeRates(base: PricingRates, override?: Partial<PricingRates>): PricingRates {
  return { ...base, ...(override ?? {}) };
}

export function calculatePricingPreview(
  config: PricingConfiguration,
  stayMinutes: number,
  context: { vehicleType?: string; at?: Date } = {},
): PricingPreview {
  const vehicleOverride = context.vehicleType ? config.rules.vehicleOverrides?.[context.vehicleType] : undefined;
  const strategy = vehicleOverride?.strategy ?? config.strategy;
  const rules = { ...config.rules, ...(vehicleOverride?.rules ?? {}) };
  const rates = mergeRates(config.rates, vehicleOverride?.rates);

  const realMinutes = Math.max(0, Math.round(stayMinutes));
  const afterGrace = Math.max(0, realMinutes - Math.max(0, rules.graceMinutes || 0));
  const minimum = Math.max(0, rules.minimumChargeMinutes || 0);
  const rounded = applyRounding(afterGrace, rules.rounding.mode, rules.rounding.incrementMinutes);
  const billableMinutes = Math.max(minimum, rounded);

  let total = 0;
  let chargedUnits = 0;
  const lines = [
    { label: "Tiempo real", value: `${realMinutes} min` },
    { label: "Cortesía aplicada", value: `${Math.min(realMinutes, rules.graceMinutes || 0)} min` },
    { label: "Tiempo cobrable", value: `${billableMinutes} min` },
  ];

  if (strategy.type === "HOURLY") {
    const increment = rules.rounding.incrementMinutes || 60;
    chargedUnits = Math.max(1, Math.ceil(billableMinutes / increment));
    total = chargedUnits * (rates.pricePerHour || 0);
    lines.push({ label: "Tarifa usada", value: `${money(rates.pricePerHour || 0, config.currency)} por hora` });
  } else if (strategy.type === "FRACTIONAL") {
    const fractionMinutes = Math.max(1, rates.fractionMinutes || 1);
    chargedUnits = Math.max(1, Math.ceil(billableMinutes / fractionMinutes));
    total = chargedUnits * (rates.fractionPrice || 0);
    lines.push({ label: "Tarifa usada", value: `${money(rates.fractionPrice || 0, config.currency)} cada ${fractionMinutes} min` });
  } else if (strategy.type === "DAILY") {
    chargedUnits = Math.max(1, Math.ceil(billableMinutes / 1440));
    total = chargedUnits * (rates.dailyPrice || 0);
    lines.push({ label: "Tarifa usada", value: `${money(rates.dailyPrice || 0, config.currency)} por día` });
  } else if (strategy.type === "NIGHT") {
    chargedUnits = Math.max(1, Math.ceil(billableMinutes / 60));
    total = chargedUnits * (rates.nightPrice || 0);
    lines.push({ label: "Tarifa usada", value: `${money(rates.nightPrice || 0, config.currency)} nocturna` });
  } else {
    const fullDays = Math.floor(billableMinutes / 1440);
    const remainingMinutes = billableMinutes % 1440;
    const hourlyUnits = remainingMinutes > 0 ? Math.max(1, Math.ceil(remainingMinutes / (rules.rounding.incrementMinutes || 60))) : 0;
    total = fullDays * (rates.dailyPrice || 0) + hourlyUnits * (rates.pricePerHour || 0);
    if (fullDays === 0 && hourlyUnits === 0) total = rates.pricePerHour || rates.dailyPrice || 0;
    chargedUnits = fullDays + hourlyUnits;
    lines.push({ label: "Tarifa usada", value: `${fullDays} día(s) + ${hourlyUnits} bloque(s)` });
  }

  if (rules.dailyCaps?.enabled && rules.dailyCaps.maxDailyPrice && realMinutes <= 1440 && total > rules.dailyCaps.maxDailyPrice) {
    total = rules.dailyCaps.maxDailyPrice;
    lines.push({ label: "Tope diario aplicado", value: money(total, config.currency) });
  }

  lines.push({ label: "Redondeo", value: rules.rounding.mode === "NONE" ? "Sin redondeo" : `${rules.rounding.mode} cada ${rules.rounding.incrementMinutes || 1} min` });

  return {
    stayMinutes: realMinutes,
    billableMinutes,
    chargedUnits,
    total,
    currency: config.currency,
    strategyLabel: strategy.label,
    lines,
  };
}

export function formatPricingMoney(value: number, currency = "COP") {
  return money(value, currency);
}
