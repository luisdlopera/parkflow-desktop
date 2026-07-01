"use client";

import { Clock, Moon, CalendarDays, Layers3, TimerReset } from "lucide-react";
import { STRATEGY_COPY, STRATEGY_LABELS } from "../lib/constants";
import type { PricingStrategyType } from "../lib/types";

const icons = {
  HOURLY: Clock,
  FRACTIONAL: TimerReset,
  DAILY: CalendarDays,
  NIGHT: Moon,
  MIXED: Layers3,
} as const;

export function PricingStrategySelector({
  value,
  onChange,
}: {
  value: PricingStrategyType;
  onChange: (value: PricingStrategyType) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
      {(Object.keys(STRATEGY_LABELS) as PricingStrategyType[]).map((type) => {
        const Icon = icons[type];
        const selected = value === type;
        return (
          <button
            key={type}
            type="button"
            onClick={() => onChange(type)}
            className={`min-h-[176px] rounded-lg border p-5 text-left transition-all ${
              selected
                ? "border-brand-500 bg-brand-50 ring-2 ring-brand-200 dark:bg-brand-500/10 dark:ring-brand-500/25"
                : "border-default-200 bg-content1 hover:border-brand-300 dark:border-zinc-700 dark:bg-zinc-900/40"
            }`}
          >
            <span className={`inline-flex h-9 w-9 items-center justify-center rounded-md ${selected ? "bg-brand-500 text-white" : "bg-default-100 text-default-600"}`}>
              <Icon className="h-4 w-4" />
            </span>
            <span className="mt-4 block text-sm font-semibold leading-5 text-foreground">{STRATEGY_LABELS[type]}</span>
            <span className="mt-1 block text-xs leading-5 text-default-600">{STRATEGY_COPY[type].description}</span>
            <span className="mt-3 block text-[11px] font-medium text-default-500">{STRATEGY_COPY[type].impact}</span>
          </button>
        );
      })}
    </div>
  );
}
