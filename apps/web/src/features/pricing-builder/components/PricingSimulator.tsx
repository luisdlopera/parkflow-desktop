"use client";

import { useMemo, useState } from "react";
import { Calculator } from "lucide-react";
import { Input } from "@/components/bridge/Input";
import { calculatePricingPreview, formatPricingMoney } from "../lib/simulator";
import type { PricingConfiguration } from "../lib/types";

const scenarios = [
  { label: "1 hora", minutes: 60 },
  { label: "3 horas", minutes: 180 },
  { label: "1 día", minutes: 1440 },
];

export function PricingSimulator({ config }: { config: PricingConfiguration }) {
  const [hours, setHours] = useState(1);
  const [minutes, setMinutes] = useState(0);
  const customMinutes = Math.max(0, hours * 60 + minutes);
  const preview = useMemo(() => calculatePricingPreview(config, customMinutes), [config, customMinutes]);

  return (
    <aside className="sticky top-4 space-y-4 rounded-lg border border-default-200 bg-content1 p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-brand-500 text-white">
          <Calculator className="h-4 w-4" />
        </span>
        <div>
          <p className="text-sm font-semibold text-foreground">Simulador</p>
          <p className="text-xs text-default-500">Vista en tiempo real</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input type="number" min={0} label="Horas" value={String(hours)} onChange={(event) => setHours(Number(event.target.value || 0))} />
        <Input type="number" min={0} max={59} label="Minutos" value={String(minutes)} onChange={(event) => setMinutes(Number(event.target.value || 0))} />
      </div>

      <div className="rounded-lg bg-default-50 p-4 dark:bg-zinc-900/60">
        <p className="text-xs font-medium text-default-500">{preview.strategyLabel}</p>
        <p className="mt-1 text-3xl font-semibold text-foreground">{formatPricingMoney(preview.total, preview.currency)}</p>
        <p className="mt-1 text-xs text-default-500">{preview.billableMinutes} minutos cobrables</p>
      </div>

      <div className="space-y-2">
        {preview.lines.map((line) => (
          <div key={line.label} className="flex items-center justify-between gap-3 text-xs">
            <span className="text-default-500">{line.label}</span>
            <span className="font-medium text-foreground">{line.value}</span>
          </div>
        ))}
      </div>

      <div className="grid gap-2">
        {scenarios.map((scenario) => {
          const result = calculatePricingPreview(config, scenario.minutes);
          return (
            <button
              key={scenario.label}
              type="button"
              onClick={() => {
                setHours(Math.floor(scenario.minutes / 60));
                setMinutes(scenario.minutes % 60);
              }}
              className="flex items-center justify-between rounded-md border border-default-200 px-3 py-2 text-left text-xs hover:border-brand-300"
            >
              <span className="font-medium text-foreground">{scenario.label}</span>
              <span className="text-default-600">{formatPricingMoney(result.total, result.currency)}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
