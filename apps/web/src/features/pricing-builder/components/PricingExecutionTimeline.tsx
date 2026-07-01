"use client";

import { Check, CircleMinus } from "lucide-react";
import type { PricingExecutionStep } from "../lib/types";

export function PricingExecutionTimeline({ steps }: { steps: PricingExecutionStep[] }) {
  return (
    <div className="space-y-2">
      {steps.map((step) => (
        <div key={`${step.id}-${step.label}`} className="grid grid-cols-[28px_1fr] gap-3 rounded-md border border-default-200 bg-content1 p-3">
          <span className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-full ${step.applied ? "bg-emerald-100 text-emerald-700" : "bg-default-100 text-default-500"}`}>
            {step.applied ? <Check className="h-3.5 w-3.5" /> : <CircleMinus className="h-3.5 w-3.5" />}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-foreground">{step.label}</p>
              <p className="text-xs font-medium text-default-500">{step.before} {"->"} {step.after}</p>
            </div>
            <p className="mt-1 text-xs leading-5 text-default-600">{step.reason}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
