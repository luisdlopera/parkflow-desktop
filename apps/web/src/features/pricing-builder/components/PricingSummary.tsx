"use client";

import { formatPricingMoney } from "../lib/simulator";
import type { PricingConfiguration } from "../lib/types";

export function PricingSummary({ config }: { config: PricingConfiguration }) {
  const rows = [
    ["Estrategia", config.strategy.label],
    ["Tarifa por hora", config.rates.pricePerHour ? formatPricingMoney(config.rates.pricePerHour, config.currency) : "No aplica"],
    ["Fracción", config.rates.fractionPrice ? `${formatPricingMoney(config.rates.fractionPrice, config.currency)} cada ${config.rates.fractionMinutes} min` : "No aplica"],
    ["Tarifa diaria", config.rates.dailyPrice ? formatPricingMoney(config.rates.dailyPrice, config.currency) : "No aplica"],
    ["Tarifa nocturna", config.rates.nightPrice ? formatPricingMoney(config.rates.nightPrice, config.currency) : "No aplica"],
    ["Cortesía", `${config.rules.graceMinutes} min`],
    ["Mínimo de cobro", `${config.rules.minimumChargeMinutes} min`],
    ["Redondeo", config.rules.rounding.mode === "NONE" ? "Sin redondeo" : `${config.rules.rounding.mode} cada ${config.rules.rounding.incrementMinutes} min`],
  ];

  return (
    <div className="rounded-lg border border-default-200 bg-content1 p-4">
      <p className="text-sm font-semibold text-foreground">Resumen de tarifa</p>
      <div className="mt-4 divide-y divide-default-100">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-4 py-2 text-sm">
            <span className="text-default-500">{label}</span>
            <span className="text-right font-medium text-foreground">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
