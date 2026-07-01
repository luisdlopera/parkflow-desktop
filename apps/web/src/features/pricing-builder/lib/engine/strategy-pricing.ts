import type { PricingRates, PricingStrategy, PricingStrategyPriceResult } from "../types";
import { formatMoney } from "./format";

export function calculateStrategyPrice(
  strategy: PricingStrategy,
  rates: PricingRates,
  billableMinutes: number,
  currency = "COP",
): PricingStrategyPriceResult {
  if (billableMinutes <= 0) {
    return { subtotal: 0, chargedUnits: 0, unitLabel: "sin cobro", reason: "La estancia queda en cero minutos cobrables." };
  }

  if (strategy.type === "HOURLY") {
    const chargedUnits = Math.max(1, Math.ceil(billableMinutes / 60));
    const unitPrice = rates.pricePerHour || 0;
    return {
      subtotal: chargedUnits * unitPrice,
      chargedUnits,
      unitLabel: "hora(s)",
      reason: `${chargedUnits} hora(s) x ${formatMoney(unitPrice, currency)}.`,
    };
  }

  if (strategy.type === "FRACTIONAL") {
    const fractionMinutes = Math.max(1, rates.fractionMinutes || 1);
    const chargedUnits = Math.max(1, Math.ceil(billableMinutes / fractionMinutes));
    const unitPrice = rates.fractionPrice || 0;
    return {
      subtotal: chargedUnits * unitPrice,
      chargedUnits,
      unitLabel: `fracción(es) de ${fractionMinutes} min`,
      reason: `${chargedUnits} fracción(es) x ${formatMoney(unitPrice, currency)}.`,
    };
  }

  if (strategy.type === "DAILY") {
    const chargedUnits = Math.max(1, Math.ceil(billableMinutes / 1440));
    const unitPrice = rates.dailyPrice || 0;
    return {
      subtotal: chargedUnits * unitPrice,
      chargedUnits,
      unitLabel: "día(s)",
      reason: `${chargedUnits} día(s) x ${formatMoney(unitPrice, currency)}.`,
    };
  }

  if (strategy.type === "NIGHT") {
    const chargedUnits = Math.max(1, Math.ceil(billableMinutes / 60));
    const unitPrice = rates.nightPrice || 0;
    return {
      subtotal: chargedUnits * unitPrice,
      chargedUnits,
      unitLabel: "bloque(s) nocturno(s)",
      reason: `${chargedUnits} bloque(s) nocturno(s) x ${formatMoney(unitPrice, currency)}.`,
    };
  }

  const fullDays = Math.floor(billableMinutes / 1440);
  const remainingMinutes = billableMinutes % 1440;
  const hourlyUnits = remainingMinutes > 0 ? Math.max(1, Math.ceil(remainingMinutes / 60)) : 0;
  const dailyTotal = fullDays * (rates.dailyPrice || 0);
  const hourlyTotal = hourlyUnits * (rates.pricePerHour || 0);
  return {
    subtotal: dailyTotal + hourlyTotal,
    chargedUnits: fullDays + hourlyUnits,
    unitLabel: "día(s) + hora(s)",
    reason: `${fullDays} día(s) + ${hourlyUnits} hora(s).`,
  };
}
