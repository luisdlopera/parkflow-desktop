"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Save } from "lucide-react";
import { Button } from "@/components/bridge/Button";
import { STRATEGY_LABELS } from "../lib/constants";
import { createPricingConfiguration } from "../lib/adapters";
import { validatePricingConfiguration } from "../lib/validation";
import type { PricingBuilderErrors, PricingBuilderMode, PricingConfiguration, PricingStrategyType } from "../lib/types";
import { PricingRatesForm } from "./PricingRatesForm";
import { PricingRulesPanel } from "./PricingRulesPanel";
import { PricingSimulator } from "./PricingSimulator";
import { PricingStrategySelector } from "./PricingStrategySelector";
import { PricingSummary } from "./PricingSummary";

const steps = [
  { id: 0, label: "Estrategia" },
  { id: 1, label: "Valores" },
  { id: 2, label: "Reglas" },
  { id: 3, label: "Revisar" },
];

export function PricingBuilder({
  value,
  mode,
  vehicleTypes = [],
  errors: externalErrors = {},
  isSaving = false,
  onChange,
  onCancel,
  onSubmit,
  focusErrorPath,
  onFocusErrorHandled,
}: {
  value: PricingConfiguration;
  mode: PricingBuilderMode;
  vehicleTypes?: string[];
  errors?: PricingBuilderErrors;
  isSaving?: boolean;
  onChange: (value: PricingConfiguration) => void;
  onCancel?: () => void;
  onSubmit?: (value: PricingConfiguration) => void | Promise<void>;
  focusErrorPath?: string | null;
  onFocusErrorHandled?: () => void;
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [localErrors, setLocalErrors] = useState<PricingBuilderErrors>({});
  const errors = { ...externalErrors, ...localErrors };
  const config = useMemo(() => createPricingConfiguration(value), [value]);

  const update = (next: PricingConfiguration) => {
    setLocalErrors({});
    onChange(createPricingConfiguration(next));
  };

  const selectStrategy = (type: PricingStrategyType) => {
    update({
      ...config,
      strategy: { type, label: STRATEGY_LABELS[type] },
    });
  };

  useEffect(() => {
    if (!focusErrorPath) return;
    const targetStep = getStepForErrorPath(focusErrorPath);
    if (targetStep !== null) setCurrentStep(targetStep);

    const timer = window.setTimeout(() => {
      const element = document.getElementById(focusErrorPath);
      element?.scrollIntoView({ behavior: "smooth", block: "center" });
      const focusable = element?.querySelector<HTMLElement>("input, button, textarea, select, [tabindex]");
      focusable?.focus?.();
      onFocusErrorHandled?.();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [focusErrorPath, onFocusErrorHandled]);

  const validateAndContinue = async () => {
    const nextErrors = validatePricingConfiguration(config);
    const scopedErrors = filterErrorsForStep(nextErrors, currentStep);
    if (Object.keys(scopedErrors).length > 0) {
      setLocalErrors(scopedErrors);
      return;
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep((step) => step + 1);
      return;
    }

    if (Object.keys(nextErrors).length > 0) {
      setLocalErrors(nextErrors);
      return;
    }

    await onSubmit?.(config);
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-5">
        <div className="rounded-lg border border-default-200 bg-content1 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-lg font-semibold text-foreground">{mode === "onboarding" ? "Configura tus tarifas" : "Pricing Builder"}</p>
              <p className="text-sm text-default-600">Define cómo se cobra, qué reglas aplican y revisa el impacto antes de guardar.</p>
            </div>
            <span className="rounded-full border border-default-200 px-3 py-1 text-xs font-semibold text-default-600">COP</span>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-4">
            {steps.map((step) => (
              <button
                key={step.id}
                type="button"
                onClick={() => setCurrentStep(step.id)}
                className={`flex min-h-11 items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold ${
                  currentStep === step.id ? "border-brand-500 bg-brand-500 text-white" : "border-default-200 bg-default-50 text-default-600 hover:border-brand-300"
                }`}
              >
                {step.id < currentStep ? <Check className="h-4 w-4" /> : null}
                {step.label}
              </button>
            ))}
          </div>
        </div>

        <section className="rounded-lg border border-default-200 bg-content1 p-5">
          {currentStep === 0 ? <PricingStrategySelector value={config.strategy.type} onChange={selectStrategy} /> : null}
          {currentStep === 1 ? <PricingRatesForm config={config} errors={errors} onChange={update} /> : null}
          {currentStep === 2 ? <PricingRulesPanel config={config} errors={errors} vehicleTypes={vehicleTypes} onChange={update} /> : null}
          {currentStep === 3 ? <PricingSummary config={config} /> : null}
        </section>

        {errors.form ? <p className="text-sm text-danger">{errors.form}</p> : null}

        <div className="flex flex-wrap justify-between gap-3">
          <div className="flex gap-2">
            {onCancel ? (
              <Button variant="outline" color="primary" onPress={onCancel}>
                Cancelar
              </Button>
            ) : null}
            <Button
              variant="outline"
              color="primary"
              startContent={<ArrowLeft className="h-4 w-4" />}
              isDisabled={currentStep === 0}
              onPress={() => setCurrentStep((step) => Math.max(0, step - 1))}
            >
              Atrás
            </Button>
          </div>
          <Button
            color="primary"
            isLoading={isSaving}
            endContent={currentStep === steps.length - 1 ? <Save className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
            onPress={() => void validateAndContinue()}
          >
            {currentStep === steps.length - 1 ? "Guardar tarifa" : "Continuar"}
          </Button>
        </div>
      </div>

      <PricingSimulator config={config} />
    </div>
  );
}

function filterErrorsForStep(errors: PricingBuilderErrors, step: number): PricingBuilderErrors {
  const prefixes =
    step === 1 ? ["rates.", "rates", "name"] :
    step === 2 ? ["rules.", "rules"] :
    step === 3 ? [""] :
    [];
  if (prefixes.includes("")) return errors;
  return Object.fromEntries(
    Object.entries(errors).filter(([key]) => prefixes.some((prefix) => key === prefix || key.startsWith(prefix))),
  );
}

function getStepForErrorPath(path: string): number | null {
  if (path === "strategy.type" || path === "name" || path === "form") return 0;
  if (path.startsWith("rates.")) return 1;
  if (path.startsWith("rules.")) return 2;
  return null;
}
